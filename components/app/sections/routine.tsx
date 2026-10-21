'use client';
import {useState} from 'react';
import {Check,Pencil,Plus,Trash2} from 'lucide-react';
import {applyRoutinePreset,saveRoutinePreset} from '../../../lib/routine-presets';
import type {SectionProps} from '../types';
import {Bar,Card,ConfirmButton,Empty,Modal,PageHead} from '../ui';

export default function RoutineSection({state,today,busy,change,go}:SectionProps){
 const [editing,setEditing]=useState(false);
 const [step,setStep]=useState('');
 const [stepTime,setStepTime]=useState('');
 const [presetName,setPresetName]=useState('');

 const setTime=(id:string,value:string)=>change('',next=>{
  const target=next.routine.find(x=>x.id===id);
  if(!target)return;
  if(value)target.time=value;else delete target.time;
 });

 const steps=state.routine;
 const checked=state.checks[today]??[];
 const done=steps.length>0&&checked.length>=steps.length;
 const confirmed=state.unlocked.includes(today);
 const presets=state.routinePresets??[];
 const activePreset=presets.find(p=>p.id===state.activeRoutinePresetId);

 const toggle=(id:string)=>change('',next=>{
  const list=next.checks[today]??[];
  next.checks[today]=list.includes(id)?list.filter(x=>x!==id):[...list,id];
 });

 return <div className="stack">
  <PageHead title="Morning routine" sub={steps.length?`${checked.length} of ${steps.length} done`:'No steps yet'} back={()=>go('dashboard')}>
   <div className="row">
    {confirmed&&<span className="chip chip-accent"><Check size={14}/>Confirmed</span>}
    <button type="button" className="btn btn-sm" onClick={()=>setEditing(true)}><Pencil size={15}/>Edit steps</button>
   </div>
  </PageHead>

  {steps.length===0
   ? <Card tone="dashed">
     <Empty>Nothing here yet. Add the steps that start your day and they will appear on the dashboard.</Empty>
     <button type="button" className="btn btn-soft btn-sm" style={{marginTop:12}} onClick={()=>setEditing(true)}>
      <Plus size={15}/>Add your first step
     </button>
    </Card>
   : <Card tone={done?'accent':'lift'} action={
     presets.length>1?<label className="row" style={{gap:8}}>
      <span className="tiny">Routine</span>
      <select value={state.activeRoutinePresetId??''} disabled={busy} style={{width:'auto'}}
       onChange={e=>change(`Switched routine to ${presets.find(p=>p.id===e.target.value)?.name??'preset'}`,s=>applyRoutinePreset(s,e.target.value,today))}>
       {presets.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
     </label>:activePreset?<span className="tag">{activePreset.name}</span>:null
    }>
     <div className="spread" style={{marginBottom:12}}>
      <div>
       <div className="eyebrow">{done?'Finished':'In progress'}</div>
       <strong style={{fontSize:26,letterSpacing:'-.02em',fontVariantNumeric:'tabular-nums'}}>{checked.length}<span className="muted" style={{fontSize:16}}> / {steps.length}</span></strong>
      </div>
      {done&&!confirmed&&<button type="button" className="btn btn-primary btn-sm" disabled={busy}
       onClick={()=>change('Confirmed the morning routine',s=>{if(!s.unlocked.includes(today))s.unlocked.push(today);})}>
       <Check size={15}/>Confirm and start the day
      </button>}
     </div>
     <Bar value={checked.length} max={steps.length}/>

     <div style={{marginTop:16,display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',columnGap:24}}>
      {steps.map((s,i)=>{
       const on=checked.includes(s.id);
       return <label key={s.id} className={on?'list-row done':'list-row'} style={{cursor:'pointer'}}>
        <span className="tiny" style={{width:22,flex:'none'}}>{String(i+1).padStart(2,'0')}</span>
        <input type="checkbox" checked={on} disabled={busy} onChange={()=>toggle(s.id)}/>
        <span className="grow">{s.title}</span>
        {s.time&&<span className="routine-time">{s.time}</span>}
       </label>;
      })}
     </div>
    </Card>}

  <Modal open={editing} onClose={()=>setEditing(false)} title="Morning routine"
   description="Steps run in this order. Save a set of steps as a preset to switch between routines.">
   <div className="list" style={{marginBottom:16}}>
    {steps.length===0?<Empty>No steps yet.</Empty>:steps.map((s,i)=><div key={s.id} className="list-row">
     <span className="tiny" style={{width:22,flex:'none'}}>{String(i+1).padStart(2,'0')}</span>
     <span className="grow">{s.title}</span>
     <input type="time" value={s.time??''} disabled={busy} aria-label={`Time for ${s.title}`}
      style={{width:'auto',flex:'none',minHeight:34,padding:'5px 8px',fontSize:13}}
      onChange={e=>setTime(s.id,e.target.value)}/>
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
    change(`Added routine step: ${title}`,s=>{
     s.routine.push(stepTime?{id:crypto.randomUUID(),title,time:stepTime}:{id:crypto.randomUUID(),title});
    });
    setStep('');
   }}>
    <label className="sr-only" htmlFor="new-step">Step</label>
    <input id="new-step" value={step} onChange={e=>setStep(e.target.value)} placeholder="What you do" maxLength={160}/>
    <label className="sr-only" htmlFor="new-step-time">Time, optional</label>
    <input id="new-step-time" type="time" value={stepTime} onChange={e=>setStepTime(e.target.value)}
     title="Time, optional" style={{width:'auto',flex:'none'}}/>
    <button type="submit" className="btn btn-primary" disabled={busy||!step.trim()}><Plus size={17}/>Add</button>
   </form>
   <p className="tiny" style={{marginTop:8}}>The time is optional, and stays set so a run of steps is quick to add.</p>
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
