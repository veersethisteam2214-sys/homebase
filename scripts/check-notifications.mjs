import {build} from 'esbuild';
import assert from 'node:assert/strict';
await build({entryPoints:['app/api/motivation/route.ts'],bundle:true,platform:'node',format:'esm',outfile:'.sites-runtime/notification-test.mjs',plugins:[{name:'memory-store',setup(b){
 b.onResolve({filter:/lib\/server-store$/},()=>({path:'store',namespace:'test'}));
 b.onResolve({filter:/lib\/owner$/},()=>({path:'owner',namespace:'test'}));
 b.onLoad({filter:/.*/,namespace:'test'},args=>({contents:args.path==='owner'?"export function owner(request){return request.headers.get('oai-authenticated-user-id');}":"export function getStateStore(){return globalThis.__homebaseTestStore;}"}));
}}]});
const {POST}=await import('../.sites-runtime/notification-test.mjs');
const base={routine:[],listRevision:1,motivation:{enabled:true,phrases:[{id:'a',text:'A'},{id:'b',text:'B'}],nextAt:0,minMinutes:30,maxMinutes:90,startHour:0,endHour:0,lastIndex:-1,phoneEnabled:false,phoneTopic:''}};
let row={payload:JSON.stringify(base),revision:0};
globalThis.__homebaseTestStore={async read(){return {state:JSON.parse(row.payload),revision:row.revision};},async write(owner,state,revision){if(revision!==row.revision)return false;row={payload:JSON.stringify(state),revision:revision+1};return true;}};
const req=(mode='auto',headers={})=>new Request('http://localhost:5173/api/motivation',{method:'POST',headers:{'Content-Type':'application/json','oai-authenticated-user-id':'test','Origin':'http://localhost:5173',...headers},body:JSON.stringify({mode})});
assert.equal((await POST(req('auto',{'oai-authenticated-user-id':''}))).status,401);
assert.equal((await POST(req('auto',{Origin:'https://elsewhere.test'}))).status,403);
assert.equal((await POST(req('phone-test'))).status,400);
const claims=await Promise.all([POST(req()),POST(req())]);assert.deepEqual(claims.map(r=>r.status).sort(),[200,409]);
const success=await claims.find(r=>r.status===200).json();assert.ok(['A','B'].includes(success.phrase));assert.equal(success.delivery,'off');assert.ok(JSON.parse(row.payload).motivation.nextAt>Date.now());
assert.equal((await(await POST(req())).json()).skipped,true);
console.log('Passed: sign-in, origin checks, disabled phone channel, single claim across tabs, no unexpected external sends, future rescheduling.');
