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
// owner() reads its environment through lib/runtime-env.ts, which falls back to
// process.env wherever cloudflare:workers cannot be imported. Each bundle keeps its own
// cached environment, so the two hosting modes are exercised as separate modules.
const identity=email=>new Request('https://homebase.example.test/api/state',{headers:{'oai-authenticated-user-id':'verified-id','oai-authenticated-user-email':email}});
const anonymous=()=>new Request('https://homebase.example.test/api/state');

await build({entryPoints:['lib/owner.ts'],bundle:true,platform:'node',format:'esm',outfile:'.sites-runtime/owner-sites.mjs'});
process.env.SUPABASE_URL=cfg.url;process.env.HOMEBASE_OWNER_EMAIL='owner@example.test';
const sites=await import('../.sites-runtime/owner-sites.mjs');
assert.equal(await sites.owner(identity('owner@example.test')),'primary');
assert.equal(await sites.owner(identity('another@example.test')),null);
assert.equal(await sites.owner(anonymous()),null);

// A single-user host fronts the app with its own access control, so every request that
// arrives belongs to the owner — including one carrying no platform identity at all.
await build({entryPoints:['lib/owner.ts'],bundle:true,platform:'node',format:'esm',outfile:'.sites-runtime/owner-single.mjs'});
process.env.HOMEBASE_SINGLE_USER='1';
const single=await import('../.sites-runtime/owner-single.mjs');
assert.equal(await single.owner(anonymous()),'primary');
assert.equal(await single.owner(identity('anyone@example.test')),'primary');

// pg parses the connection string over the top of explicit options, so an sslmode left
// in the string silently wins and managed providers fail with a certificate error.
await build({entryPoints:['lib/pg-connection.ts'],bundle:true,platform:'node',format:'esm',outfile:'.sites-runtime/postgres-test.mjs'});
const {pgConnection}=await import('../.sites-runtime/postgres-test.mjs');
const base='postgresql://postgres.abc:p%40ss%2Bword@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres';

const required=pgConnection(base+'?sslmode=require');
assert.equal(required.connectionString,base,'sslmode must leave the string entirely');
assert.deepEqual(required.ssl,{rejectUnauthorized:false});

assert.equal(pgConnection(base+'?sslmode=require&pgbouncer=true').connectionString,base+'?pgbouncer=true');
assert.equal(pgConnection(base+'?pgbouncer=true&sslmode=require').connectionString,base+'?pgbouncer=true');
assert.deepEqual(pgConnection(base+'?sslmode=verify-full').ssl,{rejectUnauthorized:true});
assert.equal(pgConnection(base+'?sslmode=disable').ssl,false);

const plain=pgConnection(base);
assert.equal(plain.connectionString,base,'a string without sslmode is left untouched');
assert.deepEqual(plain.ssl,{rejectUnauthorized:false});
// The credentials must survive verbatim; re-encoding them breaks authentication.
assert.ok(required.connectionString.includes('p%40ss%2Bword'));

console.log('Passed: bridge authentication, invalid-owner rejection, preserved existing data, concurrent update conflict, hosted owner allowlist, single-user host, Postgres SSL mode handling.');
