// Tests of scripts/verify-codex-plugins.mjs; run them with `node --test scripts/tests/`.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { verifyRepo } from '../verify-codex-plugins.mjs';

// Declaration of one plugin "demo" that packages the skill "alpha".
const DEMO_PLUGIN = { name: 'demo', source: './skills', skills: ['./alpha'] };

/**
 * Runs a test body against a new temporary repository, and removes the repository afterward.
 *
 * @param {(repo: string) => void} body Test body; it receives the repository root.
 */
function withRepo(body) {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-codex-plugins-'));
  try {
    body(repo);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
}

/**
 * Writes a text file, creating its parent directories.
 *
 * @param {string} repo Repository root.
 * @param {string} relativePath File path relative to the repository root, with forward slashes.
 * @param {string} content File content.
 */
function writeText(repo, relativePath, content) {
  const target = path.join(repo, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

/**
 * Writes the manifest of one Codex plugin package.
 *
 * @param {string} repo Repository root.
 * @param {string} pluginName Plugin name, e.g. "demo".
 * @param {boolean} hooks True makes the manifest declare hooks.
 */
function writePluginManifest(repo, pluginName, hooks = false) {
  const manifest = { name: pluginName, version: '0.2.0', ...(hooks ? { hooks: './hooks.json' } : {}) };
  writeText(repo, `codex-plugins/${pluginName}/.codex-plugin/plugin.json`, `${JSON.stringify(manifest, null, 2)}\n`);
}

/**
 * Writes both catalogs and one manifest for each declared plugin.
 *
 * @param {string} repo Repository root.
 * @param {object[]} plugins Plugins that every host can install.
 * @param {object[]} codexOnlyPlugins Plugins that only Codex can install.
 */
function writeMarketplace(repo, plugins, codexOnlyPlugins = []) {
  const content = { metadata: { version: '0.2.0' }, plugins };
  writeText(repo, '.claude-plugin/marketplace.json', `${JSON.stringify(content, null, 2)}\n`);
  writeText(
    repo,
    '.agents/plugins/codex-only-bundles.json',
    `${JSON.stringify({ plugins: codexOnlyPlugins }, null, 2)}\n`,
  );
  for (const plugin of [...plugins, ...codexOnlyPlugins]) {
    writePluginManifest(repo, plugin.name);
  }
}

/**
 * Writes the "demo" plugin whose skill "alpha" carries an overlay with hooks.json and commands/run.md.
 *
 * - The plugin root does not hold the lifted overlay entries yet; each test adds the ones it needs.
 *
 * @param {string} repo Repository root.
 */
function writeOverlayFixture(repo) {
  writeMarketplace(repo, [DEMO_PLUGIN]);
  writePluginManifest(repo, 'demo', true);
  writeText(repo, 'skills/alpha/SKILL.md', '# alpha\n');
  writeText(repo, 'skills/alpha/codex-plugin/hooks.json', '{}\n');
  writeText(repo, 'skills/alpha/codex-plugin/commands/run.md', '# run\n');
  writeText(repo, 'codex-plugins/demo/skills/alpha/SKILL.md', '# alpha\n');
}

/**
 * Tells whether any message contains a text.
 *
 * @param {string[]} errors Messages that verifyRepo returned.
 * @param {string} text Text to look for.
 */
function mentions(errors, text) {
  return errors.some((error) => error.includes(text));
}

test('passes when the target matches the source without _ch files', () => {
  withRepo((repo) => {
    writeMarketplace(repo, [DEMO_PLUGIN]);
    writeText(repo, 'skills/alpha/SKILL.md', '# alpha\n');
    writeText(repo, 'skills/alpha/SKILL_ch.md', '# zh\n');
    writeText(repo, 'skills/alpha/references/guide.md', 'guide\n');
    writeText(repo, 'codex-plugins/demo/skills/alpha/SKILL.md', '# alpha\n');
    writeText(repo, 'codex-plugins/demo/skills/alpha/references/guide.md', 'guide\n');

    assert.deepEqual(verifyRepo(repo), []);
  });
});

test('fails when the target contains an extra file', () => {
  withRepo((repo) => {
    writeMarketplace(repo, [DEMO_PLUGIN]);
    writeText(repo, 'skills/alpha/SKILL.md', '# alpha\n');
    writeText(repo, 'codex-plugins/demo/skills/alpha/SKILL.md', '# alpha\n');
    writeText(repo, 'codex-plugins/demo/skills/alpha/extra.md', 'extra\n');

    assert.ok(mentions(verifyRepo(repo), 'Unexpected file'));
  });
});

test('fails when the target is missing a file', () => {
  withRepo((repo) => {
    writeMarketplace(repo, [DEMO_PLUGIN]);
    writeText(repo, 'skills/alpha/SKILL.md', '# alpha\n');
    writeText(repo, 'skills/alpha/references/guide.md', 'guide\n');
    writeText(repo, 'codex-plugins/demo/skills/alpha/SKILL.md', '# alpha\n');

    assert.ok(mentions(verifyRepo(repo), 'Missing file'));
  });
});

test('fails when the file content differs', () => {
  withRepo((repo) => {
    writeMarketplace(repo, [DEMO_PLUGIN]);
    writeText(repo, 'skills/alpha/SKILL.md', '# alpha\n');
    writeText(repo, 'codex-plugins/demo/skills/alpha/SKILL.md', '# beta\n');

    assert.ok(mentions(verifyRepo(repo), 'Content mismatch'));
  });
});

test('fails when the target contains an undeclared skill directory', () => {
  withRepo((repo) => {
    writeMarketplace(repo, [DEMO_PLUGIN]);
    writeText(repo, 'skills/alpha/SKILL.md', '# alpha\n');
    writeText(repo, 'codex-plugins/demo/skills/alpha/SKILL.md', '# alpha\n');
    writeText(repo, 'codex-plugins/demo/skills/beta/SKILL.md', '# beta\n');

    assert.ok(mentions(verifyRepo(repo), 'Unexpected skill directory'));
  });
});

test('fails when the target contains an extra empty directory', () => {
  withRepo((repo) => {
    writeMarketplace(repo, [DEMO_PLUGIN]);
    writeText(repo, 'skills/alpha/SKILL.md', '# alpha\n');
    writeText(repo, 'codex-plugins/demo/skills/alpha/SKILL.md', '# alpha\n');
    fs.mkdirSync(path.join(repo, 'codex-plugins/demo/skills/alpha/extra-dir'), { recursive: true });

    assert.ok(mentions(verifyRepo(repo), 'Unexpected directory'));
  });
});

test('fails when the target skills root contains an extra file', () => {
  withRepo((repo) => {
    writeMarketplace(repo, [DEMO_PLUGIN]);
    writeText(repo, 'skills/alpha/SKILL.md', '# alpha\n');
    writeText(repo, 'codex-plugins/demo/skills/alpha/SKILL.md', '# alpha\n');
    writeText(repo, 'codex-plugins/demo/skills/README.md', 'unexpected\n');

    assert.ok(mentions(verifyRepo(repo), 'Unexpected file in skills root'));
  });
});

test('passes when the overlay is lifted to the plugin root', () => {
  withRepo((repo) => {
    writeOverlayFixture(repo);
    writeText(repo, 'codex-plugins/demo/hooks.json', '{}\n');
    writeText(repo, 'codex-plugins/demo/commands/run.md', '# run\n');

    assert.deepEqual(verifyRepo(repo), []);
  });
});

test('fails when an overlay entry is missing from the plugin root', () => {
  withRepo((repo) => {
    writeOverlayFixture(repo);
    writeText(repo, 'codex-plugins/demo/hooks.json', '{}\n');

    assert.ok(mentions(verifyRepo(repo), 'Missing overlay entry'));
  });
});

test('fails when the plugin root keeps a stale entry', () => {
  withRepo((repo) => {
    writeOverlayFixture(repo);
    writeText(repo, 'codex-plugins/demo/hooks.json', '{}\n');
    writeText(repo, 'codex-plugins/demo/commands/run.md', '# run\n');
    writeText(repo, 'codex-plugins/demo/NOTICE', 'stale\n');

    assert.ok(mentions(verifyRepo(repo), 'Unexpected plugin root entry'));
  });
});

test('does not expect an overlay _ch file at the plugin root', () => {
  withRepo((repo) => {
    writeOverlayFixture(repo);
    writeText(repo, 'skills/alpha/codex-plugin/NOTICE_ch.md', '# zh\n');
    writeText(repo, 'codex-plugins/demo/hooks.json', '{}\n');
    writeText(repo, 'codex-plugins/demo/commands/run.md', '# run\n');

    assert.deepEqual(verifyRepo(repo), []);
  });
});

test('fails when two skills declare the same overlay entry', () => {
  withRepo((repo) => {
    writeMarketplace(repo, [{ name: 'demo', source: './skills', skills: ['./alpha', './beta'] }]);
    for (const skill of ['alpha', 'beta']) {
      writeText(repo, `skills/${skill}/SKILL.md`, `# ${skill}\n`);
      writeText(repo, `skills/${skill}/codex-plugin/hooks.json`, '{}\n');
      writeText(repo, `codex-plugins/demo/skills/${skill}/SKILL.md`, `# ${skill}\n`);
    }
    writeText(repo, 'codex-plugins/demo/hooks.json', '{}\n');

    assert.ok(mentions(verifyRepo(repo), 'declared by more than one skill'));
  });
});

test('verifies a bundle declared only for Codex', () => {
  withRepo((repo) => {
    writeMarketplace(repo, [], [{ name: 'codex-only', source: './skills', skills: ['./alpha'] }]);
    writeText(repo, 'skills/alpha/SKILL.md', '# alpha\n');
    writeText(repo, 'codex-plugins/codex-only/skills/alpha/SKILL.md', '# drifted\n');

    const errors = verifyRepo(repo);

    assert.equal(errors.length, 1);
    assert.ok(errors[0].includes('Content mismatch'));
  });
});

test('fails when a catalog omits its plugins array', () => {
  withRepo((repo) => {
    writeMarketplace(repo, []);
    writeText(repo, '.agents/plugins/codex-only-bundles.json', '{}\n');

    const errors = verifyRepo(repo);

    assert.equal(errors.length, 1);
    assert.ok(errors[0].includes('codex-only-bundles.json'));
    assert.ok(errors[0].includes('"plugins"'));
  });
});

test('throws when a declaration holds null skills', () => {
  withRepo((repo) => {
    writeMarketplace(repo, [{ name: 'demo', source: './skills', skills: null }]);
    fs.mkdirSync(path.join(repo, 'codex-plugins/demo/skills'), { recursive: true });

    assert.throws(() => verifyRepo(repo), TypeError);
  });
});

test('fails when one bundle is declared in both catalogs', () => {
  withRepo((repo) => {
    writeMarketplace(repo, [DEMO_PLUGIN], [DEMO_PLUGIN]);
    writeText(repo, 'skills/alpha/SKILL.md', '# alpha\n');
    writeText(repo, 'codex-plugins/demo/skills/alpha/SKILL.md', '# alpha\n');

    const errors = verifyRepo(repo);

    assert.equal(errors.length, 1);
    assert.ok(errors[0].includes('declared in both'));
  });
});
