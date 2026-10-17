// Copies a Homebase planner payload from one local D1 database into another, running it
// through the app's own upgrade path first so fields added since the export are filled in.
// The source database is only ever read from a copy, so the app that owns it stays untouched.
import {build} from 'esbuild';
import {copyFileSync,existsSync,mkdirSync,mkdtempSync,readdirSync,rmSync,writeFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const d1Dir='.wrangler/state/v3/d1/miniflare-D1DatabaseObject';

function flags(argv){
 const out={};
 for(let i=0;i<argv.length;i++){
  const arg=argv[i];
  if(!arg.startsWith('--'))continue;
  const [name,inline]=arg.slice(2).split('=');
  out[name]=inline??(argv[i+1]&&!argv[i+1].startsWith('--')?argv[++i]:'true');
 }
 return out;
}

// Accepts either a .sqlite file or the miniflare directory that holds exactly one.
function resolveDb(target,label){
 const full=path.resolve(root,target);
 if(!existsSync(full))throw Error(`${label} path does not exist: ${full}`);
 if(full.endsWith('.sqlite'))return full;
 const dir=existsSync(path.join(full,d1Dir))?path.join(full,d1Dir):full;
 const files=readdirSync(dir).filter(f=>f.endsWith('.sqlite')&&f!=='metadata.sqlite');
 if(files.length!==1)throw Error(`Expected one planner database in ${dir}, found ${files.length}.`);
 return path.join(dir,files[0]);
}

// The write-ahead log can hold the most recent saves, so the copy takes it along.
function readPayload(source,owner){
 const scratch=mkdtempSync(path.join(tmpdir(),'homebase-migrate-'));
 try{
  const copy=path.join(scratch,'source.sqlite');
  copyFileSync(source,copy);
  for(const suffix of ['-wal','-shm'])if(existsSync(source+suffix))copyFileSync(source+suffix,copy+suffix);
  const db=new DatabaseSync(copy);
  try{
   const rows=db.prepare('SELECT owner,payload,revision FROM assistant_state').all();
   const row=owner?rows.find(r=>r.owner===owner):rows.length===1?rows[0]:null;
   if(!row)throw Error(owner?`No planner stored for owner "${owner}". Found: ${rows.map(r=>r.owner).join(', ')||'none'}.`:`Source holds ${rows.length} planners; pass --source-owner to pick one.`);
   return {owner:row.owner,revision:row.revision,state:JSON.parse(row.payload)};
  }finally{db.close();}
 }finally{rmSync(scratch,{recursive:true,force:true});}
}

async function load(){
 const out=path.join(root,'.sites-runtime');
 mkdirSync(out,{recursive:true});
 await build({entryPoints:[path.join(root,'app/api/state/read-state.ts')],bundle:true,platform:'node',format:'esm',outfile:path.join(out,'migrate-upgrade.mjs')});
 await build({entryPoints:[path.join(root,'lib/validate-state.ts')],bundle:true,platform:'node',format:'esm',outfile:path.join(out,'migrate-validate.mjs')});
 return {
  upgradeState:(await import(pathToFileURL(path.join(out,'migrate-upgrade.mjs')).href)).upgradeState,
  validState:(await import(pathToFileURL(path.join(out,'migrate-validate.mjs')).href)).validState,
 };
}

function counts(state){
 return {
  goals:state.goals.length,
  projects:state.projects.length,
  'project notes':state.projects.reduce((n,p)=>n+(p.notes?.length??0),0),
  assignments:state.assignments.length,
  classes:state.classes?.length??0,
  'routine steps':state.routine.length,
  'routine presets':state.routinePresets?.length??0,
  tasks:state.tasks.length,
  'confirmed days':Object.keys(state.checks).length,
  'history entries':state.history.length,
  reminders:state.reminders.length,
  videos:state.videos?.length??0,
  'gym sessions':state.gym?.sessions.length??0,
  'gym log entries':state.gym?.log.length??0,
  alarms:state.clock?.alarms.length??0,
  timers:state.clock?.timers.length??0,
 };
}

const options=flags(process.argv.slice(2));
const source=resolveDb(options.source??'../dashboard','Source');
const target=resolveDb(options.target??'.','Target');
if(source===target)throw Error('Source and target are the same database.');
const sourceOwner=options['source-owner']??null;
// The dev server signs in as local_seedy, so that is the owner the app reads back.
const owner=options.owner??'local_seedy';

const read=readPayload(source,sourceOwner);
const {upgradeState,validState}=await load();
const before=counts(read.state);
const state=upgradeState(read.state);

if(!validState(state)){
 console.error('The upgraded planner was rejected by validState(). Nothing was written.');
 process.exit(1);
}

console.log(`Source: ${source}`);
console.log(`Target: ${target}`);
console.log(`Owner:  ${read.owner}${read.owner===owner?'':` -> ${owner}`} (source revision ${read.revision})`);
const after=counts(state);
for(const key of Object.keys(after)){
 const delta=after[key]===before[key]?'':` (was ${before[key]})`;
 console.log(`  ${key.padEnd(16)} ${after[key]}${delta}`);
}

if(options['dry-run']==='true'){
 if(options.out)writeFileSync(path.resolve(root,options.out),JSON.stringify(state,null,1));
 console.log('Dry run: the target database was not modified.');
 process.exit(0);
}

const db=new DatabaseSync(target);
try{
 const existing=db.prepare('SELECT revision FROM assistant_state WHERE owner=?').get(owner);
 const payload=JSON.stringify(state);
 if(existing){
  db.prepare('UPDATE assistant_state SET payload=?,revision=revision+1 WHERE owner=?').run(payload,owner);
  console.log(`Replaced the existing planner for ${owner} (revision ${existing.revision+1}).`);
 }else{
  db.prepare('INSERT INTO assistant_state (owner,payload,revision) VALUES (?,?,?)').run(owner,payload,read.revision);
  console.log(`Inserted the planner for ${owner} (revision ${read.revision}).`);
 }
}finally{db.close();}
