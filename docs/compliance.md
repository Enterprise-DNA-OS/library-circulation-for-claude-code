# Borrower information checks

Sources checked 18 November 2026. These are evidence prompts for a New Zealand library's privacy review, not certification. They do not replace Australian state rules, public-records duties or the library's approved retention schedule.

| Rule | Behaviour | Source |
|---|---|---|
| PURPOSE | Flags blank borrower collection purpose | [NZ Privacy Principle 1](https://www.privacy.org.nz/privacy-principles/1/) addresses necessary collection for a lawful organisational purpose. A recorded phrase alone does not prove necessity. |
| RETENTION | Flags a missing or past review date | [NZ Privacy Principle 9](https://www.privacy.org.nz/privacy-principles/9/) limits retention to lawful need. The software asks for review and never deletes a borrower or reading history. |
| EVIDENCE | Flags a missing review reference | An internal control supporting those two principles, not a separate statutory field. |

The demo's 90-day review interval is fictional policy, not a legal retention period. Loan and pickup periods are operational settings, not statutory deadlines. Review each library's rules before deployment.

Collect only the borrower identifiers needed for the agreed lending purpose. The base has no address, birth date, payment or email fields. Protect borrower names, lending histories, exports and generated reports. Configure sign-in, permissions, backup, encryption and retention for shared hosting. Actor labels are operator statements, not verified identity. Database administrators can change audit records. No certification from the incumbent transfers to this software.
