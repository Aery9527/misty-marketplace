// Verifies that the Codex plugin packages under codex-plugins/ match their skill sources.
//
// - Run it from any directory: `node scripts/verify-codex-plugins.mjs`.
// - Exit code 0 means that every package matches; 1 means that at least one difference was found.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Overlay directory of a skill; sync lifts its contents to the Codex plugin root
// instead of copying it into the packaged skill.
const OVERLAY_DIR_NAME = 'codex-plugin';

// The plugin root is a closed set: sync owns these two entries, and every other
// entry must come from an overlay.
const RESERVED_PLUGIN_ROOT_ENTRIES = new Set(['.codex-plugin', 'skills']);

// Hooks declaration that a plugin manifest must hold when an overlay owns hooks.json.
const HOOKS_PATH = './hooks.json';

// Catalogs that declare bundles, relative to the repository root: every host reads
// the first, and only Codex reads the second.
const CATALOG_PATHS = ['.claude-plugin/marketplace.json', '.agents/plugins/codex-only-bundles.json'];

/**
 * Removes a leading `./` or `.\` and converts backslashes to forward slashes.
 *
 * @param {string} value Relative path from a catalog, e.g. "./skills" or ".\\alpha".
 * @returns {string} Path with forward slashes, e.g. "skills".
 * @throws {Error} When nothing is left after the leading part is removed.
 */
function normalizeRelativePath(value) {
  const trimmed = value.startsWith('./') || value.startsWith('.\\') ? value.slice(2) : value;
  if (trimmed === '') {
    throw new Error(`Relative path cannot be empty: '${value.replaceAll('\\', '\\\\')}'`);
  }
  return trimmed.replaceAll('\\', '/');
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
 * Tells whether a path is an existing regular file; a link is followed.
 *
 * @param {string} target Path to check.
 */
function isFile(target) {
  return fs.statSync(target, { throwIfNoEntry: false })?.isFile() ?? false;
}

/**
 * Returns a path relative to the repository root, with the separators of the platform.
 *
 * @param {string} repoRoot Repository root.
 * @param {string} target Path inside the repository.
 */
function repoRelative(repoRoot, target) {
  return path.relative(repoRoot, target);
}

/**
 * Orders two relative paths part by part, so that a directory sorts before its content.
 *
 * @param {string} left Relative path with forward slashes, e.g. "references/guide.md".
 * @param {string} right Relative path with forward slashes.
 * @returns {number} Negative, zero, or positive, as `Array.prototype.sort` expects.
 */
function compareByParts(left, right) {
  const leftParts = left.split('/');
  const rightParts = right.split('/');
  const shared = Math.min(leftParts.length, rightParts.length);
  for (let index = 0; index < shared; index += 1) {
    if (leftParts[index] !== rightParts[index]) {
      return leftParts[index] < rightParts[index] ? -1 : 1;
    }
  }
  return leftParts.length - rightParts.length;
}

/**
 * Returns the items of one set, sorted, that pass a test against another set.
 *
 * @param {Set<string>} items Relative paths to filter.
 * @param {Set<string>} other Set to test each item against.
 * @param {boolean} present True keeps the items that `other` holds; false keeps the items that it lacks.
 */
function select(items, other, present) {
  return [...items].filter((item) => other.has(item) === present).sort(compareByParts);
}

/**
 * Yields every entry under a directory, depth first.
 *
 * @param {string} root Directory to walk.
 * @param {string} prefix Relative path of the directory being read; empty for the root itself.
 * @returns {Generator<string>} Relative paths with forward slashes.
 */
function* walk(root, prefix = '') {
  for (const entry of fs.readdirSync(path.join(root, prefix), { withFileTypes: true })) {
    const relativePath = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
    yield relativePath;
    if (entry.isDirectory()) {
      yield* walk(root, relativePath);
    }
  }
}

/**
 * Collects the directories and files under a root, as relative paths with forward slashes.
 *
 * - A root that is not a directory has no entries.
 *
 * @param {string} root Directory to read.
 * @param {{excludeCh: boolean, excludeTopLevel?: string}} options
 *   `excludeCh` leaves out the files whose name ends with "_ch.md";
 *   `excludeTopLevel` leaves out one top-level entry and everything under it.
 * @returns {{directories: Set<string>, files: Set<string>}}
 */
function collectEntries(root, { excludeCh, excludeTopLevel }) {
  const directories = new Set();
  const files = new Set();
  if (!isDirectory(root)) {
    return { directories, files };
  }
  for (const relativePath of walk(root)) {
    if (relativePath.split('/')[0] === excludeTopLevel) {
      continue;
    }
    if (isDirectory(path.join(root, relativePath))) {
      directories.add(relativePath);
    } else if (!(excludeCh && relativePath.endsWith('_ch.md'))) {
      files.add(relativePath);
    }
  }
  return { directories, files };
}

/**
 * Compares a source tree with its packaged copy.
 *
 * - The "_ch.md" files of the source are not expected in the copy.
 *
 * @param {string} sourceRoot Source directory.
 * @param {string} targetRoot Packaged copy of the source directory.
 * @param {{repoRoot: string, excludeTopLevel?: string}} options
 *   `repoRoot` is the repository root that the reported paths are relative to;
 *   `excludeTopLevel` is a top-level entry of the source that the copy must not hold.
 * @returns {string[]} One message for each difference.
 */
function compareTrees(sourceRoot, targetRoot, { repoRoot, excludeTopLevel }) {
  const expected = collectEntries(sourceRoot, { excludeCh: true, excludeTopLevel });
  const actual = collectEntries(targetRoot, { excludeCh: false });
  const sourcePath = (relativePath) => repoRelative(repoRoot, path.join(sourceRoot, relativePath));
  const targetPath = (relativePath) => repoRelative(repoRoot, path.join(targetRoot, relativePath));
  const errors = [];

  for (const relativePath of select(expected.directories, actual.directories, false)) {
    errors.push(`Missing directory: ${targetPath(relativePath)} (expected from ${sourcePath(relativePath)})`);
  }
  for (const relativePath of select(actual.directories, expected.directories, false)) {
    errors.push(`Unexpected directory: ${targetPath(relativePath)}`);
  }
  for (const relativePath of select(expected.files, actual.files, false)) {
    errors.push(`Missing file: ${targetPath(relativePath)} (expected from ${sourcePath(relativePath)})`);
  }
  for (const relativePath of select(actual.files, expected.files, false)) {
    errors.push(`Unexpected file: ${targetPath(relativePath)}`);
  }
  for (const relativePath of select(expected.files, actual.files, true)) {
    if (!sameContent(path.join(sourceRoot, relativePath), path.join(targetRoot, relativePath))) {
      errors.push(`Content mismatch: ${targetPath(relativePath)} != ${sourcePath(relativePath)}`);
    }
  }
  return errors;
}

/**
 * Tells whether two files hold the same bytes.
 *
 * @param {string} left Path of the first file.
 * @param {string} right Path of the second file.
 */
function sameContent(left, right) {
  return fs.readFileSync(left).equals(fs.readFileSync(right));
}

/**
 * Compares one overlay with the plugin root, and reports which root entries the overlay owns.
 *
 * - A "_ch.md" file directly in the overlay is not expected at the plugin root.
 *
 * @param {string} overlayRoot Overlay directory of a skill.
 * @param {string} pluginRoot Root of the Codex plugin package.
 * @param {string} repoRoot Repository root that the reported paths are relative to.
 * @returns {{errors: string[], ownedNames: Set<string>}}
 */
function verifyOverlay(overlayRoot, pluginRoot, repoRoot) {
  const errors = [];
  const ownedNames = new Set();
  for (const name of fs.readdirSync(overlayRoot).sort()) {
    const sourceEntry = path.join(overlayRoot, name);
    if (isFile(sourceEntry) && name.endsWith('_ch.md')) {
      continue;
    }
    ownedNames.add(name);
    errors.push(...verifyOverlayEntry(sourceEntry, path.join(pluginRoot, name), repoRoot));
  }
  return { errors, ownedNames };
}

/**
 * Compares one entry of an overlay with its copy at the plugin root.
 *
 * @param {string} sourceEntry File or directory in the overlay.
 * @param {string} targetEntry Expected copy at the plugin root.
 * @param {string} repoRoot Repository root that the reported paths are relative to.
 * @returns {string[]} One message for each difference.
 */
function verifyOverlayEntry(sourceEntry, targetEntry, repoRoot) {
  const source = repoRelative(repoRoot, sourceEntry);
  const target = repoRelative(repoRoot, targetEntry);
  if (!fs.existsSync(targetEntry)) {
    return [`Missing overlay entry: ${target} (expected from ${source})`];
  }
  if (isDirectory(sourceEntry)) {
    return compareTrees(sourceEntry, targetEntry, { repoRoot });
  }
  return sameContent(sourceEntry, targetEntry) ? [] : [`Content mismatch: ${target} != ${source}`];
}

/**
 * Reads every bundle that Codex packages, whichever catalog declares it.
 *
 * - A bundle belongs to exactly one catalog, so a name in both is refused rather
 *   than packaged twice from two declarations that are free to disagree.
 *
 * @param {string} repoRoot Repository root.
 * @returns {{declarations: object[], errors: string[]}}
 */
function readBundleDeclarations(repoRoot) {
  const declarations = [];
  const errors = [];
  const declaredIn = new Map(); // Catalog that declares each plugin, by plugin name.

  for (const location of CATALOG_PATHS) {
    const catalog = JSON.parse(fs.readFileSync(path.join(repoRoot, location), 'utf8'));
    if (!Object.hasOwn(catalog, 'plugins')) {
      errors.push(`${location} must declare a "plugins" array; use [] when it has none`);
      continue;
    }
    for (const plugin of catalog.plugins) {
      errors.push(...declare(plugin, location, { declarations, declaredIn }));
    }
  }
  return { declarations, errors };
}

/**
 * Records one plugin declaration, unless another catalog already declares the plugin.
 *
 * @param {object} plugin Plugin declaration from a catalog.
 * @param {string} location Catalog that holds the declaration, e.g. ".claude-plugin/marketplace.json".
 * @param {{declarations: object[], declaredIn: Map<string, string>}} seen
 *   Declarations accepted so far and the catalog of each plugin name; both are updated.
 * @returns {string[]} A message when the plugin is declared twice; otherwise empty.
 */
function declare(plugin, location, seen) {
  const pluginName = String(requireField(plugin, 'name'));
  if (seen.declaredIn.has(pluginName)) {
    return [
      `Plugin ${pluginName} is declared in both ${seen.declaredIn.get(pluginName)} ` +
        `and ${location}; a bundle belongs to exactly one catalog`,
    ];
  }
  seen.declaredIn.set(pluginName, location);
  seen.declarations.push(plugin);
  return [];
}

/**
 * Returns a field that a plugin declaration must hold.
 *
 * @param {object} plugin Plugin declaration from a catalog.
 * @param {string} field Field name, e.g. "source".
 * @throws {Error} When the declaration lacks the field.
 */
function requireField(plugin, field) {
  if (!Object.hasOwn(plugin, field)) {
    throw new Error(`Plugin declaration lacks the field "${field}": ${JSON.stringify(plugin)}`);
  }
  return plugin[field];
}

/**
 * Verifies every declared plugin package of a repository.
 *
 * @param {string} repoRoot Repository root.
 * @returns {string[]} One message for each difference; empty when every package matches.
 */
export function verifyRepo(repoRoot) {
  const { declarations, errors } = readBundleDeclarations(repoRoot);
  if (errors.length > 0) {
    return errors;
  }
  return declarations.flatMap((plugin) => verifyPlugin(plugin, repoRoot));
}

/**
 * Verifies the package of one plugin: its skills, its root entries, and its manifest.
 *
 * @param {object} plugin Plugin declaration from a catalog.
 * @param {string} repoRoot Repository root.
 * @returns {string[]} One message for each difference.
 */
function verifyPlugin(plugin, repoRoot) {
  const pluginName = String(requireField(plugin, 'name'));
  const sourceRoot = path.join(repoRoot, normalizeRelativePath(String(requireField(plugin, 'source'))));
  const pluginRoot = path.join(repoRoot, 'codex-plugins', pluginName);
  const targetSkillsRoot = path.join(pluginRoot, 'skills');
  if (!isDirectory(targetSkillsRoot)) {
    return [`Missing skills directory: ${repoRelative(repoRoot, targetSkillsRoot)}`];
  }

  const skillPaths = Object.hasOwn(plugin, 'skills') ? plugin.skills : [];
  const skills = verifySkills(skillPaths, { repoRoot, pluginName, pluginRoot, sourceRoot });
  return [
    ...skills.errors,
    ...verifySkillsRoot(targetSkillsRoot, skills.declaredNames, repoRoot),
    ...verifyPluginRootEntries(pluginRoot, skills.overlayOwnedNames, repoRoot),
    ...verifyManifest(pluginRoot, skills.overlayOwnedNames, repoRoot),
  ];
}

/**
 * Verifies the declared skills of one plugin against their packaged copies.
 *
 * @param {string[]} skillPaths Skill paths of the declaration, relative to the plugin source, e.g. "./alpha".
 *   A `null` value makes the verification fail with an error.
 * @param {{repoRoot: string, pluginName: string, pluginRoot: string, sourceRoot: string}} context
 *   Repository root, plugin name, root of its package, and root of its skill sources.
 * @returns {{errors: string[], declaredNames: Set<string>, overlayOwnedNames: Set<string>}}
 *   Differences, the declared skill names, and the plugin root entries that overlays own.
 */
function verifySkills(skillPaths, context) {
  const errors = [];
  const declaredNames = new Set();
  const overlayOwnedNames = new Set();
  for (const skillPath of skillPaths) {
    const normalizedPath = normalizeRelativePath(String(skillPath));
    declaredNames.add(path.posix.basename(normalizedPath));
    errors.push(...verifySkill(normalizedPath, context, overlayOwnedNames));
  }
  return { errors, declaredNames, overlayOwnedNames };
}

/**
 * Verifies one skill against its packaged copy, including its overlay.
 *
 * @param {string} normalizedPath Skill path relative to the plugin source, with forward slashes.
 * @param {{repoRoot: string, pluginName: string, pluginRoot: string, sourceRoot: string}} context
 *   Repository root, plugin name, root of its package, and root of its skill sources.
 * @param {Set<string>} overlayOwnedNames Plugin root entries that the overlays of earlier skills own; updated.
 * @returns {string[]} One message for each difference.
 */
function verifySkill(normalizedPath, context, overlayOwnedNames) {
  const { repoRoot } = context;
  const sourceSkillRoot = path.join(context.sourceRoot, normalizedPath);
  const targetSkillRoot = path.join(context.pluginRoot, 'skills', path.posix.basename(normalizedPath));
  if (!isDirectory(sourceSkillRoot)) {
    return [`Missing source skill directory: ${repoRelative(repoRoot, sourceSkillRoot)}`];
  }
  if (!isDirectory(targetSkillRoot)) {
    return [`Missing target skill directory: ${repoRelative(repoRoot, targetSkillRoot)}`];
  }

  const errors = compareTrees(sourceSkillRoot, targetSkillRoot, { repoRoot, excludeTopLevel: OVERLAY_DIR_NAME });
  const overlayRoot = path.join(sourceSkillRoot, OVERLAY_DIR_NAME);
  if (isDirectory(overlayRoot)) {
    errors.push(...verifySkillOverlay(overlayRoot, context, overlayOwnedNames));
  }
  return errors;
}

/**
 * Verifies the overlay of one skill, and refuses a root entry that an earlier skill already owns.
 *
 * @param {string} overlayRoot Overlay directory of the skill.
 * @param {{repoRoot: string, pluginName: string, pluginRoot: string}} context
 *   Repository root, plugin name, and root of its package.
 * @param {Set<string>} overlayOwnedNames Plugin root entries that the overlays of earlier skills own; updated.
 * @returns {string[]} One message for each difference.
 */
function verifySkillOverlay(overlayRoot, context, overlayOwnedNames) {
  const overlay = verifyOverlay(overlayRoot, context.pluginRoot, context.repoRoot);
  const errors = [...overlay.errors];
  for (const name of [...overlay.ownedNames].filter((owned) => overlayOwnedNames.has(owned)).sort()) {
    errors.push(`Overlay entry '${name}' is declared by more than one skill in plugin '${context.pluginName}'`);
  }
  for (const name of overlay.ownedNames) {
    overlayOwnedNames.add(name);
  }
  return errors;
}

/**
 * Reports the entries of a packaged skills directory that no declaration accounts for.
 *
 * @param {string} targetSkillsRoot Skills directory of the plugin package.
 * @param {Set<string>} declaredNames Names of the declared skills.
 * @param {string} repoRoot Repository root that the reported paths are relative to.
 * @returns {string[]} One message for each unexpected entry.
 */
function verifySkillsRoot(targetSkillsRoot, declaredNames, repoRoot) {
  const errors = [];
  for (const name of fs.readdirSync(targetSkillsRoot).sort()) {
    const entry = path.join(targetSkillsRoot, name);
    if (isDirectory(entry) && !declaredNames.has(name)) {
      errors.push(`Unexpected skill directory: ${repoRelative(repoRoot, entry)}`);
    } else if (isFile(entry)) {
      errors.push(`Unexpected file in skills root: ${repoRelative(repoRoot, entry)}`);
    }
  }
  return errors;
}

/**
 * Reports the entries of a plugin root that neither sync nor an overlay owns.
 *
 * @param {string} pluginRoot Root of the Codex plugin package.
 * @param {Set<string>} overlayOwnedNames Plugin root entries that overlays own.
 * @param {string} repoRoot Repository root that the reported paths are relative to.
 * @returns {string[]} One message for each unexpected entry.
 */
function verifyPluginRootEntries(pluginRoot, overlayOwnedNames, repoRoot) {
  return fs
    .readdirSync(pluginRoot)
    .sort()
    .filter((name) => !RESERVED_PLUGIN_ROOT_ENTRIES.has(name) && !overlayOwnedNames.has(name))
    .map((name) => `Unexpected plugin root entry: ${repoRelative(repoRoot, path.join(pluginRoot, name))}`);
}

/**
 * Verifies that the plugin manifest exists and declares hooks exactly when an overlay owns hooks.json.
 *
 * @param {string} pluginRoot Root of the Codex plugin package.
 * @param {Set<string>} overlayOwnedNames Plugin root entries that overlays own.
 * @param {string} repoRoot Repository root that the reported paths are relative to.
 * @returns {string[]} One message for each difference.
 */
function verifyManifest(pluginRoot, overlayOwnedNames, repoRoot) {
  const manifestPath = path.join(pluginRoot, '.codex-plugin', 'plugin.json');
  const location = repoRelative(repoRoot, manifestPath);
  if (!isFile(manifestPath)) {
    return [`Missing plugin manifest: ${location}`];
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (overlayOwnedNames.has('hooks.json')) {
    return manifest.hooks === HOOKS_PATH ? [] : [`Plugin manifest ${location} must declare hooks as '${HOOKS_PATH}'`];
  }
  return Object.hasOwn(manifest, 'hooks')
    ? [`Plugin manifest ${location} declares hooks without an overlay-owned hooks.json`]
    : [];
}

/**
 * Verifies the repository that holds this script, and prints the result.
 *
 * @returns {number} Exit code: 0 when every package matches, otherwise 1.
 */
function main() {
  const scriptPath = fs.realpathSync(fileURLToPath(import.meta.url));
  const errors = verifyRepo(path.resolve(path.dirname(scriptPath), '..'));
  if (errors.length > 0) {
    console.log('Codex plugin verification failed:');
    for (const error of errors) {
      console.log(`- ${error}`);
    }
    return 1;
  }
  console.log('Codex plugin verification passed.');
  return 0;
}

const invokedPath = process.argv[1];
if (invokedPath !== undefined && fs.realpathSync(invokedPath) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  process.exitCode = main();
}
