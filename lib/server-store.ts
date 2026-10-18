import {readString,runtimeEnv} from './runtime-env';
import {localStore,bridgeStore} from './state-store';

export async function getStateStore(request:Request){
 const config=await runtimeEnv();
 // A plain Postgres URL wins: it is what a Vercel or Node host provides.
 const postgres=readString(config,'POSTGRES_URL')??readString(config,'DATABASE_URL');
 if(postgres){
  const {postgresStore}=await import('./postgres-store');
  return postgresStore(postgres);
 }
 const supabase=readString(config,'SUPABASE_URL'),secret=readString(config,'HOMEBASE_BRIDGE_SECRET');
 if(supabase||secret){
  if(!supabase||!secret)throw Error('Supabase configuration is incomplete');
  return bridgeStore(supabase,secret);
 }
 const host=new URL(request.url).hostname;
 if(!['localhost','127.0.0.1','[::1]'].includes(host))throw Error('Configure storage before hosting Homebase');
 const binding=config.DB as D1Database|undefined;
 if(!binding)throw Error('Local database unavailable');
 return localStore(binding);
}
