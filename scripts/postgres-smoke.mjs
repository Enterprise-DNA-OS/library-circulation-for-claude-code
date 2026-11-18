import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';
import {getDb} from './lib/db.mjs';import {migrate} from './migrate.mjs';import {seed} from './seed.mjs';import {checkDomain} from './check-domain.mjs';
if(!process.env.TEST_DATABASE_URL)throw Error('TEST_DATABASE_URL must name an empty disposable database');
process.env.DATABASE_URL=process.env.TEST_DATABASE_URL;const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'library-pg-'));process.env.OUTPUT_DIR=tmp;
const db=await getDb();try{assert.equal((await db.query("SELECT count(*)::integer n FROM information_schema.tables WHERE table_schema='public'"))[0].n,0,'Requires an empty disposable database');await migrate(db);assert.equal((await migrate(db)).ran.length,0);await seed(db);await seed(db);await checkDomain(db,tmp);console.log('PASS PostgreSQL domain checks');}finally{await db.close();fs.rmSync(tmp,{recursive:true,force:true});}
