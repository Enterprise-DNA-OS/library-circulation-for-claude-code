# Bring Spydus circulation records across

Sources checked 18 November 2026. Preserve a private, untouched copy of each export. This is a one-command import after field mapping, not an automatic copy of a Spydus account.

## Export the selected records

Use Spydus staff enquiry or saved queries to select the titles, physical holdings, borrowers, loans and reservations in scope. Download CSV where available. The vendor's [report release notes](https://cnrl.spydus.com/onlinehelp/2023R2_Reports.html) identify Download (CSV), with licence version 11.3 or later. Its [Operations help](https://cnrl.spydus.com/onlinehelp/Operations_menu.html) describes CSV output from saved queries. Its [supplier service description](https://www.applytosupply.digitalmarketplace.service.gov.uk/g-cloud/services/203265447517068) describes CSV export from cataloguing, enquiry and standard reports.

These sources establish an export path, not universal field names. Report layouts depend on version, configuration and selection. Ask the library's system administrator to include stable keys and the fields below. Do not scrape a patron portal or extract records without the library's authority.

Save five UTF-8 CSV files in a private folder. Titles, copies and borrowers are required. Loans and holds can be omitted only when there are no such records to migrate. An empty optional file is refused rather than silently treated as complete.

| File | Required headers after mapping |
|---|---|
| titles.csv | code, name; optional author, isbn |
| copies.csv | barcode, title, branch, acquired_on, condition |
| borrowers.csv | code, name, expires_on, status, purpose, review_on, evidence |
| loans.csv | key, barcode, borrower, issued_on, due_on, returned_on, renewals |
| holds.csv | key, title, borrower, branch, requested_on, state, barcode, pickup_until |

Use a JSON mapping with one object per file stem. Each key is a destination header and each value is the exact exported header. examples/spydus-map.json demonstrates title mapping. Unmapped names match case-insensitively. Extra columns are ignored deliberately. This does not import emails, addresses, birth dates or unrestricted patron notes.

Branch codes must already exist. Title codes, copy barcodes, borrower codes and loan/hold keys must be stable and unique. Missing branches and references stop the whole batch. No person or title is matched by a fuzzy name during import.

Export holds in the original queue order within each request date. The importer preserves that file order as the tie-breaker, so do not sort the hold export by borrower name.

Review status values before importing: copies are circulating, repair or withdrawn; borrowers active, suspended or closed; holds waiting, ready, fulfilled or cancelled. Map your library's status codes explicitly in an export working copy. Dates must be YYYY-MM-DD, not locale-dependent slash dates. Empty returned_on means an open loan. An empty review_on, purpose or evidence is retained and flagged for privacy review, not invented.

## Preview and load

```text
npm run library -- import spydus ./imports/cutover --mapping=./imports/field-map.json --batch=cutover --actor="Librarian" --dry-run
```

The preview performs the same inserts and integrity checks inside a rolled-back transaction. Compare the counts, then repeat without --dry-run to commit. The synthetic examples work with the DEMO branch created by the seed. Never seed a real library to make an import work: register the real branches instead.

Same mapped content is a no-op, even under a different batch label. A reused batch label with changed content is refused. Overlapping stable keys under a different batch are refused instead of overwriting local changes. Any malformed row, duplicate open loan, wrong-title ready hold or missing reference rolls back the full batch. There is no background sync or update import.

## Reconcile before cutover

Compare the selected source row counts with imports. Compare active-loan counts, due dates, current branches and every ready hold with loans, catalogue and holds. Review expired borrowers, old open loans and overdue pickup dates. Verify a sample checkout, return, renewal and hold allocation on a disposable copy. Keep staff and patrons on the current service until the relevant work is covered and the library approves the cutover.

MARC fields, authority records, digital assets, acquisitions, serials, notices, balances and payment history are not covered by this circulation mapping. Keep their source exports. A Spydus public catalogue, RFID equipment or ebook connection is a separate deployment concern. Enterprise DNA can build the required connections into a custom version.

No real Spydus export was supplied for this build. The fixtures demonstrate the mapping contract and tests. A real sample and reconciliation are required before calling a library migration complete.
