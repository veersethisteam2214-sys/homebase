'use client';
import {useState} from 'react';
import {ArrowRight,Check,Dumbbell,Pencil,Plus,Star,Trash2} from 'lucide-react';
import {tasksFor,type Task} from '../../../lib/planner';
import {applyRoutinePreset,saveRoutinePreset} from '../../../lib/routine-presets';
import {sessionFor} from '../../../lib/gym';
import type {SectionProps} from '../types';
import {Bar,Card,ConfirmButton,Empty,Modal,PageHead} from '../ui';

const MAX_IMPORTANT=3;
const shortDate=(date:string)=>new Date(date+'T12:00:00Z').toLocaleDateString('en-AU',{day:'numeric',month:'short',timeZone:'UTC'});

function TaskRow({task,today,busy,change,canStar}:{task:Task;today:string;busy:boolean;change:SectionProps['change'];canStar:boolean}){
 const setDone=()=>change('',s=>{
  const stored=s.tasks.find(t=>t.id===task.id);
  if(stored)stored.done=!stored.done;
  else s.tasks.push({...task,date:today,done:!task.done});
 });
 const setImportant=()=>change('',s=>{
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
   <button type="button" className="btn-icon" aria-label={task.important?'Remove from must do':'Add to must do'}
    disabled={busy||(!task.important&&!canStar)} onClick={setImportant}
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
 const [editing,setEditing]=useState(false);
 const [step,setStep]=useState('');
 const [presetName,setPresetName]=useState('');

 const tasks=tasksFor(state,today);
 const important=tasks.filter(t=>t.important).slice(0,MAX_IMPORTANT);
 const rest=tasks.filter(t=>!t.important);
 const shown=rest.filter(t=>filter==='all'||(filter==='open'?!t.done:t.done));
 const steps=state.routine,checked=state.checks[today]??[];
 const routineDone=steps.length>0&&checked.length>=steps.length;
 const confirmed=state.unlocked.includes(today);
 const presets=state.routinePresets??[];
 const activePreset=presets.find(p=>p.id===state.activeRoutinePresetId);
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
  <PageHead title="Today" sub={`${tasks.filter(t=>!t.done).length} open · ${tasks.filter(t=>t.done).length} done`} back={()=>go('dashboard')}>
   <div className="row">
    {confirmed&&<span className="chip chip-accent"><Check size={14}/>Morning confirmed</span>}
    <button type="button" className="btn btn-sm" onClick={()=>setEditing(true)}><Pencil size={15}/>Edit routine</button>
   </div>
  </PageHead>

  <Card tone={routineDone?'plain':'lift'} eyebrow="First thing" title="Morning routine" action={
   presets.length>1?<label className="row" style={{gap:8}}>
    <span className="tiny">Routine</span>
    <select value={state.activeRoutinePresetId??''} disabled={busy} style={{width:'auto'}}
     onChange={e=>change(`Switched routine to ${presets.find(p=>p.id===e.target.value)?.name??'preset'}`,s=>applyRoutinePreset(s,e.target.value,today))}>
     {presets.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
    </select>
   </label>:activePreset?<span className="tag">{activePreset.name}</span>:null
  }>
   {steps.length===0
    ? <Empty>No steps yet. Use edit routine to build your morning.</Empty>
    : <>
      <div className="spread" style={{marginBottom:12}}>
       <span className="muted">{checked.length} of {steps.length} done</span>
       {routineDone&&!confirmed&&<button type="button" className="btn btn-primary btn-sm" disabled={busy}
        onClick={()=>change('Confirmed morning routine',s=>{if(!s.unlocked.includes(today))s.unlocked.push(today);})}>
        Confirm and start the day
       </button>}
      </div>
      <Bar value={checked.length} max={steps.length}/>
      <div style={{marginTop:14,display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',columnGap:24}}>
       {steps.map(s=>{
        const on=checked.includes(s.id);
        return <label key={s.id} className={on?'list-row done':'list-row'} style={{borderTop:0,cursor:'pointer'}}>
         <input type="checkbox" checked={on} disabled={busy} onChange={()=>change('',next=>{
          const list=next.checks[today]??[];
          next.checks[today]=list.includes(s.id)?list.filter(x=>x!==s.id):[...list,s.id];
         })}/>
         <span className="grow">{s.title}</span>
        </label>;
       })}
      </div>
     </>}
  </Card>

  <div className="split">
   <div className="main">
    <Card tone="lift" title="Must do today" action={<span className="tiny">Up to {MAX_IMPORTANT}, starred from your list</span>}>
     {important.length===0
      ? <Empty>Star up to three things below to pin them here.</Empty>
      : <div className="list">{important.map(t=><TaskRow key={t.id} task={t} today={today} busy={busy} change={change} canStar/>)}</div>}
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
      : <div className="list">{shown.map(t=><TaskRow key={t.id} task={t} today={today} busy={busy} change={change} canStar={important.length<MAX_IMPORTANT}/>)}</div>}
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

  <Modal open={editing} onClose={()=>setEditing(false)} title="Morning routine" description="Steps run in this order. Save a set of steps as a preset to switch between routines.">
   <div className="list" style={{marginBottom:16}}>
    {steps.length===0?<Empty>No steps yet.</Empty>:steps.map((s,i)=><div key={s.id} className="list-row">
     <span className="tiny" style={{width:22,flex:'none'}}>{String(i+1).padStart(2,'0')}</span>
     <span className="grow">{s.title}</span>
     <div className="row-actions" style={{opacity:1}}>
      <ConfirmButton label={`Delete step ${s.title}`} confirmLabel="Delete" disabled={busy}
       onConfirm={()=>change(`Removed routine step: ${s.title}`,next=>{
        next.routine=next.routine.filter(x=>x.id!==s.id);
        next.checks[today]=(next.checks[today]??[]).filter(x=>x!==s.id);
       })}>
       <Trash2 size={16}/>
      </ConfirmButton>
     </div>
    </div>)}
   </div>
   <form className="row" onSubmit={e=>{
    e.preventDefault();
    const title=step.trim();
    if(!title)return;
    change(`Added routine step: ${title}`,s=>{s.routine.push({id:crypto.randomUUID(),title});});
    setStep('');
   }}>
    <label className="sr-only" htmlFor="new-step">Add a step</label>
    <input id="new-step" value={step} onChange={e=>setStep(e.target.value)} placeholder="Add a step" maxLength={160}/>
    <button type="submit" className="btn btn-primary" disabled={busy||!step.trim()}><Plus size={17}/>Add</button>
   </form>
   <div style={{marginTop:20,paddingTop:18,borderTop:'1px solid var(--line)'}}>
    <div className="field">
     <label htmlFor="preset-name">Save these steps as a preset</label>
     <div className="row">
      <input id="preset-name" value={presetName} onChange={e=>setPresetName(e.target.value)} placeholder="Weekend" maxLength={60}/>
      <button type="button" className="btn" disabled={busy||!presetName.trim()}
       onClick={()=>{change(`Saved routine preset: ${presetName.trim()}`,s=>saveRoutinePreset(s,crypto.randomUUID(),presetName.trim()));setPresetName('');}}>
       Save preset
      </button>
     </div>
    </div>
    {activePreset&&<button type="button" className="btn btn-sm btn-ghost" style={{marginTop:10}} disabled={busy}
     onClick={()=>change(`Updated routine preset: ${activePreset.name}`,s=>saveRoutinePreset(s,activePreset.id,activePreset.name))}>
     Update {activePreset.name} with these steps
    </button>}
   </div>
  </Modal>
 </div>;
}
