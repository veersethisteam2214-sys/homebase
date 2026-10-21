'use client';
import {useEffect,useRef} from 'react';
import {ArrowRight,Dumbbell,Star,Trash2} from 'lucide-react';
import {capitalise,tasksFor,type Task} from '../../../lib/planner';
import {sessionFor} from '../../../lib/gym';
import type {SectionProps} from '../types';
import {Bar,Card,ConfirmButton,Empty,PageHead} from '../ui';

const MAX_CRITICAL=3;
/** The list always offers this many lines, so it reads as a page to fill in. */
const MIN_ROWS=5;
const shortDate=(date:string)=>new Date(date+'T12:00:00Z').toLocaleDateString('en-AU',{day:'numeric',month:'short',timeZone:'UTC'});

export default function TodaySection({state,today,busy,change,go}:SectionProps){
 const inputs=useRef(new Map<number,HTMLInputElement>());
 const pendingFocus=useRef<number|null>(null);

 const tasks=tasksFor(state,today);
 const critical=tasks.filter(t=>t.important);
 const roomForCritical=critical.length<MAX_CRITICAL;
 const open=tasks.filter(t=>!t.done).length;
 const rowCount=Math.max(MIN_ROWS,tasks.length+1);

 // After a line is filled in, the caret moves to the next one so the list can be typed
 // straight down. Held in a ref because the row it lands on only exists after the render
 // that adding the task causes.
 useEffect(()=>{
  const index=pendingFocus.current;
  if(index===null)return;
  pendingFocus.current=null;
  inputs.current.get(index)?.focus();
 });

 const edit=(task:Task,label:string,mutate:(t:Task)=>void)=>change(label,s=>{
  const stored=s.tasks.find(t=>t.id===task.id);
  if(stored)mutate(stored);
  else{const copy={...task,date:today};mutate(copy);s.tasks.push(copy);}
 });

 const commit=(task:Task|null,value:string)=>{
  const title=capitalise(value);
  if(task){
   // Clearing a line does not delete the task: that is what the bin is for.
   if(!title||title===task.title)return false;
   edit(task,`Renamed a task to ${title}`,t=>{t.title=title;});
   return true;
  }
  if(!title)return false;
  change(`Added task: ${title}`,s=>{s.tasks.push({id:crypto.randomUUID(),title,date:today,done:false});});
  return true;
 };

 const session=state.gym?sessionFor(state.gym,today):null;
 const classesToday=(state.classes??[]).filter(c=>c.day===new Date(today+'T12:00:00Z').toLocaleDateString('en-AU',{weekday:'short',timeZone:'UTC'}));
 const dueSoon=state.assignments.filter(a=>!['submitted','graded'].includes(a.status)).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,4);

 return <div className="stack">
  <PageHead title="To-do list" sub={tasks.length?`${open} open · ${tasks.length-open} done`:'Nothing on the list yet'} back={()=>go('dashboard')}/>

  <div className="split">
   <div className="main">
    <Card tone="lift" title="Today" action={<span className="tiny">Star up to {MAX_CRITICAL} to pin them to the dashboard</span>}>
     <ol className="todo-list">
      {Array.from({length:rowCount},(_,index)=>{
       const task=tasks[index]??null;
       return <li key={task?task.id:`blank-${index}`}
        className={`todo-row${task?.done?' is-done':''}${task?.important?' is-critical':''}`}>
        <span className="todo-num">{index+1}</span>

        {task
         ? <input type="checkbox" checked={task.done} disabled={busy} aria-label={`${task.title} done`}
            onChange={()=>edit(task,'',t=>{t.done=!t.done;})}/>
         : <span className="todo-blank" aria-hidden="true"/>}

        <input
         className="todo-input"
         ref={element=>{if(element)inputs.current.set(index,element);else inputs.current.delete(index);}}
         defaultValue={task?.title??''}
         maxLength={300}
         disabled={busy}
         aria-label={task?`Task ${index+1}`:`Empty line ${index+1}`}
         placeholder={index===tasks.length?'Type a task and press enter':''}
         onKeyDown={e=>{
          if(e.key!=='Enter')return;
          e.preventDefault();
          // A committed line re-renders, so the next row is focused from the effect;
          // an unchanged line does not, so move the caret now.
          if(commit(task,e.currentTarget.value))pendingFocus.current=index+1;
          else inputs.current.get(index+1)?.focus();
         }}
         onBlur={e=>{if(!commit(task,e.currentTarget.value)&&task)e.currentTarget.value=task.title;}}/>

        {task&&<>
         <button type="button" className="btn-icon" aria-label={task.important?'Remove from critical':'Mark as critical'}
          title={task.important||roomForCritical?'Critical':`Already ${MAX_CRITICAL} starred`}
          disabled={busy||(!task.important&&!roomForCritical)}
          style={task.important?{color:'var(--accent)'}:undefined}
          onClick={()=>edit(task,'',t=>{t.important=!t.important;})}>
          <Star size={15} fill={task.important?'currentColor':'none'}/>
         </button>
         <ConfirmButton label={`Delete ${task.title}`} confirmLabel="Delete" disabled={busy}
          onConfirm={()=>edit(task,`Deleted task: ${task.title}`,t=>{t.deleted=true;})}>
          <Trash2 size={15}/>
         </ConfirmButton>
        </>}
       </li>;
      })}
     </ol>
     <p className="entry-hint">Enter saves the line and moves to the next. Clearing a line keeps the task; use the bin to remove it.</p>
    </Card>

    <Card title={session?`Gym · ${session.name}`:'Gym · rest day'} action={
     <button type="button" className="btn btn-sm" onClick={()=>go('gym')}>Open gym <ArrowRight size={15}/></button>
    }>
     {session
      ? <div className="row" style={{flexWrap:'wrap',gap:9}}>
        {session.exercises.slice(0,4).map(e=><span key={e.id} className="chip">{e.name} &middot; {e.sets}&times;{e.reps}</span>)}
        {session.exercises.length>4&&<span className="chip">+{session.exercises.length-4} more</span>}
        {session.exercises.length===0&&<Empty>No exercises on this session yet.</Empty>}
       </div>
      : <p className="muted"><Dumbbell size={15} style={{verticalAlign:-2,marginRight:6}}/>Nothing scheduled today.</p>}
    </Card>
   </div>

   <div className="rail">
    <Card eyebrow="Up next">
     {classesToday.length===0?<Empty>Nothing timetabled today.</Empty>:<div className="stack" style={{gap:11}}>
      {classesToday.map((c,i)=><div key={i} className="row" style={{alignItems:'flex-start',gap:12,borderTop:i?'1px solid var(--line)':'0',paddingTop:i?11:0}}>
       <span style={{width:44,flex:'none',fontWeight:500,fontVariantNumeric:'tabular-nums'}}>{c.start}</span>
       <span style={{minWidth:0}}>{c.unit} {c.kind}<br/><span className="tiny">{c.location||'No location set'}</span></span>
      </div>)}
     </div>}
    </Card>

    <Card eyebrow="Due soon">
     {dueSoon.length===0?<Empty>Nothing outstanding.</Empty>:<div className="stack" style={{gap:11}}>
      {dueSoon.map((a,i)=><div key={a.id} className="spread" style={{alignItems:'baseline',borderTop:i?'1px solid var(--line)':'0',paddingTop:i?11:0}}>
       <span style={{minWidth:0}}>{a.title}<br/><span className="tiny">{a.unit}{a.weight?` · ${a.weight}`:''}</span></span>
       <span className={a.date<=today?'chip chip-warn':'tiny'}>{a.date<=today?'Due':shortDate(a.date)}</span>
      </div>)}
     </div>}
    </Card>

    <Card eyebrow="Goals">
     {state.goals.length===0?<Empty>No goals yet.</Empty>:<div className="stack" style={{gap:13}}>
      {state.goals.slice(0,4).map(g=><div key={g.id}>
       <div className="spread" style={{fontSize:13,marginBottom:6}}><span style={{minWidth:0}}>{g.title}</span><span className="tiny">{g.progress}%</span></div>
       <Bar value={g.progress}/>
      </div>)}
     </div>}
    </Card>

    <Card eyebrow="Note for today">
     <label className="sr-only" htmlFor="day-note">Note for today</label>
     <textarea id="day-note" defaultValue={state.notes[today]??''} placeholder="Anything worth remembering about today"
      onBlur={e=>{
       const value=e.target.value;
       if((state.notes[today]??'')===value)return;
       change('',s=>{if(value.trim())s.notes[today]=value;else delete s.notes[today];});
      }}/>
     <p className="tiny" style={{marginTop:6}}>Saved when you click away.</p>
    </Card>
   </div>
  </div>
 </div>;
}
