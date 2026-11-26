# /claude-adversarial-review

Run a Claude Code review that challenges the implementation approach and the
design choices behind it, and return its report unchanged.

This is not a stricter pass over implementation defects. It asks whether the
current approach is the right one, what assumptions it depends on, and where the
design fails under real-world conditions.

Codex command files carry no frontmatter, so the argument list and the tool
constraints live here as instructions rather than as declared metadata.

## Arguments

- `--help`, `-h` — exact standalone arguments after tokenization, before `--`,
  display this subcommand's usage without checking Claude or starting a job.
- `--` — stop interpreting options. To include literal help flags in the focus,
  use `/claude-adversarial-review -- check -h handling`.
- `--base <ref>` — review the commits between `<ref>` and `HEAD`.
- `--scope auto|working-tree|branch` — choose the review target. `auto` is the
  default: it reviews the working tree when it is dirty, otherwise the branch.
- `--model <model>` — run the review on a specific model.
- `--background` — queue the review in a detached process and return at once
  with its job id. Without it the review runs in the foreground.
- `--wait` — state the foreground explicitly. It is the default, so this only
  makes the choice visible; it cannot be combined with `--background`.
- `--json` — return the raw payload instead of rendered Markdown.
- `--cwd <path>` — review a repository other than the current directory.
- After bridge options are removed, the remaining words are the user's focus,
  preserved in order and rejoined with single spaces. Grouping double quotes
  and runs of whitespace between arguments are not retained. A single forwarded
  string is tokenized; multiple argv elements retain their grouping.

## Workflow

1. Run the companion, forwarding the user's arguments unchanged:

   ```bash
   node "${PLUGIN_ROOT}/scripts/claude-companion.mjs" adversarial-review <arguments>
   ```

2. Return the command's stdout verbatim. Do not paraphrase it, do not summarise
   it, and do not add commentary before or after it.
3. Do not run any other command in the same turn.

## Rules

- This command is review-only. MUST NOT fix anything it reports, MUST NOT apply
  a patch, and MUST NOT offer to start making changes in the same turn.
- MUST NOT soften the adversarial framing and MUST NOT rewrite the user's focus
  text. Preserve its words after bridge option parsing, subject to the
  tokenization described above. MUST NOT promise byte-for-byte forwarding.
- Without `--background` the review runs in the foreground and the command
  returns when it is finished. MUST NOT claim such a review is running in the
  background.
- With `--background` the command returns a queued report: a job id and the
  target that was resolved, with no findings and no `Scope` or `Evidence` line,
  because nothing has been reviewed yet. MUST print that report as it is and
  MUST NOT invent a result, wait for one, or poll in the same turn. The report
  names the commands that collect it later.
- A foreground review whose Claude turn came back an error still prints a report
  explaining the failure, and the command exits non-zero. MUST print that report
  rather than reporting only that a command failed. A run that never reached a
  turn at all — Claude missing, or its session ending before it answered — has no
  report to print: it fails with the reason on stderr and prints nothing, and MUST
  be passed on as the reason it gives. A background review reports nothing about
  its outcome here: the queued report is printed and the command succeeds however
  the run later ends, so MUST NOT read that success as the review having passed.
- The `Scope` line states what was reviewed, and the `Evidence` line states what
  Claude was actually given. Both describe what this command collected, which is
  what makes them usable — but collection is a sequence of git reads, so a tree
  edited while it runs can leave them describing it in parts. MUST repeat them
  rather than restating the result as covering anything wider.
- If either the file count or the diff size exceeds its inline limit, the
  bridge supplies any captured tracked diff in temporary patch files. Claude
  receives access to the job's patch directory for the review turn. Working
  tree reviews use separate patches for staged and unstaged changes.
- The `Evidence` line reports how the bridge provided the tracked diff and
  identifies any untracked entries it left out. For patch files it reports what
  was available to read. MUST preserve the reviewer's stated coverage limits.
- The review session registers only `Read`, `Glob` and `Grep`, with no shell and
  no MCP server, so it cannot modify the repository.
- If the review returns no valid structured output, return the failure as
  printed. MUST NOT invent findings to fill the gap.
