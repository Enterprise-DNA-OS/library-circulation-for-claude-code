---
description: Prepare Monday review from overdues, holds and compliance
---

# Prepare Monday review from overdues, holds and compliance

Run from the repository root:

```text
npm run library -- weekly-review
```

The command reads overdues, holds and compliance. Summarise overdue titles with demand first, then collection deadlines, then privacy evidence gaps. Cite the relevant copy or borrower code. No message is sent.

Use --json when comparing records programmatically. Read docs/cli.md for dates, quoting and operating limits.
