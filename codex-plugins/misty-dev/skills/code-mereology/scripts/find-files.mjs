// 共用檔案探索。維持相對路徑與大小寫排序，略過版本控制目錄與目錄連結。

import fs from 'node:fs';
import path from 'node:path';

// 這些目錄不是目前 repository 的內容。
const SKIPPED_DIRECTORIES = new Set(['.git', '.hg', '.svn', '.worktree']);

/** 以正斜線表示本平台的路徑。 */
export function toPosix(nativePath) {
  return path.sep === '\\' ? nativePath.replaceAll('\\', '/') : nativePath;
}

/** 比較兩個路徑，大小寫相異而字母相同時視為等值。 */
export function compareWithoutCase(left, right) {
  const leftKey = left.toLowerCase();
  const rightKey = right.toLowerCase();
  if (leftKey === rightKey) return 0;
  return leftKey < rightKey ? -1 : 1;
}

/** 判斷名稱是否是全庫搜尋時略過的目錄。 */
export function isSkippedDirectory(name) {
  return SKIPPED_DIRECTORIES.has(name);
}

/** 判斷目標是否為目錄，保留搜尋既有檔案時對目錄連結的辨識。 */
function isDirectory(target) {
  return fs.statSync(target, { throwIfNoEntry: false })?.isDirectory() ?? false;
}

/**
 * 依檔名搜尋並排序。明確指定的檔案以自己的檔名比對。
 *
 * @param {string} root 檔案或搜尋目錄。相對路徑維持相對表示。
 * @param {RegExp} namePattern 不帶查找狀態的檔名規則。
 * @param {Set<string>} excluded 相對於 root 且以正斜線表示的排除目錄。
 * @returns {string[]} 以正斜線表示並依大小寫無關順序排列的路徑。
 * @throws {Error} root 不存在，或無法讀取搜尋目錄。
 */
export function findFiles(root, namePattern, excluded = new Set()) {
  const stats = fs.statSync(root, { throwIfNoEntry: false });
  if (stats === undefined) throw new Error('path does not exist');
  const start = path.normalize(root);
  if (stats.isFile()) return namePattern.test(path.basename(start)) ? [toPosix(start)] : [];

  /** 收集目前目錄與子目錄中的檔案，保持原有的目錄走訪順序。 */
  function walk(directory) {
    const entries = fs.readdirSync(directory, { withFileTypes: true });
    const child = (name) => path.join(directory, name);
    const files = entries
      .filter(entry => namePattern.test(entry.name) && !isDirectory(child(entry.name)))
      .map(entry => child(entry.name));
    const directories = entries
      .filter(entry => entry.isDirectory() && !isSkippedDirectory(entry.name))
      .map(entry => entry.name)
      .sort();
    const descendants = directories.map(child)
      .filter(target => !excluded.has(toPosix(path.relative(start, target))))
      .flatMap(walk);
    return files.concat(descendants);
  }

  return walk(start).map(toPosix).sort(compareWithoutCase);
}
