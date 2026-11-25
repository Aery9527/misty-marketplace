// Reads a text file as lines, for the scripts of this skill.

import fs from 'node:fs';

/**
 * Reads a UTF-8 text file as lines, without their line endings.
 *
 * - A leading byte order mark is dropped.
 * - `\n`, `\r\n`, and `\r` each end a line; a final line ending does not start another line.
 *
 * @param {string} file Path of the file.
 * @returns {string[]} Lines of the file; empty for an empty file.
 * @throws {Error} When the file cannot be read or is not valid UTF-8.
 */
export function readLines(file) {
  const text = new TextDecoder('utf-8', { fatal: true }).decode(fs.readFileSync(file));
  const lines = text.split(/\r\n|\r|\n/);
  if (lines.at(-1) === '') {
    lines.pop();
  }
  return lines;
}
