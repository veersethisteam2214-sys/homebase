import {Pool} from 'pg';
import type {State} from './planner';
import type {StateStore,StoredState} from './state-store';

// One pool per connection string, kept across invocations so a warm serverless
// function reuses its connections instead of opening one per request.
const pools=new Map<string,Pool>();
const prepared=new Set<string>();

/**
 * node-postgres treats sslmode=require as verify-full, which rejects managed providers
 * whose chain is not in Node's trust store — Supabase's pooler among them. libpq's own
 * meaning for `require` is encrypt without verifying the chain, which is what a string
 * asking for `require` actually intends, so honour that. Asking for `verify-full`
 * explicitly keeps full verification.
 */
function sslFor(connectionString:string){
 let mode:string|null=null;
 try{mode=new URL(connectionString).searchParams.get('sslmode');}catch{/* keyword DSNs fall through to the default */}
 if(mode==='disable')return false;
 if(mode==='verify-full'||mode==='verify-ca')return {rejectUnauthorized:true};
 return {rejectUnauthorized:false};
}

function poolFor(connectionString:string){
 let pool=pools.get(connectionString);
 if(!pool){
  pool=new Pool({connectionString,ssl:sslFor(connectionString),max:3,idleTimeoutMillis:10000,connectionTimeoutMillis:8000});
  // A dropped idle connection must not take the process down with it.
  pool.on('error',()=>{});
  pools.set(connectionString,pool);
 }
 return pool;
}

async function ready(pool:Pool,key:string){
 if(prepared.has(key))return;
 await pool.query('CREATE TABLE IF NOT EXISTS assistant_state (owner text PRIMARY KEY, payload text NOT NULL, revision integer NOT NULL DEFAULT 0)');
 prepared.add(key);
}

/**
 * The hosted store. Mirrors localStore exactly, including the optimistic concurrency
 * check, so a second device editing the same planner loses the race rather than
 * silently overwriting it.
 */
export function postgresStore(connectionString:string):StateStore{
 const pool=poolFor(connectionString);
 return {
  kind:'postgres',
  async read(owner){
   await ready(pool,connectionString);
   const result=await pool.query<{payload:string;revision:number}>('SELECT payload,revision FROM assistant_state WHERE owner=$1',[owner]);
   const row=result.rows[0];
   return row?{state:JSON.parse(row.payload) as State,revision:Number(row.revision)} satisfies StoredState:null;
  },
  async create(owner,state){
   await ready(pool,connectionString);
   await pool.query('INSERT INTO assistant_state (owner,payload,revision) VALUES ($1,$2,0) ON CONFLICT (owner) DO NOTHING',[owner,JSON.stringify(state)]);
  },
  async write(owner,state,revision){
   await ready(pool,connectionString);
   const result=await pool.query('UPDATE assistant_state SET payload=$1,revision=revision+1 WHERE owner=$2 AND revision=$3',[JSON.stringify(state),owner,revision]);
   return (result.rowCount??0)>0;
  },
 };
}
