'use client';
import {ArrowRight} from 'lucide-react';
import {quoteFor,tasksFor,type State} from '../../lib/planner';
import {elapsed} from '../../lib/life';
import {minutesUntil} from '../../lib/clock';
import {sessionFor,sessionsThisWeek} from '../../lib/gym';
import {sections,type SectionId} from './section-meta';
import type {View} from './types';
import {Stat} from './ui';

const pretty=(date:string)=>new Date(date+'T12:00:00Z').toLocaleDateString('en-AU',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'});
const shortDate=(date:string)=>new Date(date+'T12:00:00Z').toLocaleDateString('en-AU',{day:'numeric',month:'short',timeZone:'UTC'});

function greeting(){
 const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Australia/Hobart',hour:'2-digit',hourCycle:'h23'}).format(new Date()));
 if(hour<12)return 'Good morning';
 if(hour<18)return 'Good afternoon';
 return 'Good evening';
}

type Line={label:string;value:string};

function linesFor(id:SectionId,state:State,today:string):Line[]{
 const tasks=tasksFor(state,today);
 switch(id){
  case 'today':{
   const open=tasks.filter(t=>!t.done).length;
   const steps=state.routine.length,checked=state.checks[today]?.length??0;
   return [{label:'Open tasks',value:String(open)},{label:'Done today',value:`${tasks.length-open} of ${tasks.length}`},{label:'Morning routine',value:steps?`${checked} of ${steps}`:'Not set up'}];
  }
  case 'gym':{
   const gym=state.gym;
   if(!gym)return [{label:'Set up',value:'Not yet'}];
   const session=sessionFor(gym,today);
   return [{label:'Today',value:session?session.name:'Rest day'},{label:'This week',value:`${sessionsThisWeek(gym,today)} of ${gym.weeklyGoal}`},{label:'Personal bests',value:String(gym.bests.length)}];
  }
  case 'goals':{
   const total=state.goals.length;
   const average=total?Math.round(state.goals.reduce((sum,g)=>sum+(g.progress||0),0)/total):0;
   return [{label:'Goals',value:String(total)},{label:'Average progress',value:`${average}%`},{label:'Complete',value:String(state.goals.filter(g=>g.progress>=100).length)}];
  }
  case 'assignments':{
   const pending=state.assignments.filter(a=>!['submitted','graded'].includes(a.status));
   const next=[...pending].sort((a,b)=>a.date.localeCompare(b.date))[0];
   return [{label:'Still to do',value:String(pending.length)},{label:'Next due',value:next?shortDate(next.date):'Nothing due'},{label:'Graded',value:String(state.assignments.filter(a=>a.status==='graded').length)}];
  }
  case 'projects':{
   const active=state.projects.filter(p=>p.active);
   return [{label:'Active',value:String(active.length)},{label:'Paused',value:String(state.projects.length-active.length)},{label:'Running today',value:String(tasks.filter(t=>t.source==='Project schedule').length)}];
  }
  case 'watch':{
   const videos=state.videos??[];
   return [{label:'Saved',value:String(videos.length)},{label:'Not watched',value:String(videos.filter(v=>!v.watched).length)}];
  }
  case 'clock':{
   const clock=state.clock;
   if(!clock)return [{label:'Alarms',value:'0'}];
   const enabled=clock.alarms.filter(a=>a.enabled);
   const soonest=enabled.map(a=>minutesUntil(a)).filter((m):m is number=>m!==null).sort((a,b)=>a-b)[0];
   const running=clock.timers.filter(t=>t.endsAt!==null).length;
   return [
    {label:'Alarms on',value:`${enabled.length} of ${clock.alarms.length}`},
    {label:'Next alarm',value:soonest===undefined?'None set':soonest<60?`In ${soonest} min`:`In ${Math.floor(soonest/60)}h ${soonest%60}m`},
    {label:'Timers running',value:String(running)},
   ];
  }
  case 'reminders':{
   const enabled=state.reminders.filter(r=>r.enabled).length;
   return [{label:'Reminders on',value:`${enabled} of ${state.reminders.length}`},{label:'Random motivation',value:state.motivation?.enabled?'Active':'Paused'},{label:'Phrases',value:String(state.motivation?.phrases.length??0)}];
  }
  case 'streak':{
   const time=elapsed(state.streak?.startedAt??null);
   return [{label:'Current',value:state.streak?.startedAt?`${time.days} days`:'Not started'},{label:'Previous runs',value:String(state.streak?.past.length??0)}];
  }
  case 'history':
   return [{label:'Entries',value:String(state.history.length)},{label:'Days recorded',value:String(state.plannedDates?.length??0)}];
  default:
   return [];
 }
}

export default function Overview({state,today,go}:{state:State;today:string;go:(view:View)=>void}){
 const tasks=tasksFor(state,today);
 const open=tasks.filter(t=>!t.done).length;
 const steps=state.routine.length,checked=state.checks[today]?.length??0;
 const routineDone=steps>0&&checked>=steps;
 const pending=state.assignments.filter(a=>!['submitted','graded'].includes(a.status));
 const dueWeek=pending.filter(a=>a.date<=new Date(Date.parse(today+'T12:00:00Z')+6*86400000).toISOString().slice(0,10)).length;
 const session=state.gym?sessionFor(state.gym,today):null;
 const time=elapsed(state.streak?.startedAt??null);

 return <div className="stack">
  <div className="page-head">
   <div>
    <h1>{greeting()}{state.displayName?`, ${state.displayName.split(/\s+/)[0]}`:''}</h1>
    <p>{pretty(today)}</p>
   </div>
   <p className="muted" style={{fontFamily:'var(--serif)',fontStyle:'italic',fontSize:17,maxWidth:420,textAlign:'right'}}>{quoteFor(today)}</p>
  </div>

  <div className="stats">
   <Stat label="Open tasks" value={open} note={`${tasks.length} on today’s list`}/>
   <Stat label="Morning routine" value={steps?`${checked}/${steps}`:'—'} note={routineDone?'Finished':'Still to do'}/>
   <Stat label="Due this week" value={dueWeek} note="assignments"/>
   <Stat label="Gym today" value={session?session.name:'Rest'} note={state.gym?`${sessionsThisWeek(state.gym,today)} of ${state.gym.weeklyGoal} this week`:'not set up'}/>
   <Stat label="Streak" value={state.streak?.startedAt?time.days:'—'} note={state.streak?.startedAt?'days':'not started'}/>
  </div>

  <div className="sections">
   {sections.filter(s=>s.onDashboard).map(section=>{
    const Icon=section.icon;
    return <button key={section.id} type="button" className="section-card" onClick={()=>go(section.id)}>
     <div className="section-card-top">
      <span className="section-icon" aria-hidden="true"><Icon size={18}/></span>
      <h2>{section.label}</h2>
     </div>
     <p className="tiny" style={{lineHeight:1.5}}>{section.blurb}</p>
     <ul className="section-lines">
      {linesFor(section.id,state,today).map(line=><li key={line.label}><span>{line.label}</span><b>{line.value}</b></li>)}
     </ul>
     <span className="section-foot">Open {section.label.toLowerCase()} <ArrowRight size={15}/></span>
    </button>;
   })}
  </div>
 </div>;
}
