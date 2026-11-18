---
description: Extend an open loan when rules and other holds permit
---

# Extend an open loan when rules and other holds permit

Run from the repository root:

```text
npm run library -- renew <copy> --actor=<operator>
```

Read the affected records first. Use the operator’s stated actor label. It is an audit label, not authenticated identity. If a name is ambiguous, list the candidates and ask which one. Report the recorded outcome and any refusal.

Use --json when comparing records programmatically. Read docs/cli.md for dates, quoting and operating limits.
