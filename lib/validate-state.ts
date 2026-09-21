import type {State} from './planner';
export function validState(value:unknown):value is State {
 if(!value||typeof value!=='object')return false;
 const state=value as State;
 if(!['tasks','history','routine','projects','goals','assignments','reminders','unlocked'].every(k=>Array.isArray((state as unknown as Record<string,unknown>)[k])))return false;
 if(!state.checks||typeof state.checks!=='object'||Array.isArray(state.checks)||!state.notes||typeof state.notes!=='object'||Array.isArray(state.notes)||typeof state.termEnd!=='string')return false;
 if(state.videos!==undefined&&(!Array.isArray(state.videos)||state.videos.some(v=>!v||typeof v.videoId!=='string'||!/^[\w-]{11}$/.test(v.videoId)||v.url!=='https://www.youtube.com/watch?v='+v.videoId)))return false;
 if(state.motivation){const m=state.motivation;if(!Array.isArray(m.phrases)||m.phrases.some(p=>!p||typeof p.text!=='string'||p.text.length>1500)||!Number.isInteger(m.minMinutes)||!Number.isInteger(m.maxMinutes)||m.minMinutes<5||m.maxMinutes>720||m.minMinutes>m.maxMinutes||!Number.isInteger(m.startHour)||!Number.isInteger(m.endHour)||m.startHour<0||m.startHour>23||m.endHour<0||m.endHour>23||!Number.isFinite(m.nextAt)||typeof m.enabled!=='boolean'||typeof m.phoneEnabled!=='boolean'||typeof m.phoneTopic!=='string'||(m.phoneEnabled&&!/^homebase-[a-f0-9]{32}$/.test(m.phoneTopic)))return false;}
 return true;
}
