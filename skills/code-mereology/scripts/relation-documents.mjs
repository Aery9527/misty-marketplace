// 讀取設計文件的必要標頭與可由腳本辨識的正文語法。

import path from 'node:path';

import { readLines } from './read-lines.mjs';

// 只有組裝文件和模組文件是關係圖節點。
export const DESIGN_NAME = /^(?:bd|sd)-(?!.*(?:-plan|-perf)\.md$).+\.md$/;

// 三個鍵必須各出現一次，並依其宣告順序排列。
const HEADER_KEY = /^- `(parts|depends|tags)`:(.*)$/;
const HEADER_ORDER = ['parts', 'depends', 'tags'];

// 關係使用單行 inline link。planned 標記沿用 list-planned 對空白的判定。
const RELATION_ITEM = /^ {2,}- \[([^\][\r\n]+)\]\(([^()\p{White_Space}\u001c-\u001f]+)\)([\p{White_Space}\u001c-\u001f]*\(planned\))?:(?: (.*))?$/u;

// 判定說明中是否另含連結，並辨識正文中指向設計文件的連結。
const INLINE_LINK = /(?<!!)\[[^\]\n]*\]\([ \t]*(?:<([^>\n]+)>|([^\s()<>\n]+))(?:[ \t]+(?:"[^"\n]*"|'[^'\n]*'|\([^)\n]*\)))?[ \t]*\)/g;

/** 判斷一個實際檔名是否屬於文件關係圖。 */
export function isDesignFile(name) {
  return DESIGN_NAME.test(name);
}

/** 找出 H1 後的第一行，略過空行與開頭的選用 frontmatter。 */
function headerStart(lines) {
  let index = lines.findIndex(line => line.trim() !== '');
  if (lines[index] === '---') {
    const end = lines.findIndex((line, number) => number > index && /^(?:---|\.\.\.)[ \t]*$/.test(line));
    if (end < 0) return -1;
    index = lines.findIndex((line, number) => number > end && line.trim() !== '');
  }
  return /^# +\S/.test(lines[index] ?? '') ? index + 1 : -1;
}

/** 解析標頭的 tag 清單，保留每個 tag 的宣告行號。 */
function readTags(value, line, report) {
  if (!/^ *(?:`[^`]+`(?:, *`[^`]+`)*)? *$/.test(value)) {
    report('invalid tags list', line);
    return [];
  }
  return [...value.matchAll(/`([^`]+)`/g)].map(match => ({ name: match[1], line }));
}

/** 解析一筆組成或依賴，並在格式、說明或 label 有誤時拒絕該項。 */
function readRelation(text, { kind, line, labels }, report) {
  const matched = RELATION_ITEM.exec(text);
  if (!matched) {
    report('invalid relation item', line);
    return null;
  }
  const [, label, target, planned, description] = matched;
  if (!description?.trim() || description.includes('\t')) {
    report('invalid relation description', line);
    return null;
  }
  if ([...description.matchAll(INLINE_LINK)].length > 0) {
    report('invalid relation item: description contains a second link', line);
    return null;
  }
  if (labels.has(label)) {
    report('duplicate label "' + label + '"', line);
    return null;
  }
  labels.add(label);
  return { kind, line, target, planned: Boolean(planned), description };
}

/** 解析三鍵區塊，並保留正文起點、可識別的關係與驗證用資訊。 */
function readHeader(lines, report) {
  const start = headerStart(lines);
  if (start < 0) {
    report('missing relation header: expected an H1 heading');
    return null;
  }
  const partial = lines[start]?.startsWith('> `code-mereology-partial`:') ?? false;
  const result = { partial, labels: new Set(), relations: [], tags: [], partsLine: 0, hasParts: false, bodyStart: lines.length };
  let position = 0;
  let valid = true;
  for (let index = start + Number(partial); index < lines.length; index++) {
    const text = lines[index];
    if (text.startsWith('## ')) {
      result.bodyStart = index;
      break;
    }
    if (!text.trim()) continue;
    const line = index + 1;
    const key = HEADER_KEY.exec(text);
    if (key) {
      const [, kind, value] = key;
      if (kind !== HEADER_ORDER[position] || (kind !== 'tags' && value.trim())) {
        report('invalid relation header: expected parts, depends, tags in order', line);
        return null;
      }
      position++;
      if (kind === 'parts') result.partsLine = line;
      if (kind === 'tags') result.tags = readTags(value, line, report);
      continue;
    }
    if (/^ {2,}- /.test(text) && position > 0 && position < 3) {
      const kind = HEADER_ORDER[position - 1];
      if (kind === 'parts') result.hasParts = true;
      const entry = readRelation(text, { kind, line, labels: result.labels }, report);
      if (entry) result.relations.push(entry);
      continue;
    }
    report('invalid content in relation header', line);
    valid = false;
  }
  if (position !== HEADER_ORDER.length) {
    report('missing relation header keys: expected parts, depends, tags', start + 1);
    valid = false;
  }
  return valid ? result : null;
}

/** 展開行首的 tab 至下一個四欄邊界。 */
function expandIndent(line) {
  return line.replace(/^[ \t]*/, prefix => {
    let columns = 0;
    for (const space of prefix) columns += space === '\t' ? 4 - columns % 4 : 1;
    return ' '.repeat(columns);
  });
}

/** 找出相對於目前容器的 fence 字元、長度與後綴。 */
function fenceOf(content) {
  return /^ {0,3}((?:`{3,}|~{3,}))(.*)$/.exec(content);
}

/** 遮蔽 fenced code 與縮排程式碼，保留原始正文行號。 */
function withoutCodeBlocks(lines) {
  const margins = [];
  let quoteDepth = 0;
  let fence;
  let codeIndent;
  let paragraph = false;
  return lines.map(line => {
    let content = expandIndent(line);
    let depth = 0;
    while (/^ {0,3}>[ \t]?/.test(content)) {
      content = expandIndent(content.replace(/^ {0,3}>[ \t]?/, ''));
      depth++;
    }
    if (depth !== quoteDepth) {
      quoteDepth = depth;
      margins.length = 0;
      fence = undefined;
      codeIndent = undefined;
      paragraph = false;
    }
    const blank = !content.trim();
    const indent = content.length - content.trimStart().length;
    if (fence) {
      if (blank || indent >= fence.margin) {
        const close = fenceOf(content.slice(fence.margin));
        if (close?.[1][0] === fence.marker[0] && close[1].length >= fence.marker.length && !close[2].trim()) fence = undefined;
        return '';
      }
      fence = undefined;
    }
    if (blank) {
      paragraph = false;
      return '';
    }
    if (codeIndent !== undefined && indent >= codeIndent) return '';
    codeIndent = undefined;
    const previousMargin = margins.at(-1) ?? 0;
    while (margins.length && indent < margins.at(-1)) margins.pop();
    let margin = margins.at(-1) ?? 0;
    if (margin !== previousMargin) paragraph = false;

    const bullet = /^ {0,3}(?:[-+*]|\d{1,9}[.)])(?: {1,4}|$)/.exec(content.slice(margin));
    if (bullet) {
      margin += bullet[0].length;
      margins.push(margin);
      paragraph = false;
    }
    const relative = content.slice(margin);
    const open = fenceOf(relative);
    if (open && (open[1][0] !== '`' || !open[2].includes('`'))) {
      fence = { margin, marker: open[1] };
      paragraph = false;
      return '';
    }
    if (!paragraph && /^ {4}/.test(relative)) {
      codeIndent = margin + 4;
      return '';
    }
    paragraph = !/^ {0,3}#{1,6}(?: |$)/.test(relative);
    return line;
  });
}

/** 遮蔽跳脫的 Markdown 符號與成對的 inline code，保留原行號。 */
function withoutInlineCode(lines) {
  const content = lines.join('\n').replace(/\\[\\`*_\[\]()!]/g, '  ');
  const runs = [...content.matchAll(/`+/g)];
  let start = 0;
  let output = '';
  for (let i = 0; i < runs.length; i++) {
    const first = runs[i];
    let close = i + 1;
    while (close < runs.length && runs[close][0].length !== first[0].length) close++;
    if (close === runs.length) continue;
    const end = runs[close].index + runs[close][0].length;
    const span = content.slice(first.index, end);
    if (/\n[ \t]*\n/.test(span)) continue;
    output += content.slice(start, first.index) + span.replace(/[^\n]/g, ' ');
    start = end;
    i = close;
  }
  return (output + content.slice(start)).split('\n');
}

/** 判斷正文連結是否指向 repository 內的另一份設計文件。 */
function isOtherDesignLink(target, file) {
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(target)) return false;
  let name = target.split(/[?#]/, 1)[0];
  if (!name) return false;
  try {
    name = decodeURIComponent(name);
  } catch {
    // 路徑含字面的百分比符號時，沿用原始內容。
  }
  const resolved = path.posix.normalize(name.startsWith('/') ? name.slice(1) : path.posix.join(path.posix.dirname(file), name));
  return resolved !== file && resolved !== '..' && !resolved.startsWith('../') && isDesignFile(path.posix.basename(resolved));
}

/** 檢查正文的設計文件 inline links 與斜體用途。 */
function checkBody(lines, { file, labels, bodyStart }, report) {
  const body = withoutInlineCode(withoutCodeBlocks(lines.slice(bodyStart)));
  body.forEach((line, index) => {
    const lineNumber = bodyStart + index + 1;
    for (const match of line.matchAll(INLINE_LINK)) {
      if (isOtherDesignLink(match[1] ?? match[2], file)) report('design document link belongs in the relation header', lineNumber);
    }
    const text = line.replace(INLINE_LINK, match => match.slice(0, match.indexOf('](') + 1));
    if (/(?<!\*)\*{3}(?!\*)(?=\S).*?(?<=\S)\*{3}(?!\*)|(?<![\p{L}\p{N}_])_(?!_|\s)[^_\n]+(?<=\S)_(?![\p{L}\p{N}_])/u.test(text)) {
      report('unsupported emphasis; use *label* for design document mentions', lineNumber);
    }
    for (const [, label] of text.matchAll(/(?<!\*)\*(?!\*|\s)(.+?)(?<=\S)(?<!\*)\*(?!\*)/g)) {
      if (!labels.has(label)) report('unknown label "' + label + '" in body emphasis', lineNumber);
    }
  });
}

/**
 * 讀取文件並驗證可辨識的 Markdown，保留可供關係圖使用的資料。
 *
 * @param {string} root 檔案所在 repository 的實體目錄。
 * @param {string} file 相對於 root 的正斜線路徑。
 * @param {(file: string, message: string, line?: number) => void} report 記錄錯誤。
 * @returns {object|null} 可用標頭，或無法讀取、辨識時的 null。
 */
export function readRelationDocument(root, file, report) {
  const reportHere = (message, line) => report(file, message, line);
  let lines;
  try {
    lines = readLines(path.join(root, file));
  } catch (error) {
    reportHere(error.message);
    return null;
  }
  const header = readHeader(lines, reportHere);
  if (!header) return null;
  const document = { file, ...header };
  checkBody(lines, document, reportHere);
  return document;
}
