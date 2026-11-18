---
description: Add a branch with its lending rules
---

# Add a branch with its lending rules

Run from the repository root:

```text
npm run library -- add-branch <code> <name> [--loan-days=21 --max-loans=5 --max-renewals=2 --pickup-days=7] --actor=<operator>
```

Read the affected records first. Use the operator’s stated actor label. It is an audit label, not authenticated identity. If a name is ambiguous, list the candidates and ask which one. Report the recorded outcome and any refusal.

Use --json when comparing records programmatically. Read docs/cli.md for dates, quoting and operating limits.
