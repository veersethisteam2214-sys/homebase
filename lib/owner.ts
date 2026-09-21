import {env} from 'cloudflare:workers';
export function owner(request:Request){
 const id=request.headers.get('oai-authenticated-user-id');if(!id)return null;
 const config=env as Cloudflare.Env;
 if(config.SUPABASE_URL){
  const expected=config.HOMEBASE_OWNER_EMAIL?.toLowerCase();
  const email=request.headers.get('oai-authenticated-user-email')?.toLowerCase();
  return expected&&email===expected?'primary':null;
 }
 return ['localhost','127.0.0.1','[::1]'].includes(new URL(request.url).hostname)?id:null;
}
