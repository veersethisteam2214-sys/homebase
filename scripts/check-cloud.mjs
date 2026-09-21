import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {handle} from '../supabase/functions/homebase-store/index.js';
const key='a'.repeat(64),digest=createHash('sha256').update(key).digest('hex');
let row=null,reads=0;
const send=async(url,options)=>{const u=new URL(url);reads++;if(u.pathname.endsWith('homebase_bridge_keys'))return Response.json(u.searchParams.get('token_hash')==='eq.'+digest?[{token_hash:digest}]:[]);
 if(options.method==='GET')return Response.json(row?[structuredClone(row)]:[]);
 const body=JSON.parse(options.body);
 if(options.method==='POST'){row??=body;return new Response(null,{status:201});}
 if(options.method==='PATCH'){if(row&&u.searchParams.get('revision')==='eq.'+row.revision){row={...row,...body};return Response.json([row]);}return Response.json([]);}
 throw Error('Unexpected request');
};
const cfg={url:'https://test.supabase.co',serviceKey:'server-only'};
const req=(body,token=key)=>new Request('https://test.supabase.co/functions/v1/homebase-store',{method:'POST',headers:{'x-homebase-key':token},body:JSON.stringify(body)});
assert.equal((await handle(req({action:'read',owner:'primary'},''),cfg,send)).status,401);assert.equal(reads,0);
assert.equal((await handle(req({action:'read',owner:'primary'},'b'.repeat(64)),cfg,send)).status,401);
assert.equal((await handle(req({action:'read',owner:'someone-else'}),cfg,send)).status,403);
await handle(req({action:'create',owner:'primary',state:{tasks:[]}}),cfg,send);
await handle(req({action:'create',owner:'primary',state:{tasks:['do not overwrite']}}),cfg,send);
assert.deepEqual(row.payload,{tasks:[]});
const writes=await Promise.all([1,2].map(n=>handle(req({action:'write',owner:'primary',state:{value:n},revision:0}),cfg,send).then(r=>r.json())));
assert.equal(writes.filter(r=>r.written).length,1);assert.equal(row.revision,1);
await build({entryPoints:['lib/owner.ts'],bundle:true,platform:'node',format:'esm',outfile:'.sites-runtime/owner-test.mjs',plugins:[{name:'env',setup(b){b.onResolve({filter:/^cloudflare:workers$/},()=>({path:'env',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const env=globalThis.__ownerEnv;'}));}}]});
globalThis.__ownerEnv={SUPABASE_URL:cfg.url,HOMEBASE_OWNER_EMAIL:'owner@example.test'};
const {owner}=await import('../.sites-runtime/owner-test.mjs');
const identity=email=>new Request('https://homebase.example.test/api/state',{headers:{'oai-authenticated-user-id':'verified-id','oai-authenticated-user-email':email}});
assert.equal(owner(identity('owner@example.test')),'primary');assert.equal(owner(identity('another@example.test')),null);assert.equal(owner(new Request('https://homebase.example.test/api/state')),null);
console.log('Passed: bridge authentication, invalid-owner rejection, preserved existing data, concurrent update conflict, hosted owner allowlist.');
