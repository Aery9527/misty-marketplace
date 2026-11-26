---
name: code-mereology
description: >-
  Use for feature development that starts from design — creating or revising a
  design document, splitting a feature into modules, defining SBE, driving code
  through TDD, measuring a finished feature's performance, or capturing and
  reviewing deferred work in sd-*-plan.md. Also load before modifying existing
  code in a repository under development, so the change is checked against the
  design document that covers it. Routes each task to one of four phase
  references.
---

# Code Mereology

Design documents define module boundaries and behavior; implementation detail
lives in code alone. A confirmed design document becomes concrete SBE examples,
those examples are written as failing tests, and those tests drive the code.
The tests are the only home of the specification — it MUST NOT be duplicated
into a document. An `sd-*-plan.md` file is a disposable record of intended
future work, not another specification source.

## Phase Routing

- A request only to capture or review deferred plans does not enter a phase. Follow [Deferred Change Plans](#deferred-change-plans) and MUST NOT load a phase reference.
- When the user chooses to execute a deferred-change entry, treat only that entry as the feature request and match the phase rules below. The entry MUST NOT bypass a design or test confirmation gate.
- If the task creates or revises a design document, or splits a feature into modules, load [Phase 1 — Modular Design](references/phase1-design.md).
- If a confirmed leaf design document exists and the task defines concrete input/output examples, hunts edge cases, or renders them as failing tests, load [Phase 2 — SBE As Failing Tests](references/phase2-sbe.md).
- If a confirmed set of failing tests exists and the task implements against it, load [Phase 3 — Implementation](references/phase3-tdd.md).
- If a feature is already implemented and the task measures throughput, latency, or resource cost, load [Phase 4 — Performance Verification](references/phase4-benchmark.md).
- Otherwise the task is a feature or module change with no confirmed artifact yet to build on, so load [Phase 1 — Modular Design](references/phase1-design.md). Match the four bullets above first; this one only catches what none of them did.
- Each of the four phases is independently loadable. MUST load only the phase the current task needs, and MUST NOT load a phase reference it does not.
- The five phase bullets above are the only phase-reference load decision, and they MUST be matched in order. Every reference states the artifacts it produces, and the phases that depend on earlier output also state the state they must verify before starting, so any single phase is executable from a cold load.

## Document Model

Documentation descends through two layers: a topic layer describing the assembled whole, and a module layer describing the components it is assembled from.

- `bd-<topic-name>.md` — the assembly document, living in the `docs/` at a scope root — the repository root, or a submodule root in a monorepo. Its subject is what the assembled whole does: a business requirement, an architectural account, an end-to-end data flow. Its Mermaid diagram MUST show structural roles and the rules governing their relationships. Its header `parts` MUST identify the concrete nodes one level below it. See the [assembly writing rules](references/phase1-design.md#writing-rules--assembly-document). It carries no line limit, and MUST NOT sink into behavior a design document below it already owns.
- `sd-<feature-name>.md` — the design document. Its subject is one module — a component the assembly is built from. MUST live in the folder that holds the corresponding code, and MUST NOT be collected under `docs/`. `<feature-name>` MUST NOT end in `-perf` or `-plan`, which separates a design document from the temporary records beside it.
- `sd-<feature-name>-plan.md` — a temporary deferred-change plan beside the existing `sd-<feature-name>.md`. It describes work expected to happen later, is not a specification or graph node, and MAY remain unlinked from every other document. Discovery comes from the plan search, not graph traversal. It carries no line limit, because that limit measures the cognitive load of a design and a plan is deferred intent, not a design.
- `sd-<feature-name>-perf.md` — the performance record Phase 4 writes beside the code it measured. It records what was measured once, not how the system is put together, so it is not part of the graph below and no phase walks into it. It carries no line limit, because that limit measures the cognitive load of a design and this is a record of what was measured.
- The two layers answer different questions: `bd-*.md` answers what the system delivers and how the pieces combine to deliver it; `sd-*.md` answers what one piece does and where its boundary lies. A reader enters through a topic and descends into components.

Inside the module layer, `sd-*.md` may itself form a tree, and each node carries one of two roles:

- Overview role — describes an abstract concept and links to its sub-modules' design documents. MUST NOT be the input of Phase 2.
- Leaf role — describes one module's own behavior and links to the target code. Only a leaf is a valid input of Phase 2.

A module that is already implemented and has no design document MAY enter as a partial leaf when something new depends on it. It describes only the capabilities needed so far. Partial is a property of a leaf. It MUST carry the `code-mereology-partial` marker listing covered capabilities. Phase 2 MUST NOT use it for an excluded capability. When removing the marker or promoting the document to overview, connect it to an appropriate assembly along `parts` in the same Phase 1. If no appropriate assembly exists, confirm a new one scoped to the conversion with the user. See [Partial Leaf](references/phase1-design.md#partial-leaf).

### Document Relationships

- `parts` identifies what makes up a document's subject.
    - A repository-root assembly for a cross-submodule topic links to the participating submodule assemblies. It reaches their modules through those assemblies. A submodule assembly MUST keep responsibility within its own scope.
    - An assembly links to participating module documents in its own scope. An overview links to its child module documents.
    - A leaf keeps interface links to its code in the body. Those links stay outside the document graph.
- `depends` identifies what the subject needs from elsewhere.
    - A leaf may depend on another leaf across scopes. Partial leaves can receive dependencies and MUST keep their own `parts` and `depends` empty. A module document with `parts` MUST NOT declare or receive a dependency.
    - Assembly dependencies express outcomes delivered by another topic. Root assemblies may depend on other root assemblies. Submodule assemblies may depend on other submodule assemblies across directories. MUST NOT join root and submodule assemblies with `depends`.
- Each ordinary `sd-*.md` MUST be reachable along `parts` from an assembly. Each partial leaf MUST have an incoming `parts` or `depends` from another document. Planned edges do not establish reachability. A `parts` cycle is an error. The user decides whether to keep a dependency cycle in Phase 1.
- Phase 1 verifies document roles and assembly abstraction levels. The script verifies file kinds at both ends of a dependency and rejects dependencies involving module documents with `parts`.

### Header and Tags

- Start with a `# ` heading, optionally after frontmatter and blank lines. Before the first `## ` heading or end of file, include only blank lines, an optional partial marker immediately beneath H1, and the header. The header MUST contain `parts`, `depends`, and `tags` exactly once in that order. Leave unused values empty.
- Each `parts` or `depends` item MUST contain one Markdown inline link and a one-line reason after `: `, without tabs. Describe the target's role for `parts` or the capability or outcome needed for `depends`. For a missing planned document, put `(planned)` between the link and the colon. Remove it when the file exists.
- A relation link MUST be on one line and have no title. Its label MUST NOT contain square brackets; its destination MUST NOT contain whitespace or parentheses.
- Link labels MUST be unique within the header. Declare each source/kind/target relationship once. Use exact-case, forward-slash document paths relative to the source. Targets MUST stay within the scan. MUST NOT use absolute paths, query strings, or fragments.
- Links to another design or assembly document in the repository MUST use its file path in the header. MUST NOT link to that file or one of its fragments from the body. In the body, mention the document as `*label*` using the exact link label. Reserve italics for these mentions and use bold for other emphasis. MUST NOT use underscore emphasis or combine a label with bold. Code links, local headings, external links, and `-plan` or `-perf` links may stay in the body.
- Write declared tags as comma-separated inline code on the `tags` line. A document inherits its ancestors' declared tags through `parts` and takes the union across parents. Declare each tag at the highest applicable node. MUST NOT redeclare inherited tags. `depends` and planned edges do not carry tags.
- Use one `docs/code-mereology.json` at the repository root, including in a monorepo. The optional `tags` object maps names to descriptions. Names use one to three lowercase alphanumeric segments joined by hyphens. Every declared tag MUST be in the table, and each listed tag MUST be declared by at least one scanned document. The optional `exclude` array lists existing directories relative to the root, using exact case and forward slashes. The script skips each directory and its subtree. An absent config supplies an empty table and exclusion list.
- Use only `tags` and `exclude` as configuration keys. An exclusion MUST NOT contain `..` or traverse a directory link. The scan also skips version-control directories, `.worktree`, and directory links.

```text
# Topic

- `parts`:
    - [Module](../module/sd-module.md): Delivers the topic's module capability
- `depends`:
- `tags`: `backend`
```

### Query and Adoption

```text
node <skill-root>/scripts/list-relations.mjs [-a <document> [-f <relations>] [-d <depth>]] [-t <tag>] <repository-root>
```

- Resolve the script from the loaded skill directory. Explicitly pass the full repository's root for workflow queries. Resolve `-a` document paths from the current directory. `-f` combines `p` parents, `c` children, `d` dependencies, and `u` dependents. The default is `pcdu`. `-d` takes a positive depth, defaults to `1`, and accepts `a` for unlimited depth.
- `-t` lists candidate documents by effective tag. Use `-a` on a candidate to see its relations. With neither option, the script lists all declared relations and tags. MUST NOT combine `-a` and `-t`.
- Output is TSV. Edge rows contain source, `parts` or `depends`, target, reason, and optional `planned`. Reverse queries retain the original source and target. Tag rows contain document, `tag`, name, and optional `inherited`.
- The script validates all documents in the scan, including when a query is given. File or configuration errors return `1`. Invalid arguments return `2`. A successful validation returns `0`.
- Adopt this workflow only after [list-relations.mjs](scripts/list-relations.mjs) passes a no-option check against the actual repository root. If headers are missing, stop and report the files for the user's migration decision. Retry after migration. Generated copies that duplicate sources MUST be excluded.
- Every impact query requires exit `0` before treating stdout as the complete result. On nonzero, use stdout for diagnostics only. Fix errors caused by the current edits and retry. Stop and report errors outside the task and pre-existing errors found outside a phase. Within Phase 1, fix in-scope errors through the normal gates. In Phase 3, return pre-existing graph errors in scope to Phase 1. The Phase 3 rule for correcting an existing partial leaf's contract still applies.

## Deferred Change Plans

- Create `sd-<feature-name>-plan.md` beside an existing `sd-<feature-name>.md` only when the user wants to record a module change for later execution. Removing the `-plan` suffix MUST yield that companion design document's basename.
- A `sd-<feature-name>-plan.md` file MAY hold more than one deferred-change entry. A delivered design document keeps attracting change requests over time, and each MAY be recorded before its turn to execute arrives. Separate entries with a blank line, a `---` line on its own, then another blank line — the surrounding blank lines MUST both be present, because a `---` line directly under a paragraph is read as a heading underline rather than a separator. The file MUST NOT open with a `---` line, which at the top of a file reads as a frontmatter delimiter instead. Entries MUST be appended in the order they were recorded, and each MUST be self-contained: nothing in it depends on reading another entry in the same file.
- Each entry MUST open with the reason it exists — the requirement or observation that made the change necessary — before the delta itself. That reason is what lets a later reader judge whether the entry is still worth executing once the situation that prompted it has faded from memory. Beyond the reason, an entry MUST contain only the intended future delta and the execution, migration, or verification notes needed to resume it. It MUST NOT present proposed behavior as current fact or as confirmed specification. Phase 1 MUST revalidate the proposed behavior, and Phase 2 MUST revalidate any concrete examples.
- A plan file MAY remain unlinked from every document. Assembly and design documents MUST NOT add a structural edge to it merely for discoverability; the plan file MAY link outward to the current design or code for context.
- A deferred-change entry MAY remain deferred for any length of time. To review outstanding plans, run [list-plans.mjs](scripts/list-plans.mjs) against the repository root, then read each reported file and summarize the work that remains in every entry it holds.
- Whenever a phase selects or walks an `sd-<feature-name>.md`, derive the sibling `sd-<feature-name>-plan.md` path and read it if it exists. This filename lookup preserves cold-load discovery without adding the plan file to the document graph.
- When the user chooses one entry to execute, treat only that entry as the feature request; the file's other entries stay deferred. Phase 1 MUST first update and confirm the companion design document. Keep the entry while Phase 2 freezes the SBE in failing tests and Phase 3 implements it. The entry carries intent across a pause but never replaces an artifact required by those phases.
- After one entry's work is delivered and the required tests are green, verify the companion `sd-<feature-name>.md` and every affected assembly, parent, or dependent document describe the delivered behavior. Delete that entry in the same change once verified, keeping exactly one blank-line/`---`/blank-line separator between each pair of entries that remain adjacent afterward. Delete the whole file only once no entry remains. MUST NOT delete an unfinished entry; an absent file means no deferred work remains for that design document.
- The `-plan.md` suffix and the `(planned)` link marker are unrelated. [list-plans.mjs](scripts/list-plans.mjs) discovers deferred-change files; [list-planned.mjs](scripts/list-planned.mjs) discovers unresolved targets promised inside design documents.

Two entries in one `sd-<feature-name>-plan.md` file look like this:

```markdown
Why: <the requirement or observation that made this entry necessary>

<the intended delta, plus any execution, migration, or verification notes>

---

Why: <the reason the next entry exists>

<its own delta and notes>
```

Run the search script from its installed skill root rather than assuming a fixed installation path:

```bash
node <skill-root>/scripts/list-plans.mjs <repository-root>
```

## Cross-Phase Rules

- A design document MUST NOT contain code. Interfaces and data views MUST be expressed as Markdown links to the target code, because duplicated detail drifts away from the code it describes.
- A design document MUST describe behavior and caveats. It MUST NOT duplicate algorithms, control flow, or field-level structure, and MAY name one current implementation only when that choice materially defines the module boundary, the observable behavior, or a compatibility contract.
- Wherever a document can show a relationship, a data flow, or a state transition as a diagram, it MUST use Mermaid.
- Mermaid blocks MUST use exactly three backticks and the lower-case `mermaid` info string, with no extra fence attributes, and MUST start in column one. Four-backtick fences, tilde fences, and diagrams indented inside a list item or blockquote MUST NOT be used, because the line count depends on that canonical form.
- One design document MUST NOT exceed 300 counted lines; a `-perf` record and a `-plan` file are exempt. Counted lines = total file lines minus every line inside a `mermaid` fenced block, fence lines included.
- Exceeding 300 counted lines means the module carries too much cognitive load. Splitting into sub-modules is the only permitted response. Deleting caveats, compressing prose, or moving text into Mermaid to lower the count MUST NOT be done.
- A link whose target does not exist yet MUST carry the marker `(planned)` immediately after it, and MUST lose that marker once the target exists. It MUST be a single-line inline link carrying no title, whose label holds no bracket and whose destination holds no space or parenthesis. Reference-style links and images MUST NOT be used for it. The planned-link shape MUST NOT appear anywhere it is not a genuine promise — not as an inline-code example, not inside a diagram — because the tooling reads shape alone, and a promise it cannot see reads as a promise already kept. The marker is what lets a reader tell a promise from a fact, and what lets the phase responsible for clearing it find every one by search.
    - For destination matching, whitespace means Unicode `White_Space` plus `U+001C` through `U+001F`. `U+FEFF` within a destination is part of the path.
- The user confirms each `bd-*.md` before the agent descends into its modules, confirms each `sd-*.md` level before descending to its children, and confirms the failing tests carrying the frozen SBE before any implementation is written. MUST NOT skip a gate.
- Phase 2 and Phase 3 run once per leaf, not once per tree. When Phase 1 leaves several leaves open, the user chooses which one to take next.
- Heading wording is the project's to choose, but MUST stay consistent across its documents: reuse the headings an existing document of the same kind already uses.
- Every design document this skill produces is written for a human reader. Present as much of it as possible visually in Mermaid, so the reader carries less load.

## Code Changed Outside A Phase

Not every code change arrives through a phase. When one does not, the documents
still MUST NOT be left describing something the code no longer does.

- Before changing existing code, look for an `sd-*.md` in its folder. Where the change reaches past the module, run `-a <document> -f pu <repository-root>` and use each relation's reason to select affected documents. Follow [Query and Adoption](#query-and-adoption) on failure.
- After the change, check each one found against what the code now does, and correct every statement that has stopped being true.
- Where the change moved the module boundary or altered behavior a caller can observe, correcting the prose is not enough — that is a design change, so return to Phase 1 rather than quietly reshaping the document to fit what was just written.
