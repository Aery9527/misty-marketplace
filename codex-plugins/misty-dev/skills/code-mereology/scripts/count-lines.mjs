#!/usr/bin/env node
// Counts the prose lines of a design document, excluding Mermaid blocks.
//
// - The 300-line limit measures cognitive load, and a diagram is read as a picture
//   rather than as text, so fenced Mermaid blocks do not count against it.
// - Usage: `node count-lines.mjs <file>...`; it prints the count, a tab, and the path of each file.
// - Exit code: 0 when every file was counted, 1 when a file failed, 2 when no file was given.

import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { readLines } from './read-lines.mjs';

// Info string that marks a fenced block as a Mermaid diagram.
const MERMAID_INFO = 'mermaid';

/**
 * Splits a line into the parts of a fence.
 *
 * - Four or more leading spaces make an indented code block rather than a fence, so
 *   the line stays ordinary text: mistaking one for a fence would drop real prose
 *   from the count and let an oversized document slip through.
 *
 * @param {string} line One line of the document.
 * @returns {{char: string, run: number, info: string, indent: number} | null}
 *   Fence character, its run length, the info string, and the indent; null when the line is not a fence.
 */
function parseFence(line) {
  const trimmed = line.trimEnd();
  const indent = trimmed.length - trimmed.replace(/^ +/, '').length;
  if (indent > 3) {
    return null;
  }
  const marker = trimmed.slice(indent);
  const char = ['`', '~'].find((candidate) => marker.startsWith(candidate.repeat(3)));
  if (char === undefined) {
    return null;
  }
  const run = marker.length - marker.replace(new RegExp(`^${char}+`), '').length;
  return { char, run, info: marker.slice(run).trim(), indent };
}

/**
 * Tells whether a fence opens a Mermaid block in its canonical form.
 *
 * - Only exactly three backticks in column one, with the lower-case info string, qualify.
 * - An indented fence belongs to a list item or a blockquote, and telling that apart
 *   from a top-level fence needs a full container parser, so it counts as ordinary text.
 * - Any other fence is still tracked as a block, so a Mermaid fence quoted inside it reads as content.
 *
 * @param {{char: string, run: number, info: string, indent: number}} fence Parsed opening fence.
 */
function isMermaid(fence) {
  return fence.char === '`' && fence.run === 3 && fence.info === MERMAID_INFO && fence.indent === 0;
}

/**
 * Tells whether a line closes the block that is open.
 *
 * - A closing fence carries no info string and repeats the opening character at least
 *   as many times, so a Mermaid fence nested inside a longer fence or a bash block reads as content.
 *
 * @param {{char: string, run: number, info: string} | null} parsed Parsed line; null when it is not a fence.
 * @param {{char: string, run: number}} open Opening fence of the block that is open.
 */
function closes(parsed, open) {
  return parsed !== null && parsed.char === open.char && parsed.run >= open.run && parsed.info === '';
}

/**
 * Returns the counted lines of one document.
 *
 * @param {string} file Path of the document.
 * @returns {number} Number of lines outside Mermaid blocks.
 * @throws {Error} When the file cannot be read, or when a Mermaid block is never closed,
 *   because counting past such a fence would silently swallow the rest of the file.
 */
export function count(file) {
  let counted = 0;
  let open = null; // Opening fence of the block that is open, with a `mermaid` flag; null outside a block.

  for (const line of readLines(file)) {
    const parsed = parseFence(line);
    if (open === null) {
      open = parsed === null ? null : { ...parsed, mermaid: isMermaid(parsed) };
      counted += open?.mermaid ? 0 : 1;
    } else if (closes(parsed, open)) {
      counted += open.mermaid ? 0 : 1;
      open = null;
    } else {
      counted += open.mermaid ? 0 : 1;
    }
  }

  if (open?.mermaid) {
    throw new Error('unclosed mermaid fence');
  }
  return counted;
}

/**
 * Counts each given document and prints the result.
 *
 * @param {string[]} files Paths of the documents.
 * @returns {number} Exit code.
 */
export function main(files) {
  if (files.length === 0) {
    console.error('usage: count-lines.mjs <file>...');
    return 2;
  }
  let status = 0;
  for (const file of files) {
    try {
      console.log(`${count(file)}\t${file}`);
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
