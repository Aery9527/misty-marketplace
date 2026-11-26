import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { collectReviewContext, describeReviewScope, removeReviewPatchFiles, resolveReviewTarget, withReviewPatchFiles } from "../scripts/lib/git.mjs";
import { initGitRepo, makeTempDir, run } from "./helpers.mjs";

test("resolveReviewTarget prefers working tree when repo is dirty", () => {
  const cwd = makeTempDir();
  initGitRepo(cwd);
  fs.writeFileSync(path.join(cwd, "app.js"), "console.log('v1');\n");
  run("git", ["add", "app.js"], { cwd });
  run("git", ["commit", "-m", "init"], { cwd });
  fs.writeFileSync(path.join(cwd, "app.js"), "console.log('v2');\n");

  const target = resolveReviewTarget(cwd, {});

  assert.equal(target.mode, "working-tree");
});

test("resolveReviewTarget falls back to branch diff when repo is clean", () => {
  const cwd = makeTempDir();
  initGitRepo(cwd);
  fs.writeFileSync(path.join(cwd, "app.js"), "console.log('v1');\n");
  run("git", ["add", "app.js"], { cwd });
  run("git", ["commit", "-m", "init"], { cwd });
  run("git", ["checkout", "-b", "feature/test"], { cwd });
  fs.writeFileSync(path.join(cwd, "app.js"), "console.log('v2');\n");
  run("git", ["add", "app.js"], { cwd });
  run("git", ["commit", "-m", "change"], { cwd });

  const target = resolveReviewTarget(cwd, {});
  const context = collectReviewContext(cwd, target);

  assert.equal(target.mode, "branch");
  assert.match(target.label, /main/);
  assert.match(context.content, /Branch Diff/);
});

test("default branch names with special characters are passed to git literally", () => {
  const cwd = makeTempDir();
  const branchName = "main&branch-helper&x";
  const helperOutputPath = path.join(cwd, "branch-helper-output");
  initGitRepo(cwd);
  fs.writeFileSync(path.join(cwd, "branch-helper.cmd"), "@echo branch-helper>branch-helper-output\r\n");
  fs.writeFileSync(path.join(cwd, "app.js"), "console.log('base');\n");
  run("git", ["add", "app.js", "branch-helper.cmd"], { cwd });
  run("git", ["commit", "-m", "base"], { cwd });
  run("git", ["branch", "-m", branchName], { cwd, shell: false });
  run("git", ["update-ref", `refs/remotes/origin/${branchName}`, branchName], { cwd, shell: false });
  run("git", ["symbolic-ref", "refs/remotes/origin/HEAD", `refs/remotes/origin/${branchName}`], {
    cwd,
    shell: false
  });
  run("git", ["checkout", "-b", "feature/test"], { cwd });
  fs.writeFileSync(path.join(cwd, "app.js"), "console.log('feature');\n");
  run("git", ["add", "app.js"], { cwd });
  run("git", ["commit", "-m", "feature"], { cwd });

  const target = resolveReviewTarget(cwd, {});
  const context = collectReviewContext(cwd, target);

  assert.equal(target.mode, "branch");
  assert.equal(target.baseRef, branchName);
  assert.match(context.content, /Branch Diff/);
  assert.equal(fs.existsSync(helperOutputPath), false);
});

test("resolveReviewTarget honors explicit base overrides", () => {
  const cwd = makeTempDir();
  initGitRepo(cwd);
  fs.writeFileSync(path.join(cwd, "app.js"), "console.log('v1');\n");
  run("git", ["add", "app.js"], { cwd });
  run("git", ["commit", "-m", "init"], { cwd });
  run("git", ["checkout", "-b", "feature/test"], { cwd });
  fs.writeFileSync(path.join(cwd, "app.js"), "console.log('v2');\n");
  run("git", ["add", "app.js"], { cwd });
  run("git", ["commit", "-m", "change"], { cwd });

  const target = resolveReviewTarget(cwd, { base: "main" });

  assert.equal(target.mode, "branch");
  assert.equal(target.baseRef, "main");
});

test("resolveReviewTarget requires an explicit base when no default branch can be inferred", () => {
  const cwd = makeTempDir();
  initGitRepo(cwd);
  fs.writeFileSync(path.join(cwd, "app.js"), "console.log('v1');\n");
  run("git", ["add", "app.js"], { cwd });
  run("git", ["commit", "-m", "init"], { cwd });
  run("git", ["branch", "-m", "feature-only"], { cwd });

  assert.throws(
    () => resolveReviewTarget(cwd, {}),
    /Unable to detect the repository default branch\. Pass --base <ref> or use --scope working-tree\./
  );
});

test("collectReviewContext keeps inline diffs for tiny adversarial reviews", () => {
  const cwd = makeTempDir();
  initGitRepo(cwd);
  fs.writeFileSync(path.join(cwd, "app.js"), "console.log('v1');\n");
  run("git", ["add", "app.js"], { cwd });
  run("git", ["commit", "-m", "init"], { cwd });
  fs.writeFileSync(path.join(cwd, "app.js"), "console.log('INLINE_MARKER');\n");

  const target = resolveReviewTarget(cwd, {});
  const context = collectReviewContext(cwd, target);

  assert.equal(context.inputMode, "inline-diff");
  assert.equal(context.fileCount, 1);
  assert.deepEqual(context.patchSources, []);
  assert.match(context.content, /INLINE_MARKER/);
});

test("collectReviewContext skips untracked directories in working tree review", () => {
  const cwd = makeTempDir();
  initGitRepo(cwd);
  fs.writeFileSync(path.join(cwd, "app.js"), "console.log('v1');\n");
  run("git", ["add", "app.js"], { cwd });
  run("git", ["commit", "-m", "init"], { cwd });

  const nestedRepoDir = path.join(cwd, ".claude", "worktrees", "agent-test");
  fs.mkdirSync(nestedRepoDir, { recursive: true });
  initGitRepo(nestedRepoDir);

  const target = resolveReviewTarget(cwd, { scope: "working-tree" });
  const context = collectReviewContext(cwd, target);

  assert.match(context.content, /### \.claude\/worktrees\/agent-test\/\n\(skipped: directory\)/);
});

test("collectReviewContext skips broken untracked symlinks instead of crashing", (t) => {
  const cwd = makeTempDir();
  initGitRepo(cwd);
  fs.writeFileSync(path.join(cwd, "app.js"), "console.log('v1');\n");
  run("git", ["add", "app.js"], { cwd });
  run("git", ["commit", "-m", "init"], { cwd });
  try {
    fs.symlinkSync("missing-target", path.join(cwd, "broken-link"));
  } catch (error) {
    // Windows refuses symlink creation without developer mode or elevation.
    if (error.code === "EPERM" || error.code === "EACCES") {
      t.skip("symlink creation is not permitted on this host");
      return;
    }
    throw error;
  }

  const target = resolveReviewTarget(cwd, {});
  const context = collectReviewContext(cwd, target);

  assert.equal(target.mode, "working-tree");
  assert.match(context.content, /### broken-link/);
  assert.match(context.content, /skipped: broken symlink or unreadable file/i);
});

// `git ls-files --others` walks into a linked directory and reports what it finds as an
// ordinary untracked path, so the entry looks like a plain file and only its resolved
// location shows that it belongs to somebody else's tree.
test("untracked content that resolves outside the repository is not read into the review", (t) => {
  const root = makeTempDir();
  const cwd = path.join(root, "repo");
  const outside = path.join(root, "outside");
  fs.mkdirSync(cwd);
  fs.mkdirSync(outside);
  fs.writeFileSync(path.join(outside, "secret.txt"), "SECRET_OUTSIDE_THE_REPO\n");

  initGitRepo(cwd);
  fs.writeFileSync(path.join(cwd, "app.js"), "console.log('v1');\n");
  run("git", ["add", "app.js"], { cwd });
  run("git", ["commit", "-m", "init"], { cwd });

  try {
    // A junction needs no elevation on Windows; elsewhere a directory symlink is the
    // same hazard.
    fs.symlinkSync(outside, path.join(cwd, "linkdir"), "junction");
  } catch (error) {
    if (error.code === "EPERM" || error.code === "EACCES") {
      t.skip("linked directory creation is not permitted on this host");
      return;
    }
    throw error;
  }

  const target = resolveReviewTarget(cwd, { scope: "working-tree" });
  const context = collectReviewContext(cwd, target);

  assert.ok(!context.content.includes("SECRET_OUTSIDE_THE_REPO"), context.content);
  assert.match(context.content, /skipped: resolves outside the repository/);
});

test("describeReviewScope says which uncommitted work a branch review leaves out", () => {
  const cwd = makeTempDir();
  initGitRepo(cwd);
  fs.writeFileSync(path.join(cwd, "app.js"), "console.log('v1');\n");
  run("git", ["add", "app.js"], { cwd });
  run("git", ["commit", "-m", "init"], { cwd });
  run("git", ["checkout", "-b", "feature"], { cwd });
  fs.writeFileSync(path.join(cwd, "app.js"), "console.log('v2');\n");
  run("git", ["commit", "-am", "change"], { cwd });
  fs.writeFileSync(path.join(cwd, "pending.js"), "console.log('uncommitted');\n");

  const target = resolveReviewTarget(cwd, { base: "main" });
  const scope = describeReviewScope(cwd, target);

  assert.equal(target.mode, "branch");
  assert.match(scope, /commits between main and HEAD, requested/);
  assert.match(scope, /1 uncommitted file\(s\) are excluded/);
});

test("describeReviewScope marks an auto-selected working tree review as automatic", () => {
  const cwd = makeTempDir();
  initGitRepo(cwd);
  fs.writeFileSync(path.join(cwd, "app.js"), "console.log('v1');\n");
  run("git", ["add", "app.js"], { cwd });
  run("git", ["commit", "-m", "init"], { cwd });
  fs.writeFileSync(path.join(cwd, "app.js"), "console.log('v2');\n");

  const scope = describeReviewScope(cwd, resolveReviewTarget(cwd, {}));

  assert.match(scope, /uncommitted work, selected automatically/);
  assert.match(scope, /0 staged, 1 unstaged, 0 untracked/);
  assert.match(scope, /Committed history is not reviewed/);
});

test("大型工作區審查分別保留已暫存與未暫存的差異", async () => {
  const cwd = makeTempDir();
  initGitRepo(cwd);
  for (const name of ["a.js", "b.js", "c.js"]) {
    fs.writeFileSync(path.join(cwd, name), `export const value = "${name}-v1";\n`);
  }
  run("git", ["add", "a.js", "b.js", "c.js"], { cwd });
  run("git", ["commit", "-m", "init"], { cwd });
  fs.writeFileSync(path.join(cwd, "a.js"), 'export const value = "STAGED_MARKER";\n');
  run("git", ["add", "a.js"], { cwd });
  fs.writeFileSync(path.join(cwd, "a.js"), 'export const value = "a.js-v1";\n');
  fs.writeFileSync(path.join(cwd, "b.js"), 'export const value = "SELF_COLLECT_MARKER_B";\n');
  fs.writeFileSync(path.join(cwd, "c.js"), 'export const value = "SELF_COLLECT_MARKER_C";\n');

  const target = resolveReviewTarget(cwd, {});
  const context = collectReviewContext(cwd, target);

  assert.equal(context.inputMode, "patch-files");
  assert.equal(context.fileCount, 3);
  assert.doesNotMatch(context.content, /SELF_COLLECT_MARKER_[ABC]/);
  assert.match(context.content, /## Changed Files/);
  const patchPaths = await withReviewPatchFiles(context, path.join(makeTempDir(), "patches"), (patches) => {
    const paths = patches.map((patch) => patch.path);
    assert.deepEqual(paths.map((file) => path.basename(file)), ["staged.patch", "unstaged.patch"]);
    assert.match(fs.readFileSync(paths[0], "utf8"), /^\+.*STAGED_MARKER/m);
    const unstaged = fs.readFileSync(paths[1], "utf8");
    assert.match(unstaged, /^-.*STAGED_MARKER/m);
    assert.match(unstaged, /^\+.*a\.js-v1/m);
    return paths;
  });
  assert.equal(fs.existsSync(path.dirname(patchPaths[0])), false);
});

test("超過 Git 輸出緩衝區的分支差異完整寫入檔案，審查失敗後清理", async () => {
  const cwd = makeTempDir();
  initGitRepo(cwd);
  fs.writeFileSync(path.join(cwd, "app.js"), "export const value = 'v1';\n");
  run("git", ["add", "app.js"], { cwd });
  run("git", ["commit", "-m", "init"], { cwd });
  run("git", ["checkout", "-b", "feature"], { cwd });
  fs.writeFileSync(path.join(cwd, "app.js"), `${"x".repeat(1100 * 1024)}\nEND_MARKER\n`);
  const commit = run("git", ["commit", "-am", "large diff"], { cwd, shell: false });
  assert.equal(commit.status, 0, commit.stderr);

  const target = resolveReviewTarget(cwd, { base: "main" });
  const context = collectReviewContext(cwd, target);

  assert.equal(context.fileCount, 1);
  assert.equal(context.inputMode, "patch-files");
  assert.match(context.inlineRefusalReason, /262144 bytes/);
  assert.doesNotMatch(context.content, /xxx/);
  assert.match(context.content, /## Changed Files/);
  let patchPath;
  await assert.rejects(withReviewPatchFiles(context, path.join(makeTempDir(), "patches"), async ([patch]) => {
    patchPath = patch.path;
    assert.equal(path.basename(patchPath), "branch.patch");
    assert.ok(patch.bytes > 1024 * 1024);
    const contents = fs.readFileSync(patchPath, "utf8");
    assert.match(contents, /^-export const/m);
    assert.ok(contents.endsWith("+END_MARKER\n"));
    throw new Error("審查失敗");
  }), /審查失敗/);
  assert.equal(fs.existsSync(path.dirname(patchPath)), false);
});

test("清理暫存檔失敗時保留已完成的審查結果", async (t) => {
  const warn = t.mock.method(process, "emitWarning", () => {});
  const directory = path.join(makeTempDir(), "patches");
  const unexpected = path.join(directory, "other.txt");
  const context = { inputMode: "patch-files", patchSources: [] };
  const result = await withReviewPatchFiles(context, directory, () => {
    fs.writeFileSync(unexpected, "keep");
    return "completed";
  });

  assert.equal(result, "completed");
  assert.equal(warn.mock.callCount(), 1);
  assert.match(warn.mock.calls[0].arguments[0], /Could not clean up review patches/);
  assert.equal(fs.readFileSync(unexpected, "utf8"), "keep");
  fs.unlinkSync(unexpected);
  removeReviewPatchFiles(directory);
  assert.equal(fs.existsSync(directory), false);
});

test("collectReviewContext keeps untracked file content in lightweight working tree context", () => {
  const cwd = makeTempDir();
  initGitRepo(cwd);
  for (const name of ["a.js", "b.js"]) {
    fs.writeFileSync(path.join(cwd, name), `export const value = "${name}-v1";\n`);
  }
  run("git", ["add", "a.js", "b.js"], { cwd });
  run("git", ["commit", "-m", "init"], { cwd });
  fs.writeFileSync(path.join(cwd, "a.js"), 'export const value = "TRACKED_MARKER_A";\n');
  fs.writeFileSync(path.join(cwd, "b.js"), 'export const value = "TRACKED_MARKER_B";\n');
  fs.writeFileSync(path.join(cwd, "new-risk.js"), 'export const value = "UNTRACKED_RISK_MARKER";\n');

  const target = resolveReviewTarget(cwd, {});
  const context = collectReviewContext(cwd, target);

  assert.equal(context.inputMode, "patch-files");
  assert.equal(context.fileCount, 3);
  assert.doesNotMatch(context.content, /TRACKED_MARKER_[AB]/);
  assert.match(context.content, /## Untracked Files/);
  assert.match(context.content, /UNTRACKED_RISK_MARKER/);
});
