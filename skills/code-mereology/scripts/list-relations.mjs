#!/usr/bin/env node
// 驗證設計文件的關係與 tag，依查詢參數輸出以 tab 分隔的資料。

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { findFiles, isSkippedDirectory, toPosix } from './find-files.mjs';
import { readLines } from './read-lines.mjs';
import { DESIGN_NAME, isDesignFile, readRelationDocument } from './relation-documents.mjs';
import { buildRelationGraph, queryRows, TAG_NAME } from './relation-graph.mjs';

// 設定永遠以查詢的 repository root 為準。
const CONFIG_FILE = 'docs/code-mereology.json';
const OPTIONS = new Set(['-a', '-f', '-d', '-t']);

/** 驗證選項語法與選定的搜尋目錄，稍後再驗證 -a 與 -t 的值。 */
function parseOptions(args) {
  const values = new Map();
  let inputRoot;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith('-')) {
      if (inputRoot !== undefined) throw new Error('specify only one repository root');
      inputRoot = arg;
      continue;
    }
    if (!OPTIONS.has(arg)) throw new Error('unknown option ' + arg);
    if (values.has(arg)) throw new Error('duplicate option ' + arg);
    const value = args[++i];
    if (value === undefined || value.startsWith('-')) throw new Error('missing value for ' + arg);
    values.set(arg, value);
  }
  const about = values.get('-a');
  const tag = values.get('-t');
  if (values.has('-a') && values.has('-t')) throw new Error('-a and -t cannot be combined');
  if (!values.has('-a') && (values.has('-f') || values.has('-d'))) throw new Error('-f and -d require -a');
  const follow = values.get('-f') ?? 'pcdu';
  if (!/^[pcdu]+$/.test(follow) || new Set(follow).size !== follow.length) throw new Error('invalid value for -f');
  const depth = values.get('-d') ?? '1';
  if (depth !== 'a' && (!/^\d+$/.test(depth) || Number(depth) < 1)) throw new Error('invalid value for -d');
  const root = path.resolve(inputRoot ?? '.');
  if (!fs.statSync(root, { throwIfNoEntry: false })?.isDirectory()) throw new Error('repository root is not a directory');
  return { root, about, tag, follow, depth: depth === 'a' ? Infinity : Number(depth) };
}

/** 判斷路徑是否從指定 root 向上離開，或指向另一個磁碟。 */
function isOutside(relative) {
  return relative === '..' || relative.startsWith('../') || path.isAbsolute(relative);
}

/**
 * 逐層比對實際目錄項目，判斷路徑種類與是否位於掃描範圍。
 *
 * @param {string} root 搜尋目錄。
 * @param {string} relative 正規化後相對於 root 的正斜線路徑。
 * @param {Set<string>} excluded 已驗證的排除目錄。
 */
function pathState(root, relative, excluded = new Set()) {
  const segments = relative.split('/');
  if (segments.slice(0, -1).some(isSkippedDirectory)) return 'excluded';
  if ([...excluded].some(folder => relative === folder || relative.startsWith(folder + '/'))) return 'excluded';
  let parent = root;
  for (let i = 0; i < segments.length; i++) {
    const name = segments[i];
    const last = i === segments.length - 1;
    const entries = fs.readdirSync(parent, { withFileTypes: true });
    const entry = entries.find(item => item.name === name);
    if (!entry) return entries.some(item => item.name.toLowerCase() === name.toLowerCase()) ? 'case' : 'missing';
    if (entry.isSymbolicLink()) return 'excluded';
    if (last) {
      if (entry.isFile()) return 'file';
      return entry.isDirectory() ? 'directory' : 'invalid';
    }
    if (!entry.isDirectory()) return 'invalid';
    parent = path.join(parent, name);
  }
  return 'invalid';
}

/** 讀取可缺省的設定，驗證允許的鍵、tag 表及排除目錄。 */
function readConfiguration(root) {
  let config;
  try {
    config = JSON.parse(readLines(path.join(root, CONFIG_FILE)).join('\n'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    config = {};
  }
  if (!config || typeof config !== 'object' || Array.isArray(config)
      || Object.keys(config).some(key => key !== 'tags' && key !== 'exclude')) {
    throw new Error('configuration must be an object with only tags and exclude keys');
  }
  const tags = 'tags' in config ? config.tags : {};
  if (!tags || typeof tags !== 'object' || Array.isArray(tags)
      || Object.entries(tags).some(([name, value]) => !TAG_NAME.test(name) || typeof value !== 'string')) {
    throw new Error('tags must map valid tag names to descriptions');
  }
  const exclude = 'exclude' in config ? config.exclude : [];
  if (!Array.isArray(exclude)) throw new Error('exclude must be an array of directory paths');
  const excluded = new Set();
  for (const folder of exclude) {
    if (typeof folder !== 'string' || !folder || /[:\\]/.test(folder) || path.posix.isAbsolute(folder)
        || folder.split('/').includes('..')) throw new Error('invalid exclude path: ' + String(folder));
    const relative = path.posix.normalize(folder).replace(/\/$/, '');
    if (relative === '.' || pathState(root, relative) !== 'directory') throw new Error('invalid exclude directory: ' + folder);
    excluded.add(relative);
  }
  return { knownTags: new Set(Object.keys(tags)), excluded };
}

/** 驗證查詢指定的 tag 或起點。起點以呼叫者的目前目錄解析。 */
function validateQuery(query, { excluded, knownTags }) {
  if (query.tag !== undefined && (!TAG_NAME.test(query.tag) || !knownTags.has(query.tag))) throw new Error('unknown tag: ' + query.tag);
  if (query.about === undefined) return;
  const relative = toPosix(path.relative(query.root, path.resolve(query.about)));
  if (!relative || isOutside(relative) || !isDesignFile(path.posix.basename(relative)) || pathState(query.root, relative, excluded) !== 'file') {
    throw new Error('invalid design document for -a: ' + query.about);
  }
  query.about = relative;
}

/** 驗證區塊中的相對路徑及 planned 狀態，回傳相對於 root 的名稱。 */
function resolveTarget(source, edge, { root, excluded }) {
  const raw = edge.target;
  if (/[:?#\\]/.test(raw) || raw.startsWith('/') || raw.endsWith('/')) throw new Error('invalid relation path: ' + raw);
  const target = path.posix.normalize(path.posix.join(path.posix.dirname(source), raw));
  if (isOutside(target)) throw new Error('target is outside the repository: ' + raw);
  const state = pathState(root, target, excluded);
  if (state === 'excluded') throw new Error('target is excluded from the scan: ' + raw);
  if (state === 'case') throw new Error('relation target path case does not match: ' + raw);
  if (!isDesignFile(path.posix.basename(target)) || (state !== 'file' && state !== 'missing')) {
    throw new Error('target is not a design document: ' + raw);
  }
  if (edge.planned && state === 'file') throw new Error('planned target already exists: ' + raw);
  if (!edge.planned && state === 'missing') throw new Error('target does not exist: ' + raw);
  return target;
}

/** 從搜尋結果讀取原始設計文件，掃描或讀取失敗時記錄診斷。 */
function scanDocuments(root, excluded, report) {
  const documents = new Map();
  let files;
  try {
    files = findFiles(root, DESIGN_NAME, excluded);
  } catch (error) {
    report('.', error.message);
    return documents;
  }
  for (const file of files) {
    const relative = toPosix(path.relative(root, file));
    try {
      if (!fs.lstatSync(file).isFile()) continue;
    } catch (error) {
      report(relative, error.message);
      continue;
    }
    const document = readRelationDocument(root, relative, report);
    if (document) documents.set(relative, document);
  }
  return documents;
}

/**
 * 驗證整個掃描範圍。設定錯誤回傳 1，參數錯誤回傳 2，文件錯誤仍可輸出可確定的資料。
 *
 * @param {string[]} args 命令列引數，不含 node 與腳本路徑。
 * @returns {number} 程序結束代碼。
 */
export function main(args) {
  let query;
  try {
    query = parseOptions(args);
  } catch (error) {
    console.error('ERROR ' + error.message);
    return 2;
  }
  let errors = 0;
  /** 寫出統一格式的診斷並計入 exit code。 */
  function report(file, message, line) {
    console.error('ERROR ' + file + (line ? ':' + line : '') + ': ' + message);
    errors++;
  }
  let config;
  try {
    config = readConfiguration(query.root);
  } catch (error) {
    report(CONFIG_FILE, error.message);
    return 1;
  }
  try {
    validateQuery(query, config);
  } catch (error) {
    console.error('ERROR ' + error.message);
    return 2;
  }
  const documents = scanDocuments(query.root, config.excluded, report);
  const resolver = (file, edge) => resolveTarget(file, edge, { root: query.root, excluded: config.excluded });
  const graph = buildRelationGraph(documents, { ...config, resolveTarget: resolver }, report);
  for (const row of queryRows(graph, query)) console.log(row.join('\t'));
  return Number(errors > 0);
}

const invokedPath = process.argv[1];
if (invokedPath !== undefined && fs.realpathSync(invokedPath) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  process.exitCode = main(process.argv.slice(2));
}
