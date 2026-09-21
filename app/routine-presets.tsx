'use client';
import {useState} from 'react';
import {Bookmark,Plus,Save,Trash2} from 'lucide-react';
import type {State} from '../lib/planner';
import {saveRoutinePreset,useRoutinePreset} from '../lib/routine-presets';

type Props={state:State;today:string;disabled:boolean;change:(text:string,update:(state:State)=>void)=>void};
export default function RoutinePresets({state,today,disabled,change}:Props){
 const [creating,setCreating]=useState(false),[name,setName]=useState('');
 const presets=state.routinePresets||[];
 const selected=presets.find(p=>p.id===state.activeRoutinePresetId);
 const dirty=!!selected&&JSON.stringify(selected.steps)!==JSON.stringify(state.routine);
 const duplicate=presets.some(p=>p.name.toLowerCase()===name.trim().toLowerCase());
 return <div className="routine-presets">
  <div className="preset-label"><Bookmark size={16}/><label htmlFor="morning-preset">Routine preset</label>{dirty&&<span>Unsaved preset changes</span>}</div>
  <div className="preset-controls">
   <select id="morning-preset" value={selected?.id||''} disabled={disabled} onChange={e=>{const preset=presets.find(p=>p.id===e.target.value);if(preset){change('Selected morning preset: '+preset.name,s=>useRoutinePreset(s,preset.id,today));setCreating(false);setName('');}}}>
    {!selected&&<option value="">Custom routine</option>}{presets.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
   </select>
   <button className="text-button" disabled={disabled||!state.routine.length} onClick={()=>{setCreating(!creating);setName('');}}><Plus size={16}/>Save as preset</button>
   {selected&&<button className="text-button" disabled={disabled||!dirty||!state.routine.length} onClick={()=>change('Updated morning preset: '+selected.name,s=>saveRoutinePreset(s,selected.id,selected.name))}><Save size={16}/>Update preset</button>}
   {selected&&<button className="icon danger" disabled={disabled} aria-label={'Delete preset '+selected.name} title="Delete preset (keeps the current checklist)" onClick={()=>change('Deleted morning preset: '+selected.name,s=>{s.routinePresets=s.routinePresets?.filter(p=>p.id!==selected.id);s.activeRoutinePresetId=undefined;})}><Trash2 size={16}/></button>}
  </div>
  {creating&&<form className="preset-form" onSubmit={e=>{e.preventDefault();if(disabled||!name.trim()||duplicate||!state.routine.length)return;change('Saved morning preset: '+name.trim(),s=>saveRoutinePreset(s,crypto.randomUUID(),name));setCreating(false);setName('');}}>
   <label>Preset name<input autoFocus required maxLength={80} placeholder="e.g. Workday, Weekend, Early start" value={name} onChange={e=>setName(e.target.value)}/></label>
   <button className="primary" disabled={disabled||!name.trim()||duplicate||!state.routine.length} type="submit">Save preset</button>
   <button type="button" className="text-button" onClick={()=>setCreating(false)}>Cancel</button>
   {duplicate&&<small role="alert">A preset with this name already exists. Choose a different name or update that preset.</small>}
  </form>}
  <small>Edit the checklist, then save it as a preset. The selected routine stays active until you choose another. Switching resets today’s confirmations.</small>
 </div>;
}
