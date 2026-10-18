import type {State} from './planner';

export type StoredState={state:State;revision:number};
export interface StateStore {
 kind:'local'|'supabase'|'postgres';
 read(owner:string):Promise<StoredState|null>;
 create(owner:string,state:State):Promise<void>;
 write(owner:string,state:State,revision:number):Promise<boolean>;
}

export function bridgeStore(url:string,secret:string,send:typeof fetch=fetch):StateStore {
 const origin=new URL(url);
 if(origin.protocol!=='https:'||!origin.hostname.endsWith('.supabase.co')||origin.pathname!=='/'||origin.username||origin.password)throw Error('Invalid Supabase URL');
 async function call(action:string,owner:string,state?:State,revision?:number){
  const response=await send(new URL('/functions/v1/homebase-store',origin),{method:'POST',headers:{'Content-Type':'application/json','x-homebase-key':secret},body:JSON.stringify({action,owner,state,revision}),signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error('Cloud storage request failed ('+response.status+')');
  return response.json() as Promise<{row:StoredState|null;written:boolean}>;
 }
 return {kind:'supabase',read:async owner=>(await call('read',owner)).row,create:async(owner,state)=>{await call('create',owner,state);},write:async(owner,state,revision)=>(await call('write',owner,state,revision)).written};
}

export function localStore(db:D1Database):StateStore {return {kind:'local',
 async read(owner){const row=await db.prepare('SELECT payload,revision FROM assistant_state WHERE owner=?').bind(owner).first<{payload:string;revision:number}>();return row?{state:JSON.parse(row.payload),revision:row.revision}:null;},
 async create(owner,state){await db.prepare('INSERT OR IGNORE INTO assistant_state (owner,payload,revision) VALUES (?,?,0)').bind(owner,JSON.stringify(state)).run();},
 async write(owner,state,revision){const result=await db.prepare('UPDATE assistant_state SET payload=?,revision=revision+1 WHERE owner=? AND revision=?').bind(JSON.stringify(state),owner,revision).run();return Boolean(result.meta.changes);}
};}
