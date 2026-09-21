// Server-to-server endpoint: the Sites server holds a random bridge secret.
// Only its SHA-256 digest is stored in Postgres; no browser receives the key.
export async function handle(request, config, send=fetch) {
 const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
 if(request.method!=='POST')return json({error:'Method not allowed'},405);
 const token=request.headers.get('x-homebase-key')||'';
 if(!/^[a-f0-9]{64}$/.test(token))return json({error:'Unauthorized'},401);
 if(!config.url||!config.serviceKey)return json({error:'Storage unavailable'},503);
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
 const hash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
 const headers={apikey:config.serviceKey,'Content-Type':'application/json',...(config.serviceKey.startsWith('eyJ')?{Authorization:'Bearer '+config.serviceKey}:{})};
 async function db(table,method,query,body,prefer){
  const url=new URL('/rest/v1/'+table,config.url);for(const[k,v]of Object.entries(query))url.searchParams.set(k,v);
  const response=await send(url,{method,headers:{...headers,...(prefer?{Prefer:prefer}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Error('Storage error '+response.status+' on '+table);const text=await response.text();return text?JSON.parse(text):[];
 }
 try {
  const keys=await db('homebase_bridge_keys','GET',{token_hash:'eq.'+hash,enabled:'eq.true',select:'token_hash',limit:'1'});
  if(keys.length!==1)return json({error:'Unauthorized'},401);
  const raw=await request.text();if(raw.length>2100000)return json({error:'Payload too large'},413);
  let input;try{input=JSON.parse(raw);}catch{return json({error:'Invalid JSON'},400);}
  if(input.owner!=='primary')return json({error:'Forbidden'},403);
  const {action,owner,state,revision}=input;
  if(action==='read'){
   const rows=await db('homebase_state','GET',{owner:'eq.'+owner,select:'payload,revision',limit:'1'});
   return json({row:rows.length?{state:rows[0].payload,revision:rows[0].revision}:null});
  }
  if(!['create','write'].includes(action)||!state||typeof state!=='object'||Array.isArray(state))return json({error:'Invalid request'},400);
  if(action==='create'){
   await db('homebase_state','POST',{on_conflict:'owner'},{owner,payload:state,revision:0},'resolution=ignore-duplicates,return=minimal');return json({ok:true});
  }
  if(!Number.isSafeInteger(revision)||revision<0)return json({error:'Invalid revision'},400);
  const rows=await db('homebase_state','PATCH',{owner:'eq.'+owner,revision:'eq.'+revision},{payload:state,revision:revision+1},'return=representation');
  return json({written:rows.length===1});
 }catch(error){console.error(error instanceof Error?error.message:'Storage error');return json({error:'Storage unavailable'},503);}
}
if(typeof Deno!=='undefined')Deno.serve(request=>{
 const keys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');
 return handle(request,{url:Deno.env.get('SUPABASE_URL'),serviceKey:keys.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')});
});
