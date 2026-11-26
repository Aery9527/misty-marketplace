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

/**
 * 建立有固定鍵順序的關係文件。
 *
 * @param {object} fields 關係、tag、partial 標記與正文。關係項目已包含 Markdown 連結及說明。
 * @returns {string} UTF-8 測試文件的文字。
 */
function relationDocument({ title = '文件', parts = [], depends = [], tags = [], partial = false, body = '' } = {}) {
  return [
    '# ' + title,
    ...(partial ? ['> `code-mereology-partial`: 涵蓋既有能力。'] : []),
    '',
    '- `parts`:',
    ...parts.map(item => '    - ' + item),
    '- `depends`:',
    ...depends.map(item => '    - ' + item),
    '- `tags`:' + (tags.length ? ' ' + tags.map(tag => '`' + tag + '`').join(', ') : ''),
    ...(body ? ['', '## 說明', '', body] : []),
    '',
  ].join('\n');
}

/**
 * 從測試目錄呼叫實際 CLI。
 *
 * @param {string} root 測試目錄。
 * @param {string[]} args 查詢選項與選用的 root。
 * @returns {{status: number, stdout: string, stderr: string}} 程序回傳值。
 */
function relations(root, args = []) {
  return run('list-relations.mjs', args, root);
}

/** 寫出與計畫逐字範例相同的六個輸入檔，並回傳檔名到內容的對應。 */
function relationExample(directory) {
  const files = {
    'docs/code-mereology.json': '{"tags": {"backend": "後端服務層", "persistence": "資料存取", "search": "查詢功能"}}\n',
    'docs/bd-backend-layers.md': relationDocument({
      title: '後端服務層',
      parts: ['[資料表](../service/table/sd-table.md): 保存資料列與資料表結構', '[查詢](../service/query/sd-query.md): 依條件查出資料列'],
      tags: ['backend'],
    }),
    'service/table/sd-table.md': relationDocument({
      title: '資料表',
      parts: ['[資料列讀寫](rows/sd-table-rows.md): 讀寫資料列', '[資料表結構](schema/sd-table-schema.md): 定義欄位與型別'],
      tags: ['persistence'],
    }),
    'service/table/rows/sd-table-rows.md': relationDocument({
      title: '資料列讀寫',
      depends: ['[資料表結構](../schema/sd-table-schema.md): 寫入前依結構驗證每一列的欄位', '[列快取](../cache/sd-row-cache.md) (planned): 讀取時先查快取'],
    }),
    'service/table/schema/sd-table-schema.md': relationDocument({ title: '資料表結構' }),
    'service/query/sd-query.md': relationDocument({
      title: '查詢', depends: ['[資料表結構](../table/schema/sd-table-schema.md): 依結構解析查詢條件中的欄位'], tags: ['search'],
    }),
  };
  for (const [file, content] of Object.entries(files)) write(directory, file, content);
  return files;
}

test('list-relations 逐字輸出全庫、直接關係、全部上層與 tag 候選', () => {
  withDirectory(directory => {
    const files = relationExample(directory);
    const topic = 'docs/bd-backend-layers.md';
    const query = 'service/query/sd-query.md';
    const rows = 'service/table/rows/sd-table-rows.md';
    const schema = 'service/table/schema/sd-table-schema.md';
    const table = 'service/table/sd-table.md';
    const topicTable = topic + '\tparts\t' + table + '\t保存資料列與資料表結構\n';
    const usesSchema = query + '\tdepends\t' + schema + '\t依結構解析查詢條件中的欄位\n'
      + rows + '\tdepends\t' + schema + '\t寫入前依結構驗證每一列的欄位\n';
    const tagOfSchema = schema + '\ttag\tbackend\tinherited\n' + schema + '\ttag\tpersistence\tinherited\n';
    const tableSchema = table + '\tparts\t' + schema + '\t定義欄位與型別\n';
    const cases = [
      [[], topicTable
        + topic + '\tparts\t' + query + '\t依條件查出資料列\n' + topic + '\ttag\tbackend\n'
        + query + '\tdepends\t' + schema + '\t依結構解析查詢條件中的欄位\n' + query + '\ttag\tsearch\n'
        + rows + '\tdepends\t' + schema + '\t寫入前依結構驗證每一列的欄位\n'
        + rows + '\tdepends\tservice/table/cache/sd-row-cache.md\t讀取時先查快取\tplanned\n'
        + table + '\tparts\t' + rows + '\t讀寫資料列\n' + tableSchema + table + '\ttag\tpersistence\n'],
      [['-a', schema], usesSchema + tagOfSchema + tableSchema],
      [['-a', schema, '-f', 'p', '-d', 'a'], topicTable + tagOfSchema + tableSchema],
      [['-t', 'persistence'], rows + '\ttag\tpersistence\tinherited\n'
        + schema + '\ttag\tpersistence\tinherited\n' + table + '\ttag\tpersistence\n'],
    ];
    for (const [args, stdout] of cases) assert.deepEqual(relations(directory, args), { status: 0, stdout, stderr: '' });

    for (const [file, content] of Object.entries(files)) {
      write(directory, file, '\uFEFF' + content.replaceAll('\n', '\r\n'));
    }
    assert.deepEqual(relations(directory, cases[1][0]), { status: 0, stdout: cases[1][1], stderr: '' });
    assert.deepEqual(relations(path.join(directory, 'service'), ['-a', 'table/schema/sd-table-schema.md', '..']),
      { status: 0, stdout: cases[1][1], stderr: '' });
  });
});

test('list-relations 驗證繼承、合併上層 tag，並維持診斷行號', () => {
  withDirectory(directory => {
    const files = relationExample(directory);
    const rows = 'service/table/rows/sd-table-rows.md';
    write(directory, rows, files[rows].replace('- `tags`:', '- `tags`: `backend`'));
    let result = relations(directory, ['-a', rows, '-f', 'u']);
    assert.equal(result.status, 1);
    assert.equal(result.stderr, 'ERROR ' + rows + ':7: tag "backend" is inherited from docs/bd-backend-layers.md\n');
    write(directory, rows, files[rows]);
    write(directory, 'docs/bd-orders.md', relationDocument({
      parts: ['[資料列](../' + rows + '): 讀寫訂單資料'], tags: ['search'],
    }));
    result = relations(directory, ['-a', rows, '-f', 'u']);
    assert.deepEqual(result, { status: 0, stderr: '', stdout: ['backend', 'persistence', 'search']
      .map(tag => rows + '\ttag\t' + tag + '\tinherited\n').join('') });
    fs.unlinkSync(path.join(directory, 'docs/bd-orders.md'));
    const query = 'service/query/sd-query.md';
    write(directory, query, files[query].replace('- `tags`: `search`', '- `tags`:'));
    assert.equal(relations(directory).stderr, 'ERROR docs/code-mereology.json: tag "search" is not declared by any document\n');
  });
});

test('list-relations 驗證普通文件的組成路徑及 partial leaf 的例外與轉換', () => {
  withDirectory(directory => {
    const files = relationExample(directory);
    const table = 'service/table/sd-table.md';
    const rows = 'service/table/rows/sd-table-rows.md';
    const query = 'service/query/sd-query.md';
    write(directory, table, files[table].split('\n').filter(line => !line.includes('rows/sd-table-rows.md')).join('\n'));
    assert.match(relations(directory).stderr, /sd-table-rows\.md: .*not reachable/);
    write(directory, query, relationDocument({ depends: ['[資料列](../table/rows/sd-table-rows.md): 提供資料'], tags: ['search'] }));
    assert.match(relations(directory).stderr, /sd-table-rows\.md: .*not reachable/);
    write(directory, rows, relationDocument({ partial: true }));
    assert.equal(relations(directory).status, 0);
    write(directory, rows, relationDocument());
    assert.equal(relations(directory).status, 1);
    write(directory, 'service/table/docs/bd-rows.md', relationDocument({ parts: ['[資料列](../rows/sd-table-rows.md): 提供資料'] }));
    assert.equal(relations(directory).status, 0);
    write(directory, rows, relationDocument({ parts: ['[實作](sd-reader.md): 讀取'] }));
    write(directory, 'service/table/rows/sd-reader.md', relationDocument());
    assert.match(relations(directory).stderr, /sd-query\.md:.*overview/);
    write(directory, query, relationDocument({ depends: ['[讀取](../table/rows/sd-reader.md): 提供資料'], tags: ['search'] }));
    assert.equal(relations(directory).status, 0);
  });
  withDirectory(directory => {
    relationExample(directory);
    fs.unlinkSync(path.join(directory, 'docs/bd-backend-layers.md'));
    const { status, stderr } = relations(directory);
    assert.equal(status, 1);
    assert.equal((stderr.match(/not reachable/g) ?? []).length, 4);
    assert.match(stderr, /tag "backend" is not declared/);
  });
});

test('list-relations 驗證全庫、遷移後回溯上層，並排除封裝副本', () => {
  withDirectory(directory => {
    const top = 'docs/bd-topic.md';
    const leaf = 'service/sd-leaf.md';
    write(directory, leaf, relationDocument());
    write(directory, top, '# 主題\n\n## 說明\n\n[Leaf](../service/sd-leaf.md)\n');
    let result = relations(directory, ['-a', leaf, '-f', 'p']);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /docs\/bd-topic\.md:.*header/);
    const source = relationDocument({ parts: ['[Leaf](../service/sd-leaf.md): 提供能力'] });
    write(directory, top, source);
    const expected = { status: 0, stdout: top + '\tparts\t' + leaf + '\t提供能力\n', stderr: '' };
    assert.deepEqual(relations(directory, ['-a', leaf, '-f', 'p']), expected);
    write(directory, 'copies/' + top, source);
    write(directory, 'copies/' + leaf, relationDocument());
    write(directory, 'copies/sd-kept-plan.md', '');
    write(directory, 'docs/code-mereology.json', '{"exclude":["copies"]}');
    assert.deepEqual(relations(directory), expected);
    assert.equal(relations(directory, ['-a', 'copies/' + leaf]).status, 2);
    assert.equal(run('list-plans.mjs', [], directory).stdout, 'copies/sd-kept-plan.md\n');
    write(directory, top, relationDocument({ parts: ['[副本](../copies/service/sd-leaf.md): 排除項'] }));
    assert.match(relations(directory).stderr, /excluded/);
  });
});

test('list-relations 固定錯誤優先序與參數規則', () => {
  withDirectory(directory => {
    const configuration = 'docs/code-mereology.json';
    write(directory, 'docs/bd-topic.md', relationDocument());
    write(directory, configuration, '{');
    const invalidOptions = [
      ['--about'], ['-a'], ['-a', 'docs/bd-topic.md', '-t', 'sample'], ['-f', 'p'],
      ['-d', '2'], ['-a', 'docs/bd-topic.md', '-f', 'px'], ['-a', 'docs/bd-topic.md', '-f', 'pp'],
      ['-a', 'docs/bd-topic.md', '-d', '0'], ['-a', 'docs/bd-topic.md', '-d', '1.5'],
      ['missing-root'], ['docs/bd-topic.md'],
    ];
    for (const args of invalidOptions) {
      const { status, stdout, stderr } = relations(directory, args);
      assert.equal(status, 2, args.join(' '));
      assert.equal(stdout, '');
      assert.doesNotMatch(stderr, /code-mereology\.json/);
    }
    for (const args of [['-t', 'missing'], ['-t', 'Backend'], ['-a', 'sd-missing.md']]) {
      const { status, stdout, stderr } = relations(directory, args);
      assert.equal(status, 1);
      assert.equal(stdout, '');
      assert.match(stderr, /code-mereology\.json/);
    }
    write(directory, configuration, '{}');
    for (const args of [
      ['-t', 'missing'], ['-t', 'Backend'], ['-a', 'sd-missing.md'], ['-a', 'Docs/bd-topic.md'],
      ['-a', 'docs/bd-topic.MD'], ['-a', 'docs'], ['-a', '../sd-outside.md'],
    ]) {
      const { status, stdout } = relations(directory, args);
      assert.equal(status, 2);
      assert.equal(stdout, '');
    }
  });
});

test('list-relations 驗證設定結構與排除路徑', () => {
  withDirectory(directory => {
    const invalid = [
      '[]', '{"unknown":true}', '{"tags":[]}', '{"tags":{"backend":1}}', '{"tags":{"Backend":"x"}}',
      '{"tags":{"a-b-c-d":"x"}}', '{"exclude":"copies"}', '{"exclude":[1]}', '{"exclude":["."]}',
      '{"exclude":["../outside"]}', '{"exclude":["/outside"]}', '{"exclude":["missing"]}', '{"exclude":["Copies"]}',
      '{"exclude":["docs/bd-topic.md"]}', Buffer.from([0xff, 0xfe]),
    ];
    write(directory, 'copies/marker.txt', '');
    write(directory, 'docs/bd-topic.md', relationDocument());
    for (const config of invalid) {
      write(directory, 'docs/code-mereology.json', config);
      const { status, stdout, stderr } = relations(directory);
      assert.equal(status, 1, String(config));
      assert.equal(stdout, '');
      assert.match(stderr, /^ERROR docs\/code-mereology\.json:/);
    }
  });
});

test('list-relations 略過目錄連結及版本控制與暫存工作目錄', context => {
  withDirectory(directory => {
    write(directory, 'real/bd-topic.md', relationDocument());
    for (const folder of ['.git', '.hg', '.svn', '.worktree']) write(directory, folder + '/bd-bad.md', '沒有區塊');
    const alias = path.join(directory, 'directory-link');
    try {
      fs.symlinkSync(path.join(directory, 'real'), alias, process.platform === 'win32' ? 'junction' : 'dir');
    } catch (error) {
      if (!['EACCES', 'EPERM', 'ENOSYS', 'ENOTSUP'].includes(error.code)) throw error;
      context.skip('無法建立目錄連結：' + error.message);
      return;
    }
    assert.deepEqual(relations(directory), { status: 0, stdout: '', stderr: '' });
    assert.equal(relations(directory, ['-a', 'directory-link/bd-topic.md']).status, 2);
    write(directory, 'docs/code-mereology.json', '{"exclude":["directory-link"]}');
    assert.equal(relations(directory).status, 1);
  });
});

test('list-relations 區分依賴環與組成環，依最短距離走訪且每條邊只列一次', () => {
  withDirectory(directory => {
    write(directory, 'bd-topic.md', relationDocument({
      parts: ['a', 'b', 'c', 'd'].map(name => '[' + name + '](sd-' + name + '.md): 組成'),
    }));
    for (const [name, dependencies] of Object.entries({ a: ['b'], b: ['a'], c: [], d: [] })) {
      write(directory, 'sd-' + name + '.md', relationDocument({
        depends: dependencies.map(target => '[' + target + '](sd-' + target + '.md): 依賴'),
      }));
    }
    const cycle = relations(directory, ['-a', 'sd-a.md', '-f', 'd', '-d', 'a']);
    assert.deepEqual(cycle, { status: 0, stderr: '', stdout: 'sd-a.md\tdepends\tsd-b.md\t依賴\nsd-b.md\tdepends\tsd-a.md\t依賴\n' });
    for (const [name, dependencies] of Object.entries({ a: ['b', 'c'], b: ['d'], c: ['b'] })) {
      write(directory, 'sd-' + name + '.md', relationDocument({
        depends: dependencies.map(target => '[' + target + '](sd-' + target + '.md): 依賴'),
      }));
    }
    const merged = relations(directory, ['-a', 'sd-a.md', '-f', 'd', '-d', '2']);
    assert.deepEqual(merged, { status: 0, stderr: '', stdout: [
      'sd-a.md\tdepends\tsd-b.md\t依賴\n', 'sd-a.md\tdepends\tsd-c.md\t依賴\n',
      'sd-b.md\tdepends\tsd-d.md\t依賴\n', 'sd-c.md\tdepends\tsd-b.md\t依賴\n',
    ].join('') });
  });
  withDirectory(directory => {
    write(directory, 'docs/code-mereology.json', '{"tags":{"cyclic":"環","healthy":"獨立分支"}}');
    write(directory, 'docs/bd-cycle.md', relationDocument({ parts: ['[A](../modules/sd-a.md): 組成'] }));
    write(directory, 'docs/bd-healthy.md', relationDocument({ parts: ['[E](../modules/sd-e.md): 組成'], tags: ['healthy'] }));
    write(directory, 'modules/sd-a.md', relationDocument({ parts: ['[B](sd-b.md): 組成', '[C](sd-c.md): 組成'], tags: ['cyclic'] }));
    write(directory, 'modules/sd-b.md', relationDocument({ parts: ['[A](sd-a.md): 組成'] }));
    for (const name of ['c', 'e']) write(directory, 'modules/sd-' + name + '.md', relationDocument());
    const stderr = 'ERROR modules/sd-a.md:3: parts cycle: modules/sd-a.md -> modules/sd-b.md -> modules/sd-a.md\n';
    for (const [name, stdout] of Object.entries({
      c: '', e: 'modules/sd-e.md\ttag\thealthy\tinherited\n', a: 'modules/sd-a.md\ttag\tcyclic\n',
    })) {
      assert.deepEqual(relations(directory, ['-a', 'modules/sd-' + name + '.md', '-f', 'u']), { status: 1, stdout, stderr });
    }
  });
});

test('list-relations 拒絕無法解析的區塊、錯誤的依賴，以及正文中的設計文件連結', () => {
  withDirectory(directory => {
    const parsed = relationDocument({ depends: ['[能力](sd-target.md): 提供能力'], body: '依 *能力* 處理。' });
    write(directory, 'bd-topic.md', relationDocument({ parts: ['[來源](sd-source.md): 組成', '[目標](sd-target.md): 組成'] }));
    write(directory, 'sd-target.md', relationDocument());
    const cases = [
      [parsed.replace('- `parts`:', '導言\n- `parts`:'), /header/],
      [parsed.replace('- `parts`:\n', ''), /header/],
      [parsed.replace('- `parts`:', '- `parts`:\n- `parts`:'), /header/],
      [parsed.replace('- `parts`:', '- `parts`: value'), /header/],
      [parsed.replace('- `tags`:', '- `tags`: `first`、`second`'), /tags/],
      [parsed.replace('[能力](sd-target.md)', '[能力][ref]'), /relation item/],
      [parsed.replace('提供能力', '附\t註'), /description/],
      [parsed.replace('提供能力', ''), /description/],
      [parsed.replace('提供能力', '還有 [另一筆](sd-target.md)'), /relation item/],
      [parsed.replace('sd-target.md', 'sd-missing.md'), /target does not exist/],
      [parsed.replace('): 提供能力', ') (planned): 提供能力'), /planned target already exists/],
      [parsed.replace('sd-target.md', 'sd-target.md#section'), /relation path/],
      [parsed.replace('sd-target.md', 'SD-target.md'), /case/],
      [parsed.replace('sd-target.md', 'bd-topic.md'), /same kind/],
      [parsed.replace('sd-target.md', 'sd-target-plan.md'), /design document/],
      [parsed.replace('sd-target.md', '../sd-outside.md'), /outside/],
      [parsed.replace('依 *能力* 處理。', '*不存在*'), /unknown label/],
      [parsed.replace('依 *能力* 處理。', '***能力***'), /emphasis/],
      [parsed.replace('依 *能力* 處理。', '_能力_'), /emphasis/],
      [parsed.replace('依 *能力* 處理。', '[能力](sd-target.md#heading)'), /design document link/],
      [parsed.replace('- `tags`:', '- `tags`: `missing`'), /unknown tag/],
      [parsed.replace('    - [能力](sd-target.md): 提供能力', '    - [能力](sd-target.md): 提供能力\n    - [能力](sd-target.md): 重複'), /duplicate label/],
      [parsed.replace('    - [能力](sd-target.md): 提供能力', '    - [能力](sd-target.md): 提供能力\n    - [別名](./sd-target.md): 重複'), /duplicate relation/],
      [Buffer.from([0xff, 0xfe]), /sd-source\.md:/],
    ];
    for (const [document, diagnostic] of cases) {
      write(directory, 'sd-source.md', document);
      const result = relations(directory);
      assert.equal(result.status, 1, String(document));
      assert.match(result.stderr, diagnostic);
    }
    write(directory, 'sd-source.md', parsed.replace('# 文件', '---\ntitle: test\n---\n# 文件')
      .replace('依 *能力* 處理。', '依 *能力* 處理。`*示例*` **重點** [程式](code.mjs) [本節](#說明) [本文件](sd-source.md#說明)\n\n~~~markdown\n[忽略](sd-target.md) *任意*\n~~~'));
    assert.equal(relations(directory).status, 0);
    write(directory, 'sd-source.md', '# 無區塊\n');
    const result = relations(directory, ['-a', 'sd-source.md']);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
  });
});

test('list-relations 在 leaf 升格時查到重新接線，並拒絕遺留在 overview 的依賴', () => {
  withDirectory(directory => {
    write(directory, 'bd-topic.md', relationDocument({ parts: [
      '[UI](sd-ui.md): 組成', '[Processor](sd-processor.md): 組成', '[Format](sd-format.md): 組成',
    ] }));
    const parts = ['[Convert](sd-convert.md): 組成'];
    const depends = ['[Format](sd-format.md): 提供格式'];
    write(directory, 'sd-processor.md', relationDocument({ parts }));
    write(directory, 'sd-ui.md', relationDocument({ depends: ['[Convert](sd-convert.md): 提供轉換'] }));
    write(directory, 'sd-convert.md', relationDocument({ depends }));
    write(directory, 'sd-format.md', relationDocument());
    assert.deepEqual(relations(directory, ['-a', 'sd-convert.md', '-f', 'du']), {
      status: 0, stderr: '', stdout: 'sd-convert.md\tdepends\tsd-format.md\t提供格式\nsd-ui.md\tdepends\tsd-convert.md\t提供轉換\n',
    });
    write(directory, 'sd-processor.md', relationDocument({ parts, depends }));
    assert.match(relations(directory).stderr, /sd-processor\.md:.*overview/);
    write(directory, 'sd-processor.md', relationDocument({ parts }));
    write(directory, 'sd-ui.md', relationDocument({ depends: ['[Processor](sd-processor.md): 提供轉換'] }));
    assert.match(relations(directory).stderr, /sd-ui\.md:.*overview/);
  });
});

test('list-relations 略過巢狀程式碼並保留列表、引用和後續正文的診斷', () => {
  withDirectory(directory => {
    const file = 'bd-topic.md';
    const sample = '[範例](sd-example.md) *示例*';
    const body = [
      '- 父層', '', '    - 範例', '', '        ~~~text', '        ' + sample, '        ~~~', '',
      '    - 一般列表項目', '',
      '> ```text', '> ' + sample, '> ```', '',
      '\t' + sample, '',
      '正文。',
    ];
    write(directory, file, relationDocument({ body: body.join('\n') }));
    assert.deepEqual(relations(directory), { status: 0, stdout: '', stderr: '' });

    const bad = '[禁止](sd-example.md)';
    body[8] = '    - ' + bad;
    body[17] = bad;
    const withLinks = relationDocument({ body: body.join('\n') });
    write(directory, file, withLinks);
    const actual = relations(directory);
    const expected = withLinks.split('\n').flatMap((line, index) => line.includes(bad)
      ? ['ERROR ' + file + ':' + (index + 1) + ': design document link belongs in the relation header\n'] : []).join('');
    assert.equal(actual.status, 1);
    assert.equal(actual.stderr, expected);

    for (const prefix of [['- 範例', '', '    ~~~text', '    ' + sample], ['> ~~~text', '> ' + sample]]) {
      const content = relationDocument({ body: [...prefix, '', bad].join('\n') });
      write(directory, file, content);
      const result = relations(directory);
      assert.equal(result.status, 1);
      const badLine = content.split('\n').findIndex(line => line === bad) + 1;
      assert.equal(result.stderr, 'ERROR ' + file + ':' + badLine + ': design document link belongs in the relation header\n');
    }
  });
});
