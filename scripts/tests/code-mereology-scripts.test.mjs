// 驗證 code-mereology 隨附的腳本。執行 `node --test "scripts/tests/*.test.mjs"`。

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { count } from '../../skills/code-mereology/scripts/count-lines.mjs';
import { find as findPlanned } from '../../skills/code-mereology/scripts/list-planned.mjs';
import { find as findPlans } from '../../skills/code-mereology/scripts/list-plans.mjs';

// Directory that holds the scripts under test.
const SCRIPTS_DIR = fileURLToPath(new URL('../../skills/code-mereology/scripts/', import.meta.url));

/**
 * Runs a test body against a new temporary directory, and removes the directory afterward.
 *
 * @param {(directory: string) => void} body Test body; it receives the directory.
 */
function withDirectory(body) {
  const directory = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'code-mereology-')));
  try {
    body(directory);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

/**
 * Writes a file, creating its parent directories.
 *
 * @param {string} directory Base directory.
 * @param {string} relativePath File path relative to the base directory, with forward slashes.
 * @param {string | Uint8Array} content File content, as text or as bytes.
 * @returns {string} Path of the written file.
 */
function write(directory, relativePath, content) {
  const target = path.join(directory, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
  return target;
}

/**
 * Counts the lines of a document with the given content.
 *
 * @param {string} content Document content.
 * @returns {number} Counted lines.
 */
function countOf(content) {
  let counted;
  withDirectory((directory) => {
    counted = count(write(directory, 'sd-doc.md', content));
  });
  return counted;
}

/**
 * Finds the planned link targets of a document with the given content.
 *
 * @param {string} content Document content.
 * @returns {{line: number, target: string}[]} Planned links.
 */
function plannedOf(content) {
  let found;
  withDirectory((directory) => {
    found = findPlanned(write(directory, 'sd-doc.md', content));
  });
  return found;
}

/**
 * Runs one script as a command.
 *
 * @param {string} script File name of the script, e.g. "count-lines.mjs".
 * @param {string[]} args Command-line arguments.
 * @param {string} cwd Working directory of the command.
 * @returns {{status: number, stdout: string, stderr: string}} Exit code and output.
 */
function run(script, args, cwd) {
  const result = spawnSync(process.execPath, [path.join(SCRIPTS_DIR, script), ...args], { cwd, encoding: 'utf8' });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

test('count-lines counts every line of a document without fences', () => {
  assert.equal(countOf('a\nb\n'), 2);
  assert.equal(countOf('a\nb'), 2);
  assert.equal(countOf(''), 0);
});

test('count-lines leaves out a Mermaid block, including its fences', () => {
  assert.equal(countOf('a\n```mermaid\ngraph TD\n```\nb\n'), 2);
});

test('count-lines counts a fenced block that is not Mermaid', () => {
  assert.equal(countOf('```bash\nls\n```\n'), 3);
  assert.equal(countOf('~~~\nx\n~~~\n'), 3);
  assert.equal(countOf('```Mermaid\nx\n```\n'), 3);
  assert.equal(countOf('~~~mermaid\nx\n~~~\n'), 3);
});

test('count-lines reads a Mermaid fence inside a longer fence as content', () => {
  assert.equal(countOf('````\n```mermaid\nx\n```\n````\n'), 5);
});

test('count-lines counts an indented Mermaid fence as ordinary text', () => {
  assert.equal(countOf(' ```mermaid\nx\n ```\n'), 3);
  assert.equal(countOf('    ```mermaid\ntext\n'), 2);
});

test('count-lines does not close a block on a fence that carries an info string', () => {
  assert.equal(countOf('```mermaid\nx\n```js\n```\nafter\n'), 1);
});

test('count-lines drops a byte order mark and accepts CRLF line endings', () => {
  assert.equal(countOf('﻿a\r\n```mermaid\r\nx\r\n```\r\n'), 1);
});

test('count-lines fails on a Mermaid block that is never closed', () => {
  assert.throws(() => countOf('a\n```mermaid\nx\n'), /unclosed mermaid fence/);
  assert.equal(countOf('```bash\nls\n'), 2);
});

test('count-lines prints the count and the path, and reports a file that fails', () => {
  withDirectory((directory) => {
    write(directory, 'sd-a.md', 'a\nb\n');

    const counted = run('count-lines.mjs', ['sd-a.md', 'missing.md'], directory);

    assert.equal(counted.stdout, '2\tsd-a.md\n');
    assert.match(counted.stderr, /^ERROR missing\.md: /);
    assert.equal(counted.status, 1);
    assert.equal(run('count-lines.mjs', [], directory).status, 2);
  });
});

test('count-lines and list-planned end a line at a lone carriage return', () => {
  assert.equal(countOf('a\rb\r'), 2);
  assert.equal(countOf('\n\r\n\r'), 3);
  assert.deepEqual(plannedOf('text\r[A](a.md) (planned)\r'), [{ line: 2, target: 'a.md' }]);
});

test('count-lines and list-planned report a file that is not UTF-8 and go on to the next file', () => {
  withDirectory((directory) => {
    write(directory, 'bad.md', Buffer.from([0xff, 0xfe, 0x0a]));
    write(directory, 'sd-a.md', '[A](a.md) (planned)\n');

    const counted = run('count-lines.mjs', ['bad.md', 'sd-a.md'], directory);
    const listed = run('list-planned.mjs', ['bad.md', 'sd-a.md'], directory);

    assert.equal(counted.stdout, '1\tsd-a.md\n');
    assert.match(counted.stderr, /^ERROR bad\.md: /);
    assert.equal(counted.status, 1);
    assert.equal(listed.stdout, 'sd-a.md:1\ta.md\n');
    assert.match(listed.stderr, /^ERROR bad\.md: /);
    assert.equal(listed.status, 1);
  });
});

test('list-planned reports a marker that follows an inline link', () => {
  assert.deepEqual(plannedOf('text\n\n[A](a.md) (planned) and [B](src/b.ts)(planned)\n'), [
    { line: 3, target: 'a.md' },
    { line: 3, target: 'src/b.ts' },
  ]);
});

test('list-planned ignores the marker in prose, an image, and a link outside the canonical form', () => {
  assert.deepEqual(plannedOf('this is (planned)\n'), []);
  assert.deepEqual(plannedOf('![A](a.png) (planned)\n'), []);
  assert.deepEqual(plannedOf('[A](a.md "title") (planned)\n'), []);
  assert.deepEqual(plannedOf('[A [x]](a.md) (planned)\n'), []);
});

test('list-planned 保留路徑中的 U+FEFF 並排除含空白的路徑', () => {
  const content = [
    '[A](a\uFEFFb.md) (planned)',
    '[B](a\u0085b.md) (planned)',
    '[C](a\u001Cb.md) (planned)',
    '[D](a\u00A0b.md) (planned)',
  ].join('\n');

  assert.deepEqual(plannedOf(content), [{ line: 1, target: 'a\uFEFFb.md' }]);
});

test('list-planned 以相同空白字元集辨識標記前的間隔', () => {
  const content = '[A](a.md)\u0085(planned)\n[B](b.md)\uFEFF(planned)\n';

  assert.deepEqual(plannedOf(content), [{ line: 1, target: 'a.md' }]);
});

test('list-planned prints the file, the line, and the target', () => {
  withDirectory((directory) => {
    write(directory, 'sd-a.md', '[A](a.md) (planned)\n');

    const listed = run('list-planned.mjs', ['sd-a.md', 'missing.md'], directory);

    assert.equal(listed.stdout, 'sd-a.md:1\ta.md\n');
    assert.match(listed.stderr, /^ERROR missing\.md: /);
    assert.equal(listed.status, 1);
    assert.equal(run('list-planned.mjs', [], directory).status, 2);
  });
});

test('list-plans finds the plans below a directory, ordered without regard to case', () => {
  withDirectory((directory) => {
    write(directory, 'sd-B-plan.md', '');
    write(directory, 'docs/sd-a-plan.md', '');
    write(directory, 'docs/sd-plan.md', '');
    write(directory, 'docs/notes.md', '');
    write(directory, '.git/sd-x-plan.md', '');

    const prefix = directory.replaceAll('\\', '/');
    assert.deepEqual(findPlans(directory), [`${prefix}/docs/sd-a-plan.md`, `${prefix}/sd-B-plan.md`]);
  });
});

test('list-plans reports a file only when its name is a plan name', () => {
  withDirectory((directory) => {
    const plan = write(directory, 'sd-a-plan.md', '');
    const other = write(directory, 'notes.md', '');

    assert.deepEqual(findPlans(plan), [plan.replaceAll('\\', '/')]);
    assert.deepEqual(findPlans(other), []);
    assert.throws(() => findPlans(path.join(directory, 'missing')), /path does not exist/);
  });
});

test('list-plans searches the current directory by default and prints each plan once', () => {
  withDirectory((directory) => {
    write(directory, 'sd-B-plan.md', '');
    write(directory, 'docs/sd-a-plan.md', '');

    assert.equal(run('list-plans.mjs', [], directory).stdout, 'docs/sd-a-plan.md\nsd-B-plan.md\n');

    const repeated = run('list-plans.mjs', ['.', 'docs', 'missing'], directory);
    assert.equal(repeated.stdout, 'docs/sd-a-plan.md\nsd-B-plan.md\n');
    assert.match(repeated.stderr, /^ERROR missing: /);
    assert.equal(repeated.status, 1);
  });
});
