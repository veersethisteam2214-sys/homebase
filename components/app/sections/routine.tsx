'use client';
import {useState} from 'react';
import {Check,Pencil,Plus,Trash2} from 'lucide-react';
import {capitalise} from '../../../lib/planner';
import {applyRoutinePreset,saveRoutinePreset} from '../../../lib/routine-presets';
import type {SectionProps} from '../types';
import {Card,ConfirmButton,Empty,Modal,PageHead} from '../ui';

export default function RoutineSection({state,today,busy,change,go}:SectionProps){
 const [editing,setEditing]=useState(false);
 const [step,setStep]=useState('');
 const [stepTime,setStepTime]=useState('');
 const [presetName,setPresetName]=useState('');

 const steps=state.routine;
 const checked=state.checks[today]??[];
 const done=steps.length>0&&checked.length>=steps.length;
 const confirmed=state.unlocked.includes(today);
 const presets=state.routinePresets??[];
 const activePreset=presets.find(p=>p.id===state.activeRoutinePresetId);
 const next=steps.find(s=>!checked.includes(s.id));

 const toggle=(id:string)=>change('',draft=>{
  const list=draft.checks[today]??[];
  draft.checks[today]=list.includes(id)?list.filter(x=>x!==id):[...list,id];
 });
 const setTime=(id:string,value:string)=>change('',draft=>{
  const target=draft.routine.find(x=>x.id===id);
  if(!target)return;
  if(value)target.time=value;else delete target.time;
 });
 const rename=(id:string,value:string)=>{
  const title=capitalise(value);
  if(!title)return false;
  change(`Renamed a routine step to ${title}`,draft=>{
   const target=draft.routine.find(x=>x.id===id);
   if(target)target.title=title;
  });
  return true;
 };

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
     <div className="routine-head">
      <div>
       <div className="eyebrow">{done?'Finished':next?`Next: ${next.title}`:'In progress'}</div>
       <div className="routine-count">{checked.length}<span>/ {steps.length}</span></div>
      </div>
      {done&&!confirmed&&<button type="button" className="btn btn-primary btn-sm" disabled={busy}
       onClick={()=>change('Confirmed the morning routine',s=>{if(!s.unlocked.includes(today))s.unlocked.push(today);})}>
       <Check size={15}/>Confirm and start the day
      </button>}
     </div>

     <div className="routine-meter" aria-hidden="true">
      <i style={{width:`${steps.length?(checked.length/steps.length)*100:0}%`}}/>
     </div>

     <ol className="routine-line">
      {steps.map(s=>{
       const on=checked.includes(s.id);
       const isNext=!on&&next?.id===s.id;
       return <li key={s.id}>
        <label className={`routine-step${on?' is-done':''}${isNext?' is-next':''}`}>
         <span className="routine-at">{s.time??''}</span>
         <span className="routine-mark">
          <input type="checkbox" className="sr-only" checked={on} disabled={busy} onChange={()=>toggle(s.id)}/>
          <span className="routine-dot" aria-hidden="true">{on?<Check size={13}/>:null}</span>
         </span>
         <span className="routine-what">{s.title}</span>
        </label>
       </li>;
      })}
     </ol>
    </Card>}

  <Modal open={editing} onClose={()=>setEditing(false)} wide title="Edit your routine"
   description="Change the wording or the time of any step, reorder by removing and adding, or save a set of steps as a preset.">
   <div className="list" style={{marginBottom:16}}>
    {steps.length===0?<Empty>No steps yet.</Empty>:steps.map((s,i)=><div key={s.id} className="list-row" style={{gap:9}}>
     <span className="tiny" style={{width:22,flex:'none'}}>{String(i+1).padStart(2,'0')}</span>
     <input defaultValue={s.title} maxLength={160} disabled={busy} aria-label={`Step ${i+1}`}
      className="grow" style={{minHeight:36,padding:'7px 10px',fontSize:14}}
      onBlur={e=>{if(!rename(s.id,e.target.value))e.target.value=s.title;else e.target.value=capitalise(e.target.value);}}
      onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();}}/>
     <input type="time" value={s.time??''} disabled={busy} aria-label={`Time for ${s.title}`}
      style={{width:'auto',flex:'none',minHeight:36,padding:'6px 9px',fontSize:13}}
      onChange={e=>setTime(s.id,e.target.value)}/>
     <ConfirmButton label={`Delete step ${s.title}`} confirmLabel="Delete" disabled={busy}
      onConfirm={()=>change(`Removed routine step: ${s.title}`,draft=>{
       draft.routine=draft.routine.filter(x=>x.id!==s.id);
       draft.checks[today]=(draft.checks[today]??[]).filter(x=>x!==s.id);
      })}>
      <Trash2 size={16}/>
     </ConfirmButton>
    </div>)}
   </div>

   <form className="entry" onSubmit={e=>{
    e.preventDefault();
    const title=capitalise(step);
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
    <button type="submit" className="btn btn-primary btn-sm" disabled={busy||!step.trim()}><Plus size={16}/>Add</button>
   </form>
   <p className="entry-hint">Steps are capitalised for you. The time is optional and stays set, so a run of steps is quick to add.</p>

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
