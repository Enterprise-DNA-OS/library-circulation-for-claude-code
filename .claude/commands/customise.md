---
description: Add a field or change a lending rule
---

# Make the library yours

Read CLAUDE.md and the existing migrations. Clarify the requested field, allowed values, default and which existing records it affects. For a branch rule change, show its effect on future checkout, renewal and collection dates. Existing due dates remain unchanged unless the operator explicitly requests a separate migration.

Back up with npm run library -- export. Write a new numbered migration under supabase/migrations. Extend the existing CLI and command recipe. Never edit an applied migration. Exercise the changed rule and refused cases on a disposable database with npm test. Apply with npm run migrate to the operator-selected database. Read back the field or rule and show proof. Never reset, seed or delete live records.
