---
description: Accession a physical copy at a branch
---

# Accession a physical copy at a branch

Run from the repository root:

```text
npm run library -- add-copy <barcode> <title> <branch> [--acquired=YYYY-MM-DD] --actor=<operator>
```

Read the affected records first. Use the operator’s stated actor label. It is an audit label, not authenticated identity. If a name is ambiguous, list the candidates and ask which one. Report the recorded outcome and any refusal.

Use --json when comparing records programmatically. Read docs/cli.md for dates, quoting and operating limits.
