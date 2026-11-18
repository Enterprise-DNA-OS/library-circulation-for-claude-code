# Library Circulation for Claude Code

A staffed physical-library lending desk. The fictional Harbour Library seed is for demonstrations only. Read current records before answering.

## Routes

| Command | Job |
|---|---|
| /branches | Read the lending and pickup rules at each branch |
| /catalogue | Find copies, locations and availability |
| /borrowers | Review membership status and expiry |
| /loans | Read current and returned loans |
| /overdues | Review overdue copies in oldest-first order |
| /holds | Read waiting and ready holds in queue order |
| /pull-list | Find copies for the first waiting hold on each title |
| /collection-review | Review copy usage and waiting demand |
| /compliance | Check borrower purpose, review date and supporting evidence |
| /attention | Review overdue loans, expired pickups and privacy gaps |
| /imports | Reconcile import batches and record counts |
| /audit | Read the operator action trail |
| /history | Read a copy and its lending, note and action history |
| /insights | Answer ten joined circulation questions |
| /weekly-review | Prepare Monday review from overdues, holds and compliance |
| /add-branch | Add a branch with its lending rules |
| /add-title | Add a bibliographic title |
| /add-copy | Accession a physical copy at a branch |
| /add-borrower | Register a borrower with purpose and review evidence |
| /borrower-status | Record a membership status decision |
| /review-privacy | Record a reviewed purpose, date and evidence |
| /checkout | Lend an eligible copy to an eligible borrower |
| /return | Record a copy returned at its current branch |
| /renew | Extend an open loan when rules and other holds permit |
| /hold | Join the title hold queue for a pickup branch |
| /ready-hold | Allocate a local copy to the first waiting borrower |
| /cancel-hold | Release a waiting or ready hold with a reason |
| /move-copy | Record a completed physical transfer between branches |
| /copy-condition | Record repair, withdrawal or return to circulation |
| /log | Record an operational note about a copy |
| /import | Preview and import mapped Spydus CSV reports |
| /export | Write a complete structured database export |
| /draft-overdues | Write a private overdue review draft without sending |
| /customise | Change a field or lending rule |
| /new-view | Add a private read-only report |

## Working rules

- Read docs/cli.md before writes and docs/replace-spydus.md before imports. Quote values containing spaces.
- Use the one CLI. Never guess a copy, borrower or title. Ambiguous names list candidates and exit with failure.
- Every write records an operator label. This is a trusted operator workspace, not an authenticated multi-user service.
- Never send, charge money, publish, delete records or contact Spydus from this base. Drafts stay in drafts/. Reports stay in views/ and docs-out/.
- Dates are UTC calendar days. Lending and pickup periods are local business policy, never statutory claims.
- A return records the current holding branch. Use move-copy after physical receipt at another branch. Do not claim to track a van or an item in transit.
- DATABASE_URL selects PostgreSQL. Otherwise DATA_DIR selects PGlite. Never run seed against real records. Tests and demo isolate their data and ignore DATABASE_URL.
- Back up with export before changes. Add a numbered migration rather than editing one already applied.
- Borrower details and reading histories are private. Review purpose and retention. Do not collect addresses, emails or dates of birth by default.

Omni by Enterprise DNA installs and runs custom versions: https://enterprisedna.co/omni/book?offer=replace-software&utm_campaign=spydus&utm_medium=github
