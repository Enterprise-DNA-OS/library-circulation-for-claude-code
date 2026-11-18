import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {getDb,REPO_ROOT} from './lib/db.mjs';import {migrate} from './migrate.mjs';import {seed} from './seed.mjs';import {execute,human} from './library.mjs';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'library-demo-'));process.env.DATABASE_URL='';process.env.DATA_DIR=path.join(dir,'db');process.env.OUTPUT_DIR=dir;
const db=await getDb();try{await migrate(db);await seed(db);let runs='';for(const c of ['overdues','pull-list','compliance']){const out=human(await execute(db,[c]));runs+='npm run library -- '+c+'\n'+out+'\n\n';console.log(c+'\n'+out);}fs.writeFileSync(path.join(dir,'demo-runs.txt'),runs);}finally{await db.close();}
for(const file of ['view.mjs','docs.mjs']){const r=spawnSync(process.execPath,[path.join(REPO_ROOT,'scripts',file)],{env:process.env,encoding:'utf8'});if(r.status!==0)throw Error(r.stderr);console.log(r.stdout.trim());}
console.log('Demo records and reports: '+dir);
