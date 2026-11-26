#!/usr/bin/env node
// Lists the links in a design document whose target does not exist yet.
//
// - Phase 1 marks such a link with (planned), and Phase 2 clears the marker once the
//   target is real. Only a marker that follows an inline Markdown link counts, so the
//   word in ordinary prose is never reported as an open promise.
// - It recognizes the canonical form that the skill requires: a single-line inline link,
//   no title, whose label holds no bracket and whose destination holds no space or
//   parenthesis. Anything else is out of contract, which is why the skill forbids it
//   for planned links: a missed promise would read as a kept one.
// - It does not tell a real link from one quoted as an example. The skill forbids the
//   planned-link shape anywhere it is not a genuine promise; a document can follow that
//   rule, and a partial Markdown parser cannot enforce it without false negatives.
// - Usage: `node list-planned.mjs <file>...`; it prints `<file>:<line>`, a tab, and the target.
// - Exit code: 0 when every file was read, 1 when a file failed, 2 when no file was given.

import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { readLines } from './read-lines.mjs';

// An inline Markdown link followed by the marker. The required opening bracket keeps a
// stray fragment from matching, and the lookbehind keeps image syntax out. No title is
// accepted, so the destination is the whole content of the parentheses.
// 空白包含 Unicode White_Space 與 U+001C 至 U+001F，沿用 Python 版的比對行為。
const PLANNED = /(?<!!)\[[^\][]*\]\((?<target>[^)\p{White_Space}\u001C-\u001F]+)\)[\p{White_Space}\u001C-\u001F]*\(planned\)/gu;

/**
 * Finds every planned link in one file.
 *
 * @param {string} file Path of the document.
 * @returns {{line: number, target: string}[]} Line number, from 1, and link target of each planned link.
 * @throws {Error} When the file cannot be read or is not valid UTF-8.
 */
export function find(file) {
  return readLines(file).flatMap((text, index) =>
    [...text.matchAll(PLANNED)].map((match) => ({ line: index + 1, target: match.groups.target })),
  );
}

/**
 * Prints the planned links of one document.
 *
 * @param {string} file Path of the document.
 * @throws {Error} When the file cannot be read or is not valid UTF-8.
 */
function printPlanned(file) {
  for (const { line, target } of find(file)) {
    console.log(`${file}:${line}\t${target}`);
  }
}

/**
 * Lists the planned links of each given document.
 *
 * - A file that cannot be read is reported, and the other files are still listed.
 *
 * @param {string[]} files Paths of the documents.
 * @returns {number} Exit code.
 */
export function main(files) {
  if (files.length === 0) {
    console.error('usage: list-planned.mjs <file>...');
    return 2;
  }
  let status = 0;
  for (const file of files) {
    try {
      printPlanned(file);
    } catch (error) {
      console.error(`ERROR ${file}: ${error.message}`);
      status = 1;
    }
  }
  return status;
}

const invokedPath = process.argv[1];
if (invokedPath !== undefined && fs.realpathSync(invokedPath) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  process.exitCode = main(process.argv.slice(2));
}
