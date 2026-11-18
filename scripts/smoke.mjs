import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';
import {getDb,REPO_ROOT} from './lib/db.mjs';import {migrate} from './migrate.mjs';import {seed} from './seed.mjs';import {checkDomain} from './check-domain.mjs';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'library-test-'));process.env.DATABASE_URL='';process.env.DATA_DIR=path.join(tmp,'db');process.env.OUTPUT_DIR=tmp;
try{
 const db=await getDb();try{await migrate(db);assert.equal((await migrate(db)).ran.length,0);await seed(db);await seed(db);assert.equal((await db.query('SELECT count(*) n FROM copies'))[0].n,5);await checkDomain(db,tmp);await db.query("UPDATE titles SET name=$1 WHERE code='T002'",["Local History <script>demo</script>"]);}finally{await db.close();}
 for(const file of ['view.mjs','docs.mjs']){const r=spawnSync(process.execPath,[path.join(REPO_ROOT,'scripts',file)],{encoding:'utf8',env:process.env});assert.equal(r.status,0,r.stderr);}
 assert.equal(fs.readdirSync(path.join(tmp,'views')).length,3);assert.equal(fs.readdirSync(path.join(tmp,'docs-out')).length,3);
 const html=fs.readFileSync(path.join(tmp,'views/collection.html'),'utf8');assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>demo</script>'));
 for(const args of [['overdues','--json'],['help','--json']]){const r=spawnSync(process.execPath,[path.join(REPO_ROOT,'scripts/library.mjs'),...args],{encoding:'utf8',env:process.env});assert.equal(r.status,0,r.stderr);assert.ok(Array.isArray(JSON.parse(r.stdout)));}
 const bad=spawnSync(process.execPath,[path.join(REPO_ROOT,'scripts/library.mjs'),'checkout','C001','Maya','--actor=Test'],{encoding:'utf8',env:process.env});assert.equal(bad.status,1);assert.match(bad.stderr,/Ambiguous/);
 console.log('PASS npm test: embedded database, CLI exits, JSON, three views, three document types, HTML escaping');
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
