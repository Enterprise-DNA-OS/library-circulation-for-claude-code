# Library Circulation for Claude Code

Run the staffed lending desk in a database you own: catalogue copies, check loans, allocate holds and prepare overdue notices. This is a working base for the physical circulation part of Spydus.

## Three ways to use it

**Do it yourself.** Free, open source under MIT. Open the folder in Claude Code, Codex, OpenCode or Cursor and use the commands below.

**We customise it.** Enterprise DNA maps your Spydus records and builds your rules, documents and connections. Your version can include a web front end or a different stack. One setup fee, then a retainer.

**We run it for you.** Omni by Enterprise DNA installs, connects and operates your version. One setup fee, then a monthly retainer. [Book a 30-minute call](https://enterprisedna.co/omni/book?offer=replace-software&utm_campaign=spydus&utm_medium=github).

An Australian council’s [13 July 2022 procurement agenda](https://www.fremantle.wa.gov.au/wp-content/uploads/2025/04/Agenda-FPOL-Committee-13-July-2022.pdf), pages 6-7, proposed A$60,000 a year excluding GST for Spydus licensing, maintenance and support. That is historical procurement evidence, not a current quote or a typical small-library bill. Civica’s current product page gives no public subscription figure.

## Quick start

Node 22 or newer on Linux, Windows or macOS.

```bash
npm install
npm test
npm run demo
```

The demo creates its own temporary database and prints the private report folder. It ignores DATABASE_URL. For a persistent fictional workspace, run npm run migrate, npm run seed, then npm run library -- weekly-review. For real records, migrate only. DATA_DIR selects embedded PGlite; DATABASE_URL selects PostgreSQL. TLS certificates are verified for remote databases.

## What ships

35 slash commands, three printable dashboards, and three document types: draft overdue notices, hold collection slips and branch circulation reviews. Edit brand.json for your organisation name, logo and colours. Read [CLI reference](docs/cli.md), [compliance checks](docs/compliance.md) and [screen boundaries](docs/why-no-front-end.md).

The database holds branches, titles, copies, borrowers, loans, holds, copy notes, import batches and operator actions. One open loan per copy and one ready hold per copy are enforced. Checked-out or reserved copies cannot be moved or withdrawn. Holds keep their order. Failed operations and failed imports roll back completely.

## Bring your records across

```bash
npm run library -- import spydus ./imports/cutover --mapping=./imports/field-map.json --batch=cutover --actor="Librarian" --dry-run
```

Preview and reconcile the selected reports, then repeat without --dry-run. This is one import command after the export fields and branch codes are agreed. The [switch guide](docs/replace-spydus.md) explains the five reports, mapping and limits. No customer export was available: included examples are synthetic mapping fixtures, not a claimed universal Spydus layout.

## Ten questions to ask today

Run npm run library -- insights. These ten joins work now. Spydus also has configurable reports; this is not a claim that its reporting cannot answer them.

1. Which overdue copies also have readers waiting for the title?
2. Which waiting holds can be filled from a different branch?
3. Which ready holds have passed their collection deadline?
4. Which borrowers with overdue loans also need a privacy review?
5. Which circulating copies have never been borrowed?
6. Which copies have not been borrowed for at least 90 days?
7. Which titles have more waiting holds than available copies?
8. Which copies needing repair belong to titles with waiting holds?
9. Which active loans belong to expired or suspended borrowers?
10. Which branches hold available copies of titles with overdue loans?

## Your first hour: ten things to ask for

1. Show overdue copies that another reader is waiting for.
2. Prepare the branch pull list.
3. Read a copy’s loan and note history.
4. Check whether a borrower is eligible before checkout.
5. Record a returned copy and review the hold queue.
6. Draft overdue notices without sending them.
7. Explain an expired collection deadline.
8. Preview an export and compare its record counts.
9. Put our name and logo on the branch review.
10. Add our collection category with /customise and report it with /new-view.

## Commands

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

## Operating scope

The free base handles staff-operated physical lending. Public catalogue discovery, self-service, RFID, ebook providers, fines, payments, acquisition ordering, serial subscriptions and MARC round-tripping need separate systems or agreed custom work. Keep those services running until their replacement connections have been tested.

Borrower details and reading histories need protection. This is a trusted local operator workspace; actor labels are not authentication. Row security is enabled and public grants are removed, but hosted authentication and least-privilege roles must be configured for shared use. Review retention, backups and access before real use. Privacy checks prompt review and do not certify compliance.

Tests cover valid and refused lending transitions, hold order, import replay and rollback, privacy reviews, complete exports, drafts and escaped HTML. The workflow checks Windows, Linux and PostgreSQL 16. See the workflow result for execution evidence.

MIT. Copyright (c) 2026 Enterprise DNA. Not affiliated with Civica.
