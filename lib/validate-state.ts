import type {State} from './planner';
import {accentPattern,zonePattern} from './planner';
import {validGym} from './gym';
import {validClock,validTime} from './clock';
export function validState(value:unknown):value is State {
 if(!value||typeof value!=='object')return false;
 const state=value as State;
 if(!['tasks','history','routine','projects','goals','assignments','reminders','unlocked'].every(k=>Array.isArray((state as unknown as Record<string,unknown>)[k])))return false;
 if(!state.checks||typeof state.checks!=='object'||Array.isArray(state.checks)||!state.notes||typeof state.notes!=='object'||Array.isArray(state.notes)||typeof state.termEnd!=='string')return false;
 if(state.videos!==undefined&&(!Array.isArray(state.videos)||state.videos.some(v=>!v||typeof v.videoId!=='string'||!/^[\w-]{11}$/.test(v.videoId)||v.url!=='https://www.youtube.com/watch?v='+v.videoId)))return false;
 if(state.motivation){const m=state.motivation;if(!Array.isArray(m.phrases)||m.phrases.some(p=>!p||typeof p.text!=='string'||p.text.length>1500)||!Number.isInteger(m.minMinutes)||!Number.isInteger(m.maxMinutes)||m.minMinutes<5||m.maxMinutes>720||m.minMinutes>m.maxMinutes||!Number.isInteger(m.startHour)||!Number.isInteger(m.endHour)||m.startHour<0||m.startHour>23||m.endHour<0||m.endHour>23||!Number.isFinite(m.nextAt)||typeof m.enabled!=='boolean'||typeof m.phoneEnabled!=='boolean'||typeof m.phoneTopic!=='string'||(m.phoneEnabled&&!/^homebase-[a-f0-9]{32}$/.test(m.phoneTopic)))return false;}
 // A routine step may carry a clock time; anything else in that field is rejected rather
// than written into the page.
 if(state.routine.some(step=>step&&step.time!==undefined&&(typeof step.time!=='string'||!validTime(step.time))))return false;
 if(state.gym!==undefined&&!validGym(state.gym))return false;
 if(state.clock!==undefined&&!validClock(state.clock))return false;
 if(state.quoteSeen!==undefined&&(!Array.isArray(state.quoteSeen)||state.quoteSeen.length>400||state.quoteSeen.some(d=>typeof d!=='string'||d.length>10)))return false;
 if(state.settings!==undefined){const s=state.settings;if(!s||typeof s!=='object'||typeof s.accent!=='string'||!accentPattern.test(s.accent)||!['light','dark'].includes(s.theme)||typeof s.quotePopup!=='boolean'||!Number.isFinite(s.volume)||s.volume<0||s.volume>1)return false;
  // Both reach the page, so neither may carry anything but what it claims to be.
  if(s.clockZone!==undefined&&(typeof s.clockZone!=='string'||s.clockZone.length>64||!zonePattern.test(s.clockZone)))return false;
  if(s.monogram!==undefined&&(typeof s.monogram!=='string'||!/^[\p{L}\p{N}]{1,3}$/u.test(s.monogram)))return false;}
 return true;
}
