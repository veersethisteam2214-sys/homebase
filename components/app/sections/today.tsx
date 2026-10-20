'use client';
import {useState} from 'react';
import {ArrowRight,Dumbbell,Plus,Star,Trash2} from 'lucide-react';
import {tasksFor,type Task} from '../../../lib/planner';
import {sessionFor} from '../../../lib/gym';
import type {SectionProps} from '../types';
import {Bar,Card,ConfirmButton,Empty,PageHead} from '../ui';

const MAX_CRITICAL=3;
const shortDate=(date:string)=>new Date(date+'T12:00:00Z').toLocaleDateString('en-AU',{day:'numeric',month:'short',timeZone:'UTC'});

function TaskRow({task,today,busy,change,canStar}:{task:Task;today:string;busy:boolean;change:SectionProps['change'];canStar:boolean}){
 const setDone=()=>change('',s=>{
  const stored=s.tasks.find(t=>t.id===task.id);
  if(stored)stored.done=!stored.done;
  else s.tasks.push({...task,date:today,done:!task.done});
 });
 const setCritical=()=>change('',s=>{
  const stored=s.tasks.find(t=>t.id===task.id);
  if(stored)stored.important=!stored.important;
  else s.tasks.push({...task,date:today,important:!task.important});
 });
 return <div className={task.done?'list-row done':'list-row'}>
  <label className="list-label">
   <input type="checkbox" checked={task.done} disabled={busy} onChange={setDone}/>
   <span className="grow">{task.title}</span>
  </label>
  {task.source&&<span className="tag">{task.source}</span>}
  <div className="row-actions">
   <button type="button" className="btn-icon" aria-label={task.important?'Remove from critical':'Mark as critical'}
    disabled={busy||(!task.important&&!canStar)} onClick={setCritical}
    style={task.important?{color:'var(--accent)'}:undefined}>
    <Star size={16}/>
   </button>
   <ConfirmButton label="Delete task" confirmLabel="Delete" disabled={busy}
    onConfirm={()=>change(`Deleted task: ${task.title}`,s=>{
     const stored=s.tasks.find(t=>t.id===task.id);
     if(stored)stored.deleted=true;
     else s.tasks.push({...task,date:today,deleted:true});
    })}>
    <Trash2 size={16}/>
   </ConfirmButton>
  </div>
 </div>;
}

export default function TodaySection({state,today,busy,change,go}:SectionProps){
 const [draft,setDraft]=useState('');
 const [filter,setFilter]=useState<'all'|'open'|'done'>('all');

 const tasks=tasksFor(state,today);
 const critical=tasks.filter(t=>t.important).slice(0,MAX_CRITICAL);
 const rest=tasks.filter(t=>!t.important);
 const shown=rest.filter(t=>filter==='all'||(filter==='open'?!t.done:t.done));
 const session=state.gym?sessionFor(state.gym,today):null;
 const classesToday=(state.classes??[]).filter(c=>c.day===new Date(today+'T12:00:00Z').toLocaleDateString('en-AU',{weekday:'short',timeZone:'UTC'}));
 const dueSoon=state.assignments.filter(a=>!['submitted','graded'].includes(a.status)).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,4);

 const addTask=()=>{
  const title=draft.trim();
  if(!title)return;
  change(`Added task: ${title}`,s=>{s.tasks.push({id:crypto.randomUUID(),title,date:today,done:false});});
  setDraft('');
 };

 return <div className="stack">
  <PageHead title="Today" sub={`${tasks.filter(t=>!t.done).length} open · ${tasks.filter(t=>t.done).length} done`} back={()=>go('dashboard')}/>

  <div className="split">
   <div className="main">
    <Card tone="lift" title="Critical" action={<span className="tiny">Up to {MAX_CRITICAL}, starred from your list</span>}>
     {critical.length===0
      ? <Empty>Star up to three things below. They show on the dashboard under your name.</Empty>
      : <div className="list">{critical.map(t=><TaskRow key={t.id} task={t} today={today} busy={busy} change={change} canStar/>)}</div>}
    </Card>

    <Card title="Today's list" action={
     <div className="row" style={{gap:4}}>
      {(['all','open','done'] as const).map(key=>
       <button key={key} type="button" className={filter===key?'btn btn-sm btn-soft':'btn btn-sm btn-ghost'} onClick={()=>setFilter(key)}>
        {key==='all'?'All':key==='open'?'Open':'Done'}
       </button>)}
     </div>
    }>
     <form className="row" style={{marginBottom:12}} onSubmit={e=>{e.preventDefault();addTask();}}>
      <label className="sr-only" htmlFor="new-task">Add a task</label>
      <input id="new-task" value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Add a task and press enter" maxLength={300}/>
      <button type="submit" className="btn btn-primary" disabled={busy||!draft.trim()}><Plus size={17}/>Add</button>
     </form>
     {shown.length===0
      ? <Empty>{rest.length?'Nothing in this filter.':'Nothing on the list yet.'}</Empty>
      : <div className="list">{shown.map(t=><TaskRow key={t.id} task={t} today={today} busy={busy} change={change} canStar={critical.length<MAX_CRITICAL}/>)}</div>}
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
