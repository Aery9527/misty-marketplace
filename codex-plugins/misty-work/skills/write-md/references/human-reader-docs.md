# Human Reader Markdown Rules

- Load this file only when the Markdown target audience is human.
- Human-facing documents focus on scannability, navigability, and ease of building a mental model.

## Applicable Contexts

- README, user guide, feature doc, architecture overview, API reference, design proposal, technical docs shared with a team.
- Content goal: help readers quickly understand background, architecture, flow, decisions, or usage.
- Documents live in repos, Wikis, PRs, Notion, or other shared knowledge bases.

## Required Output Spec

- MUST include `## Table of Contents`.
- The table of contents MUST use Markdown links pointing to major sections within the document.
- Default to listing all major `##` sections; when a section is long or complex, MUST divide it into `###` subsections and link to them.
- Each major section MUST end with a back-to-top link; default to `[Back to top](#table-of-contents)`. Follow it with a standalone `---` horizontal rule to separate it from the next section.
- When renaming headings or reordering sections, MUST update the table of contents and back-to-top links to avoid dead links or name mismatches.

## Diagram Guide

- MUST load the [Mermaid guide](mermaid-guide.md) and follow its human-reader requirements and shared diagram rules.

## Typical Structure

```markdown
# {Feature / Module Name}

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Flow](#flow)
- [Core Components](#core-components)
- [Notes](#notes)

## Overview

- Purpose.
- Scope.
- Key design decisions.

[Back to top](#table-of-contents)

---

## Architecture

[Architecture diagram]

[Back to top](#table-of-contents)

---

## Flow

[Flow diagram]

[Back to top](#table-of-contents)

---

## Core Components

- {Component}: {Description}.

[Back to top](#table-of-contents)

---

## Notes

- Edge cases.
- Design constraints.
- Unresolved issues.

[Back to top](#table-of-contents)
```

- Omit inapplicable sections; add domain-specific sections as needed.
