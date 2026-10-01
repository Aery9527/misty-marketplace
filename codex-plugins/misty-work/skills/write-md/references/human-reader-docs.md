# Human Reader Markdown Rules

- Load this file only when the Markdown target audience is human.
- Human-facing documents focus on scannability, navigability, and ease of building a mental model.

## Applicable Contexts

- README, user guide, feature doc, architecture overview, API reference, design proposal, technical docs shared with a team.
- Content goal: help readers quickly understand background, architecture, flow, decisions, or usage.
- Documents live in repos, Wikis, PRs, Notion, or other shared knowledge bases.

## Required Output Spec

- MUST include `## Quick Navigation` or `## Table of Contents`.
- Quick Navigation MUST use Markdown links pointing to major sections within the document.
- Default to listing all major `##` sections; for long or complex documents, extend to important `###` sections.
- Each major section MUST end with a back-to-top link; default to `[Back to top](#quick-navigation)`.
- If the document uses `## Table of Contents` instead of `## Quick Navigation`, use `[Back to top](#table-of-contents)`.
- Each major section MUST be separated from the next section by a standalone `---` horizontal rule.
- By default, place `---` after the section's back-to-top link and before the next heading.
- When renaming headings or reordering sections, MUST update Quick Navigation and back-to-top links to avoid dead links or name mismatches.

## Normative Wording in Human Prose

- When a human-reader document written in Traditional Chinese needs strict requirement wording, MUST use `必須`.
- When a human-reader document written in Traditional Chinese needs strict prohibition wording, MUST use `嚴禁`.

## Diagram Guide

- MUST load the [Mermaid guide](mermaid-guide.md) and follow its human-reader requirements and shared diagram rules.

## Typical Structure

```markdown
# {Feature / Module Name}

## Quick Navigation

- [Overview](#overview)
- [Architecture](#architecture)
- [Flow](#flow)
- [Core Components](#core-components)
- [Notes](#notes)

## Overview

- Purpose.
- Scope.
- Key design decisions.

[Back to top](#quick-navigation)

---

## Architecture

[Architecture diagram]

[Back to top](#quick-navigation)

---

## Flow

[Flow diagram]

[Back to top](#quick-navigation)

---

## Core Components

- {Component}: {Description}.

[Back to top](#quick-navigation)

---

## Notes

- Edge cases.
- Design constraints.
- Unresolved issues.

[Back to top](#quick-navigation)
```

- Omit inapplicable sections; add domain-specific sections as needed.
