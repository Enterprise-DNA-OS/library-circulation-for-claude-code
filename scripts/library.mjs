#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {parseCsv,pick} from './lib/csv.mjs';
import {table} from './lib/format.mjs';

export const specs = {
 'branches':[0,[]], 'catalogue':[0,[]], 'borrowers':[0,[]], 'loans':[0,[]], 'overdues':[0,[]],
 'holds':[0,[]], 'pull-list':[0,[]], 'collection-review':[0,[]], 'compliance':[0,[]],
 'attention':[0,[]], 'imports':[0,[]], 'audit':[0,[]], 'history':[1,[]], 'insights':[0,[]], 'weekly-review':[0,[]],
 'add-branch':[2,['loan-days','max-loans','max-renewals','pickup-days','actor']],
 'add-title':[2,['author','isbn','actor']], 'add-copy':[3,['acquired','actor']],
 'add-borrower':[2,['expires','purpose','review','evidence','actor']],
 'borrower-status':[2,['actor','reason']], 'review-privacy':[1,['purpose','review','evidence','actor']],
 'checkout':[2,['actor']], 'return':[1,['actor']], 'renew':[1,['actor']], 'hold':[3,['actor']],
 'ready-hold':[2,['actor']], 'cancel-hold':[1,['actor','reason']], 'move-copy':[2,['actor']],
 'copy-condition':[2,['actor','reason']], 'log':[1,['actor','note']],
 'import':[2,['mapping','batch','actor','dry-run']], 'export':[0,[]], 'draft-overdues':[0,[]]
};
const reads = {
 branches:'SELECT code,name,loan_days,max_loans,max_renewals,pickup_days FROM branches ORDER BY code',
 catalogue:'SELECT barcode,title,branch,condition,on_loan,reserved FROM collection_review ORDER BY barcode',
 borrowers:'SELECT code,name,expires_on,status,review_on FROM borrowers ORDER BY code',
 loans:'SELECT * FROM circulation ORDER BY issued_on,barcode',
 overdues:'SELECT barcode,title,borrower,branch,due_on,overdue_days FROM circulation WHERE returned_on IS NULL AND overdue_days>0 ORDER BY overdue_days DESC,barcode',
 holds:'SELECT * FROM hold_queue ORDER BY title,queue_position',
 'pull-list':`SELECT h.id hold_id,t.name title,b.code borrower,br.code pickup_branch,c.barcode,cbr.code current_branch
 FROM holds h JOIN titles t ON t.id=h.title_id JOIN borrowers b ON b.id=h.borrower_id JOIN branches br ON br.id=h.branch_id
 JOIN copies c ON c.title_id=h.title_id JOIN branches cbr ON cbr.id=c.branch_id
 WHERE h.state='waiting' AND c.condition='circulating'
 AND NOT EXISTS(SELECT 1 FROM loans l WHERE l.copy_id=c.id AND l.returned_on IS NULL)
 AND NOT EXISTS(SELECT 1 FROM holds r WHERE r.copy_id=c.id AND r.state='ready')
 AND h.id=(SELECT x.id FROM holds x WHERE x.title_id=h.title_id AND x.state='waiting' ORDER BY x.requested_on,x.queue_order LIMIT 1)
 ORDER BY t.name,c.barcode`,
 'collection-review':'SELECT * FROM collection_review ORDER BY barcode',
 compliance:'SELECT borrower,rule,finding FROM compliance_review ORDER BY borrower,rule',
 attention:'SELECT kind,reference,detail FROM attention ORDER BY kind,reference',
 imports:'SELECT name,fingerprint,counts,created_at FROM import_batches ORDER BY created_at,name',
 audit:'SELECT actor,action,entity_id,detail,created_at FROM audit ORDER BY created_at,id'
};
export const questions = [
 'Which overdue copies also have readers waiting for the title?',
 'Which waiting holds can be filled from a different branch?',
 'Which ready holds have passed their collection deadline?',
 'Which borrowers with overdue loans also need a privacy review?',
 'Which circulating copies have never been borrowed?',
 'Which copies have not been borrowed for at least 90 days?',
 'Which titles have more waiting holds than available copies?',
 'Which copies needing repair belong to titles with waiting holds?',
 'Which active loans belong to expired or suspended borrowers?',
 'Which branches hold available copies of titles with overdue loans?'
];
const insightSql = [
 `SELECT c.barcode,c.title,c.borrower,c.overdue_days FROM circulation c JOIN copies p ON p.barcode=c.barcode WHERE c.returned_on IS NULL AND c.overdue_days>0 AND EXISTS(SELECT 1 FROM holds h WHERE h.title_id=p.title_id AND h.state='waiting')`,
 `SELECT * FROM (${reads['pull-list']}) p WHERE pickup_branch<>current_branch`,
 `SELECT title,borrower,pickup_branch,pickup_until FROM hold_queue WHERE state='ready' AND pickup_until<CURRENT_DATE`,
 `SELECT DISTINCT c.borrower,c.borrower_name FROM circulation c JOIN compliance_review r ON r.borrower=c.borrower WHERE c.returned_on IS NULL AND c.overdue_days>0`,
 `SELECT barcode,title,branch FROM collection_review WHERE loans_count=0 AND condition='circulating'`,
 `SELECT barcode,title,branch,last_issue FROM collection_review WHERE acquired_on<=CURRENT_DATE-90 AND (last_issue IS NULL OR last_issue<=CURRENT_DATE-90) AND condition='circulating'`,
 `SELECT t.code,t.name,(SELECT count(*) FROM holds h WHERE h.title_id=t.id AND h.state='waiting') waiting,(SELECT count(*) FROM collection_review c WHERE c.title_code=t.code AND condition='circulating' AND NOT on_loan AND NOT reserved) available FROM titles t WHERE (SELECT count(*) FROM holds h WHERE h.title_id=t.id AND h.state='waiting')>(SELECT count(*) FROM collection_review c WHERE c.title_code=t.code AND condition='circulating' AND NOT on_loan AND NOT reserved)`,
 `SELECT barcode,title,branch,waiting FROM collection_review WHERE condition='repair' AND waiting>0`,
 `SELECT c.barcode,c.title,c.borrower,b.status,b.expires_on FROM circulation c JOIN borrowers b ON b.code=c.borrower WHERE c.returned_on IS NULL AND (b.status<>'active' OR b.expires_on<CURRENT_DATE)`,
 `SELECT DISTINCT r.branch,r.barcode,r.title FROM collection_review r JOIN copies other_copy ON other_copy.title_id=(SELECT title_id FROM copies WHERE id=r.id) JOIN circulation c ON c.barcode=other_copy.barcode WHERE c.returned_on IS NULL AND c.overdue_days>0 AND r.condition='circulating' AND NOT r.on_loan AND NOT r.reserved`
];
function parse(args){
 const [command='help',...rest]=args;if(command==='help'||command==='--help')return {command:'help',pos:[],o:{}};
 if(!specs[command])throw Error(`Unknown command ${command}. Use help.`);
 const pos=[],o={};for(const a of rest){if(!a.startsWith('--')){pos.push(a);continue;}
 const m=/^--([a-z-]+)(?:=(.*))?$/.exec(a);if(!m)throw Error(`Malformed option ${a}`);
 const [,k,v]=m;if(!['json',...specs[command][1]].includes(k))throw Error(`Unknown option --${k}`);
 if(k in o)throw Error(`Repeated option --${k}`);
 if(['json','dry-run'].includes(k)){if(v!==undefined)throw Error(`--${k} takes no value`);o[k]=true;}
 else {if(!v?.trim())throw Error(`--${k} needs a value`);o[k]=v.trim();}}
 if(pos.length!==specs[command][0])throw Error(`${command} needs ${specs[command][0]} argument(s)`);
 return {command,pos,o};
}
function need(o,k){if(!o[k]?.trim())throw Error(`--${k} is required`);return o[k];}
function day(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||new Date(s+'T00:00:00Z').toISOString().slice(0,10)!==s)throw Error(`Expected a real YYYY-MM-DD date: ${s}`);return s;}
function num(s,d){if(s===undefined)return d;if(!/^\d+$/.test(s))throw Error('Expected whole nonnegative integer');return Number(s);}
function text(s){if(!String(s??'').trim())throw Error('Blank value');return String(s).trim();}
const entities={branches:['code','name'],titles:['code','name'],copies:['barcode'],borrowers:['code','name'],holds:['source_key'],loans:['source_key']};
async function find(db,kind,term){
 text(term); const cols=entities[kind];
 const all=await db.query(`SELECT * FROM ${kind} ORDER BY id`);
 let found=all.filter(r=>r.id===term||cols.some(c=>r[c]&&String(r[c]).toLowerCase()===term.toLowerCase()));
 if(!found.length)found=all.filter(r=>r.id.startsWith(term.toLowerCase())||cols.some(c=>r[c]&&String(r[c]).toLowerCase().includes(term.toLowerCase())));
 if(found.length!==1)throw Error(`${found.length?'Ambiguous':'Not found'} ${kind}: ${term}${found.length?'\n'+found.map(r=>[r.id,...cols.map(c=>r[c])].join(' | ')).join('\n'):''}`);
 return found[0];
}
async function event(db,o,action,id,detail={}){await db.query('INSERT INTO audit(actor,action,entity_id,detail) VALUES($1,$2,$3,$4)',[need(o,'actor'),action,id,JSON.stringify(detail)]);}
async function eligible(db,b){const [r]=await db.query("SELECT status='active' AND expires_on>=CURRENT_DATE ok FROM borrowers WHERE id=$1",[b.id]);if(!r.ok)throw Error('Borrower is suspended, closed or expired');}
async function freeCopy(db,c){if(c.condition!=='circulating')throw Error('Copy is not circulating');if((await db.query('SELECT id FROM loans WHERE copy_id=$1 AND returned_on IS NULL',[c.id])).length)throw Error('Copy has an open loan');}
async function openLoan(db,c){const rows=await db.query('SELECT * FROM loans WHERE copy_id=$1 AND returned_on IS NULL',[c.id]);if(!rows.length)throw Error('Copy has no open loan');return rows[0];}
function outputFile(folder,name,content){const dir=path.resolve(process.env.OUTPUT_DIR||REPO_ROOT,folder);fs.mkdirSync(dir,{recursive:true,mode:0o700});const f=path.join(dir,name);fs.writeFileSync(f,content,{mode:0o600});return f;}

export async function execute(db,args){
 const {command,pos:p,o}=parse(args);
 if(command==='help')return Object.entries(specs).map(([command,[arguments_,options]])=>({command,arguments:arguments_,options:options.map(x=>'--'+x).join(' ')}));
 if(reads[command])return db.query(reads[command]);
 if(command==='history'){const c=await find(db,'copies',p[0]);return {copy:await db.query('SELECT * FROM collection_review WHERE id=$1',[c.id]),loans:await db.query('SELECT * FROM circulation WHERE barcode=$1 ORDER BY issued_on',[c.barcode]),notes:await db.query('SELECT actor,body,created_at FROM notes WHERE copy_id=$1 ORDER BY created_at',[c.id]),audit:await db.query('SELECT actor,action,detail,created_at FROM audit WHERE entity_id=$1 ORDER BY created_at',[c.id])};}
 if(command==='insights'){const out={};for(let i=0;i<questions.length;i++)out[questions[i]]=await db.query(insightSql[i]);return out;}
 if(command==='weekly-review')return {overdues:await execute(db,['overdues']),holds:await execute(db,['holds']),compliance:await execute(db,['compliance'])};
 if(command==='export'){
  await db.exec('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  try {const out={format:'library-circulation/1',exported_at:new Date().toISOString(),data:{}};for(const t of ['branches','titles','copies','borrowers','loans','holds','notes','import_batches','audit','schema_migrations'])out.data[t]=await db.query(`SELECT * FROM ${t} ORDER BY ${t==='schema_migrations'?'name':'id'}`);
   const file=outputFile('exports',`library-${randomUUID()}.json`,JSON.stringify(out,null,2));return [{file,records:Object.values(out.data).reduce((n,a)=>n+a.length,0)}];
  }finally{await db.exec('ROLLBACK');}}
 if(command==='draft-overdues'){const rows=await execute(db,['overdues']);const body='# Draft overdue review\n\nInternal draft. A librarian checks the dates and borrower contact details before sending anything.\n\n'+human(rows)+'\n';return [{file:outputFile('drafts',`overdues-${randomUUID()}.md`,body),loans:rows.length}];}
 need(o,'actor');await db.exec('BEGIN');
 try{
  // Serialize circulation changes across CLI processes, including bulk imports.
  await db.exec('LOCK TABLE branches,titles,copies,borrowers,loans,holds,import_batches IN SHARE ROW EXCLUSIVE MODE');
  let result;
  if(command==='import')result=await importBundle(db,p,o);
  if(command==='add-branch'){result=await db.query('INSERT INTO branches(code,name,loan_days,max_loans,max_renewals,pickup_days) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[text(p[0]),text(p[1]),num(o['loan-days'],21),num(o['max-loans'],5),num(o['max-renewals'],2),num(o['pickup-days'],7)]);}
  if(command==='add-title')result=await db.query('INSERT INTO titles(code,name,author,isbn) VALUES($1,$2,$3,$4) RETURNING *',[text(p[0]),text(p[1]),o.author||'',o.isbn||'']);
  if(command==='add-copy'){const t=await find(db,'titles',p[1]),b=await find(db,'branches',p[2]);result=await db.query('INSERT INTO copies(barcode,title_id,branch_id,acquired_on) VALUES($1,$2,$3,COALESCE($4::date,CURRENT_DATE)) RETURNING *',[text(p[0]),t.id,b.id,o.acquired?day(o.acquired):null]);}
  if(command==='add-borrower')result=await db.query('INSERT INTO borrowers(code,name,expires_on,purpose,review_on,evidence) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[text(p[0]),text(p[1]),day(need(o,'expires')),need(o,'purpose'),day(need(o,'review')),need(o,'evidence')]);
  if(command==='borrower-status'){const b=await find(db,'borrowers',p[0]);need(o,'reason');result=await db.query('UPDATE borrowers SET status=$2 WHERE id=$1 RETURNING *',[b.id,p[1]]);}
  if(command==='review-privacy'){const b=await find(db,'borrowers',p[0]);const review=day(need(o,'review'));if(!(await db.query('SELECT $1::date>=CURRENT_DATE ok',[review]))[0].ok)throw Error('Review date must be today or later');result=await db.query('UPDATE borrowers SET purpose=$2,review_on=$3,evidence=$4 WHERE id=$1 RETURNING *',[b.id,need(o,'purpose'),review,need(o,'evidence')]);}
  if(command==='checkout'){
   const c=await find(db,'copies',p[0]),b=await find(db,'borrowers',p[1]);await eligible(db,b);await freeCopy(db,c);
   const [br]=await db.query('SELECT * FROM branches WHERE id=$1',[c.branch_id]);
   if(Number((await db.query('SELECT count(*) n FROM loans WHERE borrower_id=$1 AND returned_on IS NULL',[b.id]))[0].n)>=br.max_loans)throw Error('Borrower loan limit reached');
   const ready=await db.query("SELECT * FROM holds WHERE copy_id=$1 AND state='ready'",[c.id]);
   if(ready.length){const h=ready[0];if(h.borrower_id!==b.id)throw Error('Copy is reserved for another borrower');if(!(await db.query('SELECT $1::date>=CURRENT_DATE ok',[h.pickup_until]))[0].ok)throw Error('Pickup deadline passed; review the hold');await db.query("UPDATE holds SET state='fulfilled' WHERE id=$1",[h.id]);}
   else if((await db.query("SELECT id FROM holds WHERE title_id=$1 AND state='waiting'",[c.title_id])).length)throw Error('Waiting holds exist; allocate the first hold before lending');
   const [l]=await db.query('INSERT INTO loans(copy_id,borrower_id,due_on) VALUES($1,$2,CURRENT_DATE+$3::integer) RETURNING *',[c.id,b.id,br.loan_days]);
   await event(db,o,command,c.id,{loan_id:l.id,borrower:b.code});result=[l];
  }
  if(command==='return'){const c=await find(db,'copies',p[0]);const l=await openLoan(db,c);result=await db.query('UPDATE loans SET returned_on=CURRENT_DATE WHERE id=$1 RETURNING *',[l.id]);await event(db,o,command,c.id,{loan_id:l.id});}
  if(command==='renew'){const c=await find(db,'copies',p[0]),l=await openLoan(db,c),b=(await db.query('SELECT * FROM borrowers WHERE id=$1',[l.borrower_id]))[0];await eligible(db,b);const br=(await db.query('SELECT * FROM branches WHERE id=$1',[c.branch_id]))[0];if(l.renewals>=br.max_renewals)throw Error('Renewal limit reached');if((await db.query("SELECT id FROM holds WHERE title_id=$1 AND state IN ('waiting','ready') AND borrower_id<>$2",[c.title_id,b.id])).length)throw Error('Another borrower has a hold');result=await db.query('UPDATE loans SET due_on=greatest(due_on,CURRENT_DATE)+$2::integer,renewals=renewals+1 WHERE id=$1 RETURNING *',[l.id,br.loan_days]);await event(db,o,command,c.id,{loan_id:l.id});}
  if(command==='hold'){const t=await find(db,'titles',p[0]),b=await find(db,'borrowers',p[1]),br=await find(db,'branches',p[2]);await eligible(db,b);result=await db.query('INSERT INTO holds(title_id,borrower_id,branch_id) VALUES($1,$2,$3) RETURNING *',[t.id,b.id,br.id]);}
  if(command==='ready-hold'){const h=await find(db,'holds',p[0]),c=await find(db,'copies',p[1]);if(h.state!=='waiting')throw Error('Only waiting holds can become ready');if(c.title_id!==h.title_id)throw Error('Wrong title for hold');await freeCopy(db,c);await eligible(db,(await db.query('SELECT * FROM borrowers WHERE id=$1',[h.borrower_id]))[0]);
   const [first]=await db.query("SELECT id FROM holds WHERE title_id=$1 AND state='waiting' ORDER BY requested_on,queue_order LIMIT 1",[h.title_id]);if(first.id!==h.id)throw Error('An earlier hold must be handled first');if(c.branch_id!==h.branch_id)throw Error('Move the copy to the pickup branch first');
   const [br]=await db.query('SELECT pickup_days FROM branches WHERE id=$1',[h.branch_id]);result=await db.query("UPDATE holds SET state='ready',copy_id=$2,pickup_until=CURRENT_DATE+$3::integer WHERE id=$1 RETURNING *",[h.id,c.id,br.pickup_days]);}
  if(command==='cancel-hold'){const h=await find(db,'holds',p[0]);need(o,'reason');if(!['waiting','ready'].includes(h.state))throw Error('Hold is already closed');result=await db.query("UPDATE holds SET state='cancelled' WHERE id=$1 RETURNING *",[h.id]);}
  if(['move-copy','copy-condition'].includes(command)){const c=await find(db,'copies',p[0]);if((await db.query('SELECT id FROM loans WHERE copy_id=$1 AND returned_on IS NULL',[c.id])).length||(await db.query("SELECT id FROM holds WHERE copy_id=$1 AND state='ready'",[c.id])).length)throw Error('Copy has an active loan or ready hold');
   if(command==='move-copy'){const b=await find(db,'branches',p[1]);result=await db.query('UPDATE copies SET branch_id=$2 WHERE id=$1 RETURNING *',[c.id,b.id]);}
   else {need(o,'reason');result=await db.query('UPDATE copies SET condition=$2 WHERE id=$1 RETURNING *',[c.id,p[1]]);}}
  if(command==='log'){const c=await find(db,'copies',p[0]);result=await db.query('INSERT INTO notes(copy_id,actor,body) VALUES($1,$2,$3) RETURNING *',[c.id,need(o,'actor'),need(o,'note')]);await event(db,o,command,c.id,{note_id:result[0].id});}
  if(!result)throw Error('Command has no implementation');
  if(!['checkout','return','renew','log','import'].includes(command))await event(db,o,command,result[0].id,{arguments:p,reason:o.reason||null});
  if(o['dry-run'])await db.exec('ROLLBACK');else await db.exec('COMMIT');
  return result;
 }catch(e){await db.exec('ROLLBACK');throw e;}
}

const required={titles:['code','name'],copies:['barcode','title','branch','acquired_on','condition'],borrowers:['code','name','expires_on','status','purpose','review_on','evidence'],loans:['key','barcode','borrower','issued_on','due_on','returned_on','renewals'],holds:['key','title','borrower','branch','requested_on','state','barcode','pickup_until']};
async function importBundle(db,p,o){
 if(p[0]!=='spydus')throw Error('Supported import: spydus');
 const folder=path.resolve(p[1]),mapping=o.mapping?JSON.parse(fs.readFileSync(o.mapping,'utf8')):{};
 if(Object.keys(mapping).some(k=>!(k in required)))throw Error('Unknown mapping file key');
 const bundle={};for(const [kind,cols] of Object.entries(required)){
  const f=path.join(folder,kind+'.csv');if(!fs.existsSync(f)){if(['loans','holds'].includes(kind)){bundle[kind]=[];continue;}throw Error(`Missing ${kind}.csv`);}
  const rows=parseCsv(fs.readFileSync(f,'utf8'));if(!rows.length)throw Error(`Empty ${kind}.csv: omit optional files instead`);
  const maps=mapping[kind]||{};if(Object.keys(maps).some(k=>!cols.includes(k)&&!(kind==='titles'&&['author','isbn'].includes(k))))throw Error(`Unknown ${kind} mapping field`);
  for(const c of cols)if(!Object.keys(rows[0]).some(k=>k.toLowerCase()===String(maps[c]||c).toLowerCase()))throw Error(`${kind}.csv missing header ${maps[c]||c}`);
  bundle[kind]=rows.map((r,i)=>{const out={};for(const c of [...cols,...(kind==='titles'?['author','isbn']:[])])out[c]=pick(r,maps[c]||c).trim();out._row=i+2;return out;});
 }
 const name=need(o,'batch'),fingerprint=createHash('sha256').update(JSON.stringify(bundle)).digest('hex');
 const prior=await db.query('SELECT * FROM import_batches WHERE name=$1 OR fingerprint=$2',[name,fingerprint]);
 if(prior.length){if(prior.some(x=>x.name===name&&x.fingerprint!==fingerprint))throw Error('Batch name already used with different content');return [{batch:prior[0].name,replayed:true,counts:prior[0].counts,dry_run:!!o['dry-run']}];}
 const exact=async(kind,field,value)=>{const rows=await db.query(`SELECT * FROM ${kind} WHERE ${field}=$1`,[text(value)]);if(rows.length!==1)throw Error(`Missing exact ${kind} ${value}`);return rows[0];};
 const count={};
 for(const [kind,rows] of Object.entries(bundle)){count[kind]=rows.length;for(const r of rows){try{
  if(kind==='titles')await db.query('INSERT INTO titles(code,name,author,isbn) VALUES($1,$2,$3,$4)',[text(r.code),text(r.name),r.author||'',r.isbn||'']);
  if(kind==='copies'){const t=await exact('titles','code',r.title),b=await exact('branches','code',r.branch);await db.query('INSERT INTO copies(barcode,title_id,branch_id,acquired_on,condition) VALUES($1,$2,$3,$4,$5)',[text(r.barcode),t.id,b.id,day(r.acquired_on),r.condition]);}
  if(kind==='borrowers')await db.query('INSERT INTO borrowers(code,name,expires_on,status,purpose,review_on,evidence) VALUES($1,$2,$3,$4,$5,$6,$7)',[text(r.code),text(r.name),day(r.expires_on),r.status,r.purpose,r.review_on?day(r.review_on):null,r.evidence]);
  if(kind==='loans'){const c=await exact('copies','barcode',r.barcode),b=await exact('borrowers','code',r.borrower);await db.query('INSERT INTO loans(source_key,copy_id,borrower_id,issued_on,due_on,returned_on,renewals) VALUES($1,$2,$3,$4,$5,$6,$7)',[text(r.key),c.id,b.id,day(r.issued_on),day(r.due_on),r.returned_on?day(r.returned_on):null,num(r.renewals,0)]);}
  if(kind==='holds'){const t=await exact('titles','code',r.title),b=await exact('borrowers','code',r.borrower),br=await exact('branches','code',r.branch),c=r.barcode?await exact('copies','barcode',r.barcode):null;
   if(c&&c.title_id!==t.id)throw Error('Hold copy has another title');if(r.state==='ready'&&c){await freeCopy(db,c);if(c.branch_id!==br.id)throw Error('Ready hold copy is at another branch');}
   await db.query('INSERT INTO holds(source_key,title_id,borrower_id,branch_id,requested_on,state,copy_id,pickup_until) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[text(r.key),t.id,b.id,br.id,day(r.requested_on),r.state,c?.id||null,r.pickup_until?day(r.pickup_until):null]);}
 }catch(e){throw Error(`${kind}.csv row ${r._row}: ${e.message}`);}}}
 const invalid=await db.query("SELECT c.barcode FROM copies c JOIN loans l ON l.copy_id=c.id WHERE l.returned_on IS NULL AND c.condition<>'circulating'");if(invalid.length)throw Error('Imported open loan uses a non-circulating copy');
 const [batch]=await db.query('INSERT INTO import_batches(name,fingerprint,counts) VALUES($1,$2,$3) RETURNING id',[name,fingerprint,JSON.stringify(count)]);await event(db,o,'import',batch.id,{batch:name,counts:count});
 return [{batch:name,replayed:false,counts:count,dry_run:!!o['dry-run']}];
}
export function human(value){if(Array.isArray(value)){if(!value.length)return '  (none)';return table(value.map(r=>Object.fromEntries(Object.entries(r).map(([k,v])=>[k,v instanceof Date?v.toISOString():typeof v==='object'&&v!==null?JSON.stringify(v):v]))),Object.keys(value[0]).map(k=>({key:k,label:k.replaceAll('_',' ')})));}return Object.entries(value).map(([k,v])=>k+'\n'+human(Array.isArray(v)?v:[v])).join('\n\n');}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){let db;try{const args=process.argv.slice(2);parse(args);db=await getDb();const result=await execute(db,args);console.log(args.includes('--json')?JSON.stringify(result,null,2):human(result));}catch(e){console.error(e.message);process.exitCode=1;}finally{await db?.close();}}
