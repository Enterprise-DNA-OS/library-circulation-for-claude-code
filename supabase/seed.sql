DO $$
DECLARE br uuid; annex uuid; t1 uuid; t2 uuid; t3 uuid; p1 uuid; p2 uuid; p3 uuid; c1 uuid; c2 uuid; c3 uuid; c4 uuid; c5 uuid;
BEGIN
 IF EXISTS(SELECT 1 FROM branches WHERE code='DEMO') THEN RETURN; END IF;
 IF EXISTS(SELECT 1 FROM branches) OR EXISTS(SELECT 1 FROM borrowers) OR EXISTS(SELECT 1 FROM titles) THEN RAISE EXCEPTION 'Seed requires an empty demo database'; END IF;
 INSERT INTO branches(code,name) VALUES('DEMO','Harbour Library') RETURNING id INTO br;
 INSERT INTO branches(code,name) VALUES('ANNEX','Ridge Reading Room') RETURNING id INTO annex;
 INSERT INTO titles(code,name,author,isbn) VALUES('T001','Coastal Gardens','Aroha Moss','9780000000001') RETURNING id INTO t1;
 INSERT INTO titles(code,name,author) VALUES('T002','Local History Almanac','Leo Brook') RETURNING id INTO t2;
 INSERT INTO titles(code,name,author) VALUES('T003','Night Sky Notebook','Mina Vale') RETURNING id INTO t3;
 INSERT INTO borrowers(code,name,expires_on,purpose,review_on,evidence) VALUES('B001','Maya Harbour',CURRENT_DATE+365,'Physical library lending',CURRENT_DATE+90,'Demo policy v1') RETURNING id INTO p1;
 INSERT INTO borrowers(code,name,expires_on,purpose,review_on,evidence) VALUES('B002','Maya Ridge',CURRENT_DATE+365,'Physical library lending',CURRENT_DATE+90,'Demo policy v1') RETURNING id INTO p2;
 INSERT INTO borrowers(code,name,expires_on,purpose,review_on) VALUES('B003','Leo Estuary',CURRENT_DATE-2,'',CURRENT_DATE-8) RETURNING id INTO p3;
 INSERT INTO copies(barcode,title_id,branch_id,acquired_on) VALUES('C001',t1,br,CURRENT_DATE-300) RETURNING id INTO c1;
 INSERT INTO copies(barcode,title_id,branch_id,acquired_on) VALUES('C002',t1,annex,CURRENT_DATE-300) RETURNING id INTO c2;
 INSERT INTO copies(barcode,title_id,branch_id,acquired_on) VALUES('C003',t2,br,CURRENT_DATE-400) RETURNING id INTO c3;
 INSERT INTO copies(barcode,title_id,branch_id,acquired_on) VALUES('C004',t3,br,CURRENT_DATE-400) RETURNING id INTO c4;
 INSERT INTO copies(barcode,title_id,branch_id,condition,acquired_on) VALUES('C005',t3,annex,'repair',CURRENT_DATE-400) RETURNING id INTO c5;
 INSERT INTO loans(source_key,copy_id,borrower_id,issued_on,due_on) VALUES('DEMO-OVERDUE',c1,p1,CURRENT_DATE-30,CURRENT_DATE-9);
 INSERT INTO loans(source_key,copy_id,borrower_id,issued_on,due_on,returned_on) VALUES('DEMO-RETURNED',c4,p2,CURRENT_DATE-160,CURRENT_DATE-139,CURRENT_DATE-145);
 INSERT INTO holds(source_key,title_id,borrower_id,branch_id,requested_on) VALUES('DEMO-WAIT',t1,p2,br,CURRENT_DATE-12);
 INSERT INTO holds(source_key,title_id,borrower_id,branch_id,requested_on,state,copy_id,pickup_until) VALUES('DEMO-PICKUP',t2,p1,br,CURRENT_DATE-10,'ready',c3,CURRENT_DATE-3);
 INSERT INTO audit(actor,action,detail) VALUES('Demo librarian','seed','{"fictional":true}');
END $$;
