'use client';
import {useState} from 'react';
import {RotateCcw} from 'lucide-react';
import {offset} from '../../../lib/planner';
import type {SectionProps} from '../types';
import {Card,Empty,PageHead,Stat} from '../ui';

const longDate=(date:string)=>new Date(date+'T12:00:00Z').toLocaleDateString('en-AU',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'});
const stamp=(iso:string)=>new Date(iso).toLocaleString('en-AU',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});

export default function HistorySection({state,today,busy,change,go}:SectionProps){
 const [date,setDate]=useState(offset(today,-1));

 const dayTasks=state.tasks.filter(t=>t.date===date);
 const live=dayTasks.filter(t=>!t.deleted);
 const removed=dayTasks.filter(t=>t.deleted);
 const steps=state.routine.length;
 const checked=state.checks[date]?.length??0;
 const note=state.notes[date];

 return <div className="stack">
  <PageHead title="History" sub={`${state.history.length} recorded actions`} back={()=>go('dashboard')}/>

  <div className="stats">
   <Stat label="Days planned" value={state.plannedDates?.length??0} note="kept exactly as they were"/>
   <Stat label="Actions logged" value={state.history.length} note="most recent first"/>
   <Stat label="Deleted tasks" value={state.tasks.filter(t=>t.deleted).length} note="restorable"/>
  </div>

  <div className="split">
   <div className="main">
    <Card tone="lift" title="A day in the past" action={
     <div className="row">
      <label className="sr-only" htmlFor="history-date">Date</label>
      <input id="history-date" type="date" value={date} max={today} onChange={e=>setDate(e.target.value)} style={{width:'auto'}}/>
     </div>
    }>
     <p className="muted" style={{marginBottom:14}}>{longDate(date)}{steps?` · routine ${checked} of ${steps}`:''}{state.unlocked.includes(date)?' · morning confirmed':''}</p>

     {live.length===0&&removed.length===0
      ? <Empty>No list was recorded for this day.</Empty>
      : <>
        <div className="list">
         {live.map(task=><div key={task.id} className={task.done?'list-row done':'list-row'}>
          <span className="grow">{task.title}</span>
          {task.source&&<span className="tag">{task.source}</span>}
          <span className="tiny">{task.done?'Done':'Not done'}</span>
         </div>)}
        </div>
        {removed.length>0&&<div style={{marginTop:18}}>
         <div className="eyebrow" style={{marginBottom:8}}>Deleted that day</div>
         <div className="list">
          {removed.map(task=><div key={task.id} className="list-row">
           <span className="grow muted">{task.title}</span>
           <button type="button" className="btn btn-sm btn-ghost" disabled={busy}
            onClick={()=>change(`Restored task: ${task.title}`,s=>{
             const target=s.tasks.find(t=>t.id===task.id);
             if(target)delete target.deleted;
            })}>
            <RotateCcw size={14}/>Restore
           </button>
          </div>)}
         </div>
        </div>}
       </>}

     {note&&<div style={{marginTop:18,paddingTop:14,borderTop:'1px solid var(--line)'}}>
      <div className="eyebrow" style={{marginBottom:6}}>Note</div>
      <p style={{whiteSpace:'pre-wrap'}}>{note}</p>
     </div>}
    </Card>
   </div>

   <div className="rail">
    <Card eyebrow="Activity log">
     {state.history.length===0?<Empty>Nothing logged yet.</Empty>:<div className="list">
      {state.history.slice(0,60).map(item=><div key={item.id} className="list-row" style={{alignItems:'flex-start'}}>
       <span className="grow" style={{fontSize:13}}>{item.text}<br/><span className="tiny">{stamp(item.time)}</span></span>
      </div>)}
     </div>}
     {state.history.length>60&&<p className="tiny" style={{marginTop:10}}>Showing the 60 most recent of {state.history.length}.</p>}
    </Card>
   </div>
  </div>
 </div>;
}
