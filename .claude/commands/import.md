---
description: Preview and import mapped Spydus CSV reports
---

# Preview and import mapped Spydus CSV reports

Run from the repository root:

```text
npm run library -- import spydus <folder> --mapping=<mapping-file> --batch=<batch-name> --actor=<operator> --dry-run
```

Read docs/replace-spydus.md first. Run the preview and reconcile counts and field choices. Only repeat without --dry-run when the operator has asked to import that reviewed batch. Never invent an identifier or silently discard a row.

Use --json when comparing records programmatically. Read docs/cli.md for dates, quoting and operating limits.
