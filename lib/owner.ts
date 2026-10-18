import {readString,runtimeEnv} from './runtime-env';

/**
 * Who is making this request, or null when nobody is signed in.
 *
 * On OpenAI Sites the identity arrives in headers the platform injects. A host that has
 * no such platform — Vercel, say — instead sits behind its own access control, and sets
 * HOMEBASE_SINGLE_USER=1 to say so: everything that gets through belongs to one owner.
 * Only set that variable on a deployment that is actually protected, because it tells
 * this app to stop checking for itself.
 */
export async function owner(request:Request){
 const config=await runtimeEnv();
 if(readString(config,'HOMEBASE_SINGLE_USER')==='1')return 'primary';
 const id=request.headers.get('oai-authenticated-user-id');if(!id)return null;
 if(readString(config,'SUPABASE_URL')){
  const expected=readString(config,'HOMEBASE_OWNER_EMAIL')?.toLowerCase();
  const email=request.headers.get('oai-authenticated-user-email')?.toLowerCase();
  return expected&&email===expected?'primary':null;
 }
 return ['localhost','127.0.0.1','[::1]'].includes(new URL(request.url).hostname)?id:null;
}
