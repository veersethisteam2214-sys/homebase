import {initialState} from '../../../lib/planner';
import {getStateStore} from '../../../lib/server-store';
import {owner} from '../../../lib/owner';
import {validState} from '../../../lib/validate-state';
import {upgradeState} from './read-state';
export async function GET(request:Request){try{
 const user=await owner(request);if(!user)return Response.json({error:'Sign in to open your Homebase.'},{status:401});
 const store=await getStateStore(request);await store.create(user,upgradeState(initialState()));
 for(let attempt=0;attempt<3;attempt++){
  const row=await store.read(user);if(!row)throw Error('Planner unavailable');
  const before=JSON.stringify(row.state),state=upgradeState(row.state);let revision=row.revision;
  if(JSON.stringify(state)!==before){if(!await store.write(user,state,revision))continue;revision++;}
  return Response.json({state,revision,storage:store.kind},{headers:{'Cache-Control':'no-store'}});
 }
 return Response.json({error:'Your planner is being updated on another device. Please retry.'},{status:409});
}catch(e){console.error(e instanceof Error?e.message:'Storage error');return Response.json({error:'Your planner could not be loaded. Please retry.'},{status:503});}}
export async function PUT(request:Request){try{
 const user=await owner(request);if(!user)return Response.json({error:'Please sign in again.'},{status:401});
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Invalid origin'},{status:403});
 const body=await request.text();if(body.length>2000000)return Response.json({error:'Planner is too large to save.'},{status:413});
 let input;try{input=JSON.parse(body);}catch{return Response.json({error:'Invalid JSON.'},{status:400});}
 const {state,revision}=input;
 if(!Number.isSafeInteger(revision)||revision<0||!validState(state))return Response.json({error:'Invalid planner data.'},{status:400});
 if(!await (await getStateStore(request)).write(user,state,revision))return Response.json({error:'Your planner changed on another device. Export your draft, then reload to see the latest version.'},{status:409});
 return Response.json({revision:revision+1});
}catch(e){console.error(e instanceof Error?e.message:'Storage error');return Response.json({error:'Changes could not be saved. Your draft is still on screen; retry saving.'},{status:503});}}
