# CLI reference

Node 22 or later. Run from the repository root. All commands accept --json. Flags use --name=value. Quote the entire value when it contains spaces. Unknown flags and repeated flags fail.

## branches

Read the lending and pickup rules at each branch.

```text
npm run library -- branches
```

## catalogue

Find copies, locations and availability.

```text
npm run library -- catalogue
```

## borrowers

Review membership status and expiry.

```text
npm run library -- borrowers
```

## loans

Read current and returned loans.

```text
npm run library -- loans
```

## overdues

Review overdue copies in oldest-first order.

```text
npm run library -- overdues
```

## holds

Read waiting and ready holds in queue order.

```text
npm run library -- holds
```

## pull-list

Find copies for the first waiting hold on each title.

```text
npm run library -- pull-list
```

## collection-review

Review copy usage and waiting demand.

```text
npm run library -- collection-review
```

## compliance

Check borrower purpose, review date and supporting evidence.

```text
npm run library -- compliance
```

## attention

Review overdue loans, expired pickups and privacy gaps.

```text
npm run library -- attention
```

## imports

Reconcile import batches and record counts.

```text
npm run library -- imports
```

## audit

Read the operator action trail.

```text
npm run library -- audit
```

## history

Read a copy and its lending, note and action history.

```text
npm run library -- history <copy>
```

## insights

Answer ten joined circulation questions.

```text
npm run library -- insights
```

## weekly-review

Prepare Monday review from overdues, holds and compliance.

```text
npm run library -- weekly-review
```

## add-branch

Add a branch with its lending rules.

```text
npm run library -- add-branch <code> <name> [--loan-days=21 --max-loans=5 --max-renewals=2 --pickup-days=7] --actor=<operator>
```

## add-title

Add a bibliographic title.

```text
npm run library -- add-title <code> <name> [--author=<author> --isbn=<isbn>] --actor=<operator>
```

## add-copy

Accession a physical copy at a branch.

```text
npm run library -- add-copy <barcode> <title> <branch> [--acquired=YYYY-MM-DD] --actor=<operator>
```

## add-borrower

Register a borrower with purpose and review evidence.

```text
npm run library -- add-borrower <code> <name> --expires=YYYY-MM-DD --purpose=<purpose> --review=YYYY-MM-DD --evidence=<reference> --actor=<operator>
```

## borrower-status

Record a membership status decision.

```text
npm run library -- borrower-status <borrower> <active|suspended|closed> --reason=<reason> --actor=<operator>
```

## review-privacy

Record a reviewed purpose, date and evidence.

```text
npm run library -- review-privacy <borrower> --purpose=<purpose> --review=YYYY-MM-DD --evidence=<reference> --actor=<operator>
```

## checkout

Lend an eligible copy to an eligible borrower.

```text
npm run library -- checkout <copy> <borrower> --actor=<operator>
```

## return

Record a copy returned at its current branch.

```text
npm run library -- return <copy> --actor=<operator>
```

## renew

Extend an open loan when rules and other holds permit.

```text
npm run library -- renew <copy> --actor=<operator>
```

## hold

Join the title hold queue for a pickup branch.

```text
npm run library -- hold <title> <borrower> <pickup-branch> --actor=<operator>
```

## ready-hold

Allocate a local copy to the first waiting borrower.

```text
npm run library -- ready-hold <hold-id> <copy> --actor=<operator>
```

## cancel-hold

Release a waiting or ready hold with a reason.

```text
npm run library -- cancel-hold <hold-id> --reason=<reason> --actor=<operator>
```

## move-copy

Record a completed physical transfer between branches.

```text
npm run library -- move-copy <copy> <branch> --actor=<operator>
```

## copy-condition

Record repair, withdrawal or return to circulation.

```text
npm run library -- copy-condition <copy> <circulating|repair|withdrawn> --reason=<reason> --actor=<operator>
```

## log

Record an operational note about a copy.

```text
npm run library -- log <copy> --note=<operational-note> --actor=<operator>
```

## import

Preview and import mapped Spydus CSV reports.

```text
npm run library -- import spydus <folder> --mapping=<mapping-file> --batch=<batch-name> --actor=<operator> --dry-run
```

## export

Write a complete structured database export.

```text
npm run library -- export
```

## draft-overdues

Write a private overdue review draft without sending.

```text
npm run library -- draft-overdues
```

## Identity and transactions

A full code or exact case-insensitive name is tried first, then a partial UUID or case-insensitive name fragment. Multiple matches list candidates and exit 1. Import references are exact codes only. Every mutation uses one transaction and serializes changes with database locks so concurrent operators cannot borrow the same copy or allocate the same hold. A refusal rolls back the full operation and its audit entry.

## Dates and rules

Use real YYYY-MM-DD calendar dates. The database timezone is UTC, so due dates roll over at UTC midnight. This is explicit; customise the calendar before using a local-day deadline policy. Due today is not overdue. Pickup due today remains valid. Loan days, maximum loans, renewal limits and pickup days belong to the branch. Defaults of 21, 5, 2 and 7 are fictional operational choices. Renewal extends the later of today and the existing due date. It never shortens a loan.

A borrower must be active and unexpired for checkout, renewal and hold allocation. Suspended borrowers can still return items. Imported historical records can describe expired borrowers; attention reports make current problems visible. Counts are based on recorded history only.

Holds are ordered by request date and a monotonically increasing queue number. Waiting holds block ordinary checkout until staff allocate the earliest one. A ready hold reserves its specific copy. The pull list gives candidate copies, not a completed allocation. An expired ready hold remains reserved until staff cancel it with a reason. No automatic cancellation, renewal, notice or fine.

## Outputs

OUTPUT_DIR selects the parent for private drafts, reports and exports. Export includes all domain records, audit entries, import batches and migration names in a versioned JSON document. It is an archival export, not an automatic restore command. Keep a tested database backup as well. HTML dashboards and paperwork escape record text. Configure brand.json for name, colours and a logo. Keep generated files out of Git.
