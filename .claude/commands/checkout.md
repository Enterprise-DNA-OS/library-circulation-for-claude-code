---
description: Lend an eligible copy to an eligible borrower
---

# Lend an eligible copy to an eligible borrower

Run from the repository root:

```text
npm run library -- checkout <copy> <borrower> --actor=<operator>
```

Read the affected records first. Use the operator’s stated actor label. It is an audit label, not authenticated identity. If a name is ambiguous, list the candidates and ask which one. Report the recorded outcome and any refusal.

Use --json when comparing records programmatically. Read docs/cli.md for dates, quoting and operating limits.
