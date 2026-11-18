CREATE TABLE branches (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE CHECK (btrim(code)<>''), name text NOT NULL CHECK(btrim(name)<>''),
 loan_days integer NOT NULL DEFAULT 21 CHECK(loan_days BETWEEN 1 AND 365), max_loans integer NOT NULL DEFAULT 5 CHECK(max_loans BETWEEN 1 AND 100),
 max_renewals integer NOT NULL DEFAULT 2 CHECK(max_renewals BETWEEN 0 AND 20), pickup_days integer NOT NULL DEFAULT 7 CHECK(pickup_days BETWEEN 1 AND 60),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE titles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE CHECK(btrim(code)<>''), name text NOT NULL CHECK(btrim(name)<>''), author text NOT NULL DEFAULT '', isbn text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE copies (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), barcode text NOT NULL UNIQUE CHECK(btrim(barcode)<>''), title_id uuid NOT NULL REFERENCES titles, branch_id uuid NOT NULL REFERENCES branches,
 condition text NOT NULL DEFAULT 'circulating' CHECK(condition IN ('circulating','repair','withdrawn')), acquired_on date NOT NULL DEFAULT CURRENT_DATE,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE borrowers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE CHECK(btrim(code)<>''), name text NOT NULL CHECK(btrim(name)<>''),
 expires_on date NOT NULL, status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended','closed')),
 purpose text NOT NULL DEFAULT '', review_on date, evidence text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE loans (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), source_key text UNIQUE, copy_id uuid NOT NULL REFERENCES copies, borrower_id uuid NOT NULL REFERENCES borrowers,
 issued_on date NOT NULL DEFAULT CURRENT_DATE, due_on date NOT NULL, returned_on date, renewals integer NOT NULL DEFAULT 0 CHECK(renewals>=0),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(due_on>=issued_on), CHECK(returned_on IS NULL OR returned_on>=issued_on)
);
CREATE UNIQUE INDEX one_open_loan ON loans(copy_id) WHERE returned_on IS NULL;
CREATE TABLE holds (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), source_key text UNIQUE, title_id uuid NOT NULL REFERENCES titles, borrower_id uuid NOT NULL REFERENCES borrowers, branch_id uuid NOT NULL REFERENCES branches,
 requested_on date NOT NULL DEFAULT CURRENT_DATE, state text NOT NULL DEFAULT 'waiting' CHECK(state IN ('waiting','ready','fulfilled','cancelled')),
 copy_id uuid REFERENCES copies, pickup_until date,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(state<>'ready' OR (copy_id IS NOT NULL AND pickup_until IS NOT NULL)), CHECK(pickup_until IS NULL OR pickup_until>=requested_on)
);
CREATE UNIQUE INDEX one_open_hold ON holds(title_id,borrower_id) WHERE state IN ('waiting','ready');
CREATE UNIQUE INDEX one_ready_copy ON holds(copy_id) WHERE state='ready';
CREATE TABLE notes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), copy_id uuid NOT NULL REFERENCES copies, actor text NOT NULL CHECK(btrim(actor)<>''), body text NOT NULL CHECK(btrim(body)<>''),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE import_batches (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE, fingerprint text NOT NULL, counts jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor text NOT NULL CHECK(btrim(actor)<>''), action text NOT NULL, entity_id uuid, detail jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE FUNCTION touch_updated() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at=clock_timestamp(); RETURN NEW; END $$;
DO $$ DECLARE n text; BEGIN FOREACH n IN ARRAY ARRAY['branches','titles','copies','borrowers','loans','holds','notes','import_batches','audit'] LOOP
 EXECUTE format('CREATE TRIGGER touch BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION touch_updated()',n);
 EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',n);
 EXECUTE format('REVOKE ALL ON %I FROM PUBLIC',n);
 END LOOP; END $$;
CREATE VIEW circulation AS
 SELECT l.id,l.source_key,c.barcode,t.name title,b.code borrower,b.name borrower_name,br.code branch,l.issued_on,l.due_on,l.returned_on,l.renewals,
 CASE WHEN l.returned_on IS NULL THEN greatest(0,CURRENT_DATE-l.due_on) ELSE 0 END overdue_days
 FROM loans l JOIN copies c ON c.id=l.copy_id JOIN titles t ON t.id=c.title_id JOIN borrowers b ON b.id=l.borrower_id JOIN branches br ON br.id=c.branch_id;
CREATE VIEW hold_queue AS
 SELECT h.id,t.code title_code,t.name title,b.code borrower,b.name borrower_name,br.code pickup_branch,h.requested_on,h.state,c.barcode,h.pickup_until,
 row_number() OVER(PARTITION BY h.title_id ORDER BY h.requested_on,h.created_at,h.id) queue_position
 FROM holds h JOIN titles t ON t.id=h.title_id JOIN borrowers b ON b.id=h.borrower_id JOIN branches br ON br.id=h.branch_id LEFT JOIN copies c ON c.id=h.copy_id
 WHERE h.state IN ('waiting','ready');
CREATE VIEW collection_review AS
 SELECT c.id,c.barcode,t.code title_code,t.name title,br.code branch,c.condition,c.acquired_on,
 count(l.id)::integer loans_count,max(l.issued_on) last_issue,
 EXISTS(SELECT 1 FROM loans x WHERE x.copy_id=c.id AND x.returned_on IS NULL) on_loan,
 EXISTS(SELECT 1 FROM holds h WHERE h.copy_id=c.id AND h.state='ready') reserved,
 (SELECT count(*)::integer FROM holds h WHERE h.title_id=t.id AND h.state='waiting') waiting
 FROM copies c JOIN titles t ON t.id=c.title_id JOIN branches br ON br.id=c.branch_id LEFT JOIN loans l ON l.copy_id=c.id
 GROUP BY c.id,t.id,br.id;
CREATE VIEW compliance_review AS
 SELECT id,code borrower,'PURPOSE' rule,'Record why this borrower information is necessary' finding FROM borrowers WHERE btrim(purpose)=''
 UNION ALL SELECT id,code,'RETENTION','Review the continuing need for this borrower record' FROM borrowers WHERE review_on IS NULL OR review_on<CURRENT_DATE
 UNION ALL SELECT id,code,'EVIDENCE','Record the reference supporting the privacy review' FROM borrowers WHERE btrim(evidence)='';
CREATE VIEW attention AS
 SELECT id,'overdue loan' kind,barcode reference,title detail FROM circulation WHERE returned_on IS NULL AND overdue_days>0
 UNION ALL SELECT id,'expired pickup',borrower,title FROM hold_queue WHERE state='ready' AND pickup_until<CURRENT_DATE
 UNION ALL SELECT id,'borrower review',borrower,rule||': '||finding FROM compliance_review;
REVOKE ALL ON circulation,hold_queue,collection_review,compliance_review,attention FROM PUBLIC;
