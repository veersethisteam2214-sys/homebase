import {env} from 'cloudflare:workers';
import {localStore,bridgeStore} from './state-store';
export function getStateStore(request:Request){
 const config=env as Cloudflare.Env;
 if(config.SUPABASE_URL||config.HOMEBASE_BRIDGE_SECRET){
  if(!config.SUPABASE_URL||!config.HOMEBASE_BRIDGE_SECRET)throw Error('Supabase configuration is incomplete');
  return bridgeStore(config.SUPABASE_URL,config.HOMEBASE_BRIDGE_SECRET);
 }
 const host=new URL(request.url).hostname;
 if(!['localhost','127.0.0.1','[::1]'].includes(host))throw Error('Configure Supabase before hosting Homebase');
 if(!config.DB)throw Error('Local database unavailable');
 return localStore(config.DB);
}
