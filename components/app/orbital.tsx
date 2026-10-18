'use client';
import {useEffect,useMemo,useState} from 'react';
import {ArrowRight,LayoutGrid} from 'lucide-react';
import {tasksFor,type State} from '../../lib/planner';
import {elapsed} from '../../lib/life';
import {minutesUntil} from '../../lib/clock';
import {sessionFor,sessionsThisWeek} from '../../lib/gym';
import {sections,type SectionId} from './section-meta';
import type {View} from './types';
import {useNow} from './ui';

type Orb={
 id:SectionId;
 label:string;
 value:string;
 detail:string;
 /** 0 to 1. Drives the arc around the node and how brightly it burns. */
 charge:number;
 urgent:boolean;
};

const milestones=[1,3,7,14,30,60,90,180,365];
const ratio=(part:number,whole:number)=>whole>0?Math.min(1,Math.max(0,part/whole)):0;

function orbFor(id:SectionId,state:State,today:string):Omit<Orb,'id'|'label'>{
 const tasks=tasksFor(state,today);
 const doneTasks=tasks.filter(t=>t.done).length;
 switch(id){
  case 'today':
   return {value:`${doneTasks}/${tasks.length}`,detail:tasks.length?`${tasks.length-doneTasks} still open`:'Nothing on the list',charge:ratio(doneTasks,tasks.length),urgent:false};
  case 'gym':{
   const gym=state.gym;
   if(!gym)return {value:'—',detail:'Not set up',charge:0,urgent:false};
   const session=sessionFor(gym,today),count=sessionsThisWeek(gym,today);
   return {value:session?session.name:'Rest',detail:`${count} of ${gym.weeklyGoal} this week`,charge:ratio(count,gym.weeklyGoal),urgent:false};
  }
  case 'goals':{
   const total=state.goals.length;
   const average=total?state.goals.reduce((sum,g)=>sum+(g.progress||0),0)/total:0;
   return {value:`${Math.round(average)}%`,detail:total?`${total} in play`:'None set',charge:average/100,urgent:false};
  }
  case 'assignments':{
   const pending=state.assignments.filter(a=>!['submitted','graded'].includes(a.status));
   const next=[...pending].sort((a,b)=>a.date.localeCompare(b.date))[0];
   const soon=pending.filter(a=>a.date<=today).length>0;
   return {
    value:String(pending.length),
    detail:next?(next.date<=today?'Due today':`Next ${new Date(next.date+'T12:00:00Z').toLocaleDateString('en-AU',{day:'numeric',month:'short',timeZone:'UTC'})}`):'Nothing due',
    charge:ratio(state.assignments.length-pending.length,state.assignments.length),
    urgent:soon,
   };
  }
  case 'projects':{
   const active=state.projects.filter(p=>p.active).length;
   return {value:String(active),detail:`${state.projects.length} in total`,charge:ratio(active,state.projects.length),urgent:false};
  }
  case 'watch':{
   const videos=state.videos??[];
   const watched=videos.filter(v=>v.watched).length;
   return {value:String(videos.length-watched),detail:videos.length?`${watched} watched`:'Nothing saved',charge:ratio(watched,videos.length),urgent:false};
  }
  case 'clock':{
   const clock=state.clock;
   if(!clock)return {value:'—',detail:'No alarms',charge:0,urgent:false};
   const on=clock.alarms.filter(a=>a.enabled);
   const soonest=on.map(a=>minutesUntil(a)).filter((m):m is number=>m!==null).sort((a,b)=>a-b)[0];
   return {
    value:String(on.length),
    detail:soonest===undefined?'None scheduled':soonest<60?`Rings in ${soonest} min`:`Rings in ${Math.floor(soonest/60)}h`,
    charge:ratio(on.length,Math.max(1,clock.alarms.length)),
    urgent:soonest!==undefined&&soonest<30,
   };
  }
  case 'reminders':{
   const on=state.reminders.filter(r=>r.enabled).length;
   return {value:String(on),detail:state.motivation?.enabled?'Motivation active':'Motivation paused',charge:ratio(on,Math.max(1,state.reminders.length)),urgent:false};
  }
  case 'streak':{
   const days=elapsed(state.streak?.startedAt??null).days;
   const target=milestones.find(d=>d>days)??Math.ceil((days+1)/100)*100;
   return {value:state.streak?.startedAt?String(days):'—',detail:state.streak?.startedAt?`${target-days} to ${target}`:'Not started',charge:ratio(days,target),urgent:false};
  }
  case 'history':
   return {value:String(state.history.length),detail:`${state.plannedDates?.length??0} days kept`,charge:0.35,urgent:false};
  default:
   return {value:'—',detail:'',charge:0,urgent:false};
 }
}

function greeting(hour:number){
 if(hour<12)return 'Good morning';
 if(hour<18)return 'Good afternoon';
 return 'Good evening';
}

export default function Orbital({state,today,go,onListView}:{state:State;today:string;go:(view:View)=>void;onListView:()=>void}){
 const now=useNow(1000);
 const [picked,setPicked]=useState<SectionId|null>(null);

 const orbs=useMemo<Orb[]>(()=>sections.filter(s=>s.onDashboard).map(section=>({
  id:section.id,
  label:section.label,
  ...orbFor(section.id,state,today),
 })),[state,today]);

 // Escape clears the selection, so the orbit is never a trap for keyboard users.
 useEffect(()=>{
  if(!picked)return;
  const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')setPicked(null);};
  document.addEventListener('keydown',onKey);
  return()=>document.removeEventListener('keydown',onKey);
 },[picked]);

 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Australia/Hobart',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(now));
 const hour=Number(parts.find(p=>p.type==='hour')?.value??'0');
 const clock=`${parts.find(p=>p.type==='hour')?.value}:${parts.find(p=>p.type==='minute')?.value}`;
 const date=new Date(today+'T12:00:00Z').toLocaleDateString('en-AU',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'});

 const tasks=tasksFor(state,today);
 const steps=state.routine.length,checked=state.checks[today]?.length??0;
 // One number for the whole day: the list and the morning routine together.
 const dayDone=tasks.filter(t=>t.done).length+checked;
 const dayTotal=tasks.length+steps;
 const dayCharge=ratio(dayDone,dayTotal);

 const selected=picked?orbs.find(o=>o.id===picked)??null:null;
 const selectedMeta=picked?sections.find(s=>s.id===picked)??null:null;
 const circumference=2*Math.PI*46;

 return <div className="orbital">
  <div className="orbital-head">
   <div>
    <p className="orbital-eyebrow">{date}</p>
    <h1 className="orbital-greeting">{greeting(hour)}{state.displayName?`, ${state.displayName.split(/\s+/)[0]}`:''}</h1>
   </div>
   <button type="button" className="orbital-switch" onClick={onListView}>
    <LayoutGrid size={15}/>List view
   </button>
  </div>

  <div className="orbital-field">
   <div className="orbital-glow" aria-hidden="true"/>
   <div className="orbital-track" aria-hidden="true"/>
   <div className="orbital-sweep" aria-hidden="true"/>

   <div className={picked?'orbital-ring is-paused':'orbital-ring'}>
    {orbs.map((orb,index)=>{
     const angle=(index/orbs.length)*Math.PI*2-Math.PI/2;
     const left=50+36*Math.cos(angle);
     const top=50+36*Math.sin(angle);
     const Icon=sections.find(s=>s.id===orb.id)?.icon;
     const active=picked===orb.id;
     return <div key={orb.id} className="orbital-slot" style={{left:`${left}%`,top:`${top}%`}}>
      <div className={picked?'orbital-upright is-paused':'orbital-upright'}>
       <button
        type="button"
        className={`orbital-node${active?' is-active':''}${orb.urgent?' is-urgent':''}`}
        aria-pressed={active}
        aria-label={`${orb.label}: ${orb.value}, ${orb.detail}`}
        onClick={()=>setPicked(active?null:orb.id)}
        onDoubleClick={()=>go(orb.id)}
       >
        <svg className="orbital-arc" viewBox="0 0 100 100" aria-hidden="true">
         <circle className="orbital-arc-bed" cx="50" cy="50" r="46"/>
         <circle className="orbital-arc-fill" cx="50" cy="50" r="46"
          strokeDasharray={`${circumference*orb.charge} ${circumference}`}/>
        </svg>
        <span className="orbital-node-face">
         {Icon?<Icon size={19}/>:null}
        </span>
       </button>
       <span className="orbital-label">
        <b>{orb.label}</b>
        <i>{orb.value}</i>
       </span>
      </div>
     </div>;
    })}
   </div>

   <div className="orbital-core">
    <svg className="orbital-core-arc" viewBox="0 0 100 100" aria-hidden="true">
     <circle className="orbital-arc-bed" cx="50" cy="50" r="46"/>
     <circle className="orbital-arc-fill" cx="50" cy="50" r="46"
      strokeDasharray={`${circumference*dayCharge} ${circumference}`}/>
    </svg>
    {selected&&selectedMeta
     ? <div className="orbital-core-body">
       <span className="orbital-core-kicker">{selectedMeta.label}</span>
       <strong className="orbital-core-value">{selected.value}</strong>
       <span className="orbital-core-detail">{selected.detail}</span>
       <button type="button" className="orbital-open" onClick={()=>go(selected.id)}>
        Open <ArrowRight size={14}/>
       </button>
      </div>
     : <div className="orbital-core-body">
       <span className="orbital-core-kicker">Hobart</span>
       <strong className="orbital-core-clock">{clock}</strong>
       <span className="orbital-core-detail">{dayTotal?`${dayDone} of ${dayTotal} done`:'Nothing planned yet'}</span>
      </div>}
   </div>
  </div>

  <p className="orbital-hint">{picked?'Press escape to clear, or open the section.':'Select a node to see it, double click to open it.'}</p>
 </div>;
}
