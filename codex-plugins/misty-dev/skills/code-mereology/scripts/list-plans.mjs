#!/usr/bin/env node
// Lists the deferred module-change plans below repository paths.
//
// - An sd-*-plan.md file is intentionally outside the design-document graph. This search
//   is its discovery mechanism, so a plan may stay unlinked until a user chooses it for execution.
// - Usage: `node list-plans.mjs [<path>...]`; without a path it searches the current directory.
//   It prints the path of each plan, with forward slashes.
// - Exit code: 0 when every path was searched, 1 when a path failed.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// File name contract of a deferred plan.
const PLAN_NAME = /^sd-.+-plan\.md$/;

// Directories that hold version control data or other checkouts, not the repository content.
const SKIPPED_DIRECTORIES = new Set(['.git', '.hg', '.svn', '.worktree']);

/**
 * Returns a path with forward slashes.
 *
 * @param {string} native Path with the separators of the platform.
 */
function toPosix(native) {
  return path.sep === '\\' ? native.replaceAll('\\', '/') : native;
}

/**
 * Tells whether a path is an existing directory; a link is followed.
 *
 * @param {string} target Path to check.
 */
function isDirectory(target) {
  return fs.statSync(target, { throwIfNoEntry: false })?.isDirectory() ?? false;
}

/**
 * Collects the plans in one directory and below it.
 *
 * - A directory that cannot be read makes the search fail, so that it is not reported as empty.
 * - A linked directory is not searched.
 *
 * @param {string} directory Directory to search.
 * @returns {string[]} Paths of the plans, in the order found.
 */
function walk(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const child = (name) => path.join(directory, name);
  const plans = entries
    .filter((entry) => PLAN_NAME.test(entry.name) && !isDirectory(child(entry.name)))
    .map((entry) => child(entry.name));
  const directories = entries
    .filter((entry) => entry.isDirectory() && !SKIPPED_DIRECTORIES.has(entry.name))
    .map((entry) => entry.name)
    .sort();
  return plans.concat(directories.flatMap((name) => walk(child(name))));
}

/**
 * Orders two paths without regard to case.
 *
 * @param {string} left Path with forward slashes.
 * @param {string} right Path with forward slashes.
 * @returns {number} Negative, zero, or positive, as `Array.prototype.sort` expects.
 */
function compareWithoutCase(left, right) {
  const leftKey = left.toLowerCase();
  const rightKey = right.toLowerCase();
  if (leftKey === rightKey) {
    return 0;
  }
  return leftKey < rightKey ? -1 : 1;
}

/**
 * Finds the deferred plans below one file or directory, in a stable order.
 *
 * - A file is reported when its own name is a plan name.
 *
 * @param {string} root File or directory to search, as the user wrote it.
 * @returns {string[]} Paths of the plans, with forward slashes and without redundant parts,
 *   ordered without regard to case.
 * @throws {Error} When the path does not exist, or a directory below it cannot be read.
 */
export function find(root) {
  const stats = fs.statSync(root, { throwIfNoEntry: false });
  if (stats === undefined) {
    throw new Error('path does not exist');
  }
  const start = path.normalize(root);
  if (stats.isFile()) {
    return PLAN_NAME.test(path.basename(start)) ? [toPosix(start)] : [];
  }
  return walk(start).map(toPosix).sort(compareWithoutCase);
}

/**
 * Returns a value that is the same for two paths of one file.
 *
 * @param {string} plan Path of a plan.
 */
function identity(plan) {
  const resolved = fs.existsSync(plan) ? fs.realpathSync(plan) : path.resolve(plan);
  return path.sep === '\\' ? resolved.toLowerCase() : resolved;
}

/**
 * Prints the plans that were not printed before.
 *
 * @param {string[]} plans Paths of the plans found below one path.
 * @param {Set<string>} seen Identities of the plans already printed; updated.
 */
function printNew(plans, seen) {
  for (const plan of plans) {
    const id = identity(plan);
    if (!seen.has(id)) {
      seen.add(id);
      console.log(plan);
    }
  }
}

/**
 * Lists the plans below each given path once.
 *
 * - A path that cannot be searched is reported, and the other paths are still searched.
 *
 * @param {string[]} roots Files or directories to search; empty means the current directory.
 * @returns {number} Exit code.
 */
export function main(roots) {
  const seen = new Set();
  let status = 0;
  for (const root of roots.length === 0 ? ['.'] : roots) {
    try {
      printNew(find(root), seen);
    } catch (error) {
      console.error(`ERROR ${root}: ${error.message}`);
      status = 1;
    }
  }
  return status;
}

const invokedPath = process.argv[1];
if (invokedPath !== undefined && fs.realpathSync(invokedPath) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  process.exitCode = main(process.argv.slice(2));
}
