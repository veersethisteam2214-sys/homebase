import {getStateStore} from '../../../lib/server-store';
import {owner as getOwner} from '../../../lib/owner';
import type {State} from '../../../lib/planner';
import {inActiveHours,nextNudge,upgradeLife} from '../../../lib/life';
export async function POST(request:Request){
 const owner=getOwner(request);if(!owner)return Response.json({error:'Sign in first.'},{status:401});
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Invalid origin.'},{status:403});
 try{
  const {mode}=await request.json() as {mode:string};if(!['auto','phone-test'].includes(mode))return Response.json({error:'Unknown notification request.'},{status:400});
  const store=getStateStore(request),row=await store.read(owner);
  if(!row)return Response.json({error:'Open your planner first.'},{status:400});
  const state=upgradeLife(row.state as State),config=state.motivation!,now=Date.now();
  if(mode==='auto'&&(!config.enabled||!config.phrases.length||config.nextAt>now||!inActiveHours(config.startHour,config.endHour)))return Response.json({state,revision:row.revision,skipped:true});
  if(mode==='phone-test'&&(!config.phoneEnabled||!config.phoneTopic))return Response.json({error:'Enable your phone channel first.'},{status:400});
  if(mode==='phone-test'&&now-(config.lastPhoneAt||0)<15000)return Response.json({error:'Wait 15 seconds before sending another test.'},{status:429});
  if(!config.phrases.length)return Response.json({error:'Add a phrase first.'},{status:400});
  const candidates=config.phrases.map((_,i)=>i).filter(i=>i!==config.lastIndex);const index=candidates.length?candidates[Math.floor(Math.random()*candidates.length)]:0;
  const phrase=config.phrases[index].text;
  if(mode==='auto'){config.lastIndex=index;config.nextAt=nextNudge(config.minMinutes,config.maxMinutes,now);}
  if(config.phoneEnabled)config.lastPhoneAt=now;
  // Claim atomically before sending so simultaneous tabs cannot duplicate a nudge.
  const claimed=await store.write(owner,state,row.revision);
  if(!claimed)return Response.json({conflict:true},{status:409});
  let delivery='off';
  if(config.phoneEnabled&&/^homebase-[a-f0-9]{32}$/.test(config.phoneTopic)){
   try{const response=await fetch('https://ntfy.sh/'+config.phoneTopic,{method:'POST',headers:{'Title':'Homebase - your reminder','Content-Type':'text/plain; charset=utf-8','Cache':'no'},body:phrase,signal:AbortSignal.timeout(8000)});delivery=response.ok?'sent':'failed';}catch{delivery='failed';}
  }
  return Response.json({state,revision:row.revision+1,phrase,delivery},{headers:{'Cache-Control':'no-store'}});
 }catch(e){console.error('Motivation request failed',e instanceof Error?e.message:'unknown');return Response.json({error:'The reminder could not be prepared. Try again.'},{status:503});}
}
