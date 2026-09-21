import type {State} from './planner';

export type RoutinePreset = {id:string; name:string; steps:State['routine']};

export function ensureRoutinePresets(state:State){
  if(!state.routinePresets){
    state.routinePresets=[{id:'everyday',name:'Everyday',steps:structuredClone(state.routine)}];
    state.activeRoutinePresetId='everyday';
  }
  return state.routinePresets;
}

export function saveRoutinePreset(state:State,id:string,name:string){
  const presets=ensureRoutinePresets(state);
  const trimmed=name.trim();
  if(!trimmed||!state.routine.length)throw Error('Give your preset a name and at least one step.');
  if(presets.some(p=>p.id!==id&&p.name.toLowerCase()===trimmed.toLowerCase()))throw Error('A preset with that name already exists.');
  const existing=presets.find(p=>p.id===id);
  const saved={id,name:trimmed,steps:structuredClone(state.routine)};
  if(existing)Object.assign(existing,saved);else presets.push(saved);
  state.activeRoutinePresetId=id;
}

export function useRoutinePreset(state:State,id:string,today:string){
  const preset=ensureRoutinePresets(state).find(p=>p.id===id);
  if(!preset)throw Error('That routine preset is unavailable.');
  state.routine=structuredClone(preset.steps);
  state.activeRoutinePresetId=id;
  // A changed checklist needs its own confirmation; previous days stay intact.
  state.checks[today]=[];
  state.unlocked=state.unlocked.filter(date=>date!==today);
}
