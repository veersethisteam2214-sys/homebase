import type {State} from './planner';
import {dayKey,offset,weekDay} from './planner';

export type GymExercise={id:string;name:string;sets:number;reps:number;weight:number};
export type GymSession={id:string;name:string;exercises:GymExercise[]};
export type GymEntry={id:string;date:string;sessionId:string;sessionName:string;note:string;done:string[]};
export type GymBest={id:string;name:string;weight:number;date:string};
// week is indexed by weekDay(): 0 = Sunday. null means a rest day.
export type Gym={sessions:GymSession[];week:(string|null)[];weeklyGoal:number;log:GymEntry[];bests:GymBest[]};

// Monday first, so the week strip reads the way a training week does.
export const weekOrder=[1,2,3,4,5,6,0];

export function defaultGym():Gym{
 return {sessions:[],week:[null,null,null,null,null,null,null],weeklyGoal:4,log:[],bests:[]};
}

export function upgradeGym(state:State){
 state.gym??=defaultGym();
 const gym=state.gym;
 gym.sessions??=[];gym.log??=[];gym.bests??=[];
 gym.weeklyGoal??=4;
 if(!Array.isArray(gym.week)||gym.week.length!==7)gym.week=[null,null,null,null,null,null,null];
 // A deleted session must not leave the week pointing at nothing.
 gym.week=gym.week.map(id=>id&&gym.sessions.some(s=>s.id===id)?id:null);
 return gym;
}

export function sessionFor(gym:Gym,date:string){
 const id=gym.week[weekDay(date)];
 return id?gym.sessions.find(s=>s.id===id)??null:null;
}

export function entryFor(gym:Gym,date:string){return gym.log.find(e=>e.date===date)??null;}

export function weekStart(date:string){
 // Monday of the week containing date.
 const day=weekDay(date);
 return offset(date,day===0?-6:1-day);
}

export function weekDates(date:string){
 const start=weekStart(date);
 return Array.from({length:7},(_,i)=>offset(start,i));
}

export function sessionsThisWeek(gym:Gym,today=dayKey()){
 const dates=weekDates(today);
 return gym.log.filter(e=>dates.includes(e.date)&&e.done.length>0).length;
}

export function plannedThisWeek(gym:Gym){return gym.week.filter(Boolean).length;}

export function startEntry(gym:Gym,date:string){
 const existing=entryFor(gym,date);
 if(existing)return existing;
 const session=sessionFor(gym,date);
 const entry:GymEntry={id:crypto.randomUUID(),date,sessionId:session?.id??'',sessionName:session?.name??'Session',note:'',done:[]};
 gym.log.unshift(entry);
 return entry;
}

export function toggleExercise(gym:Gym,date:string,exerciseId:string){
 const entry=startEntry(gym,date);
 entry.done=entry.done.includes(exerciseId)?entry.done.filter(id=>id!==exerciseId):[...entry.done,exerciseId];
 return entry;
}

export function recordBest(gym:Gym,name:string,weight:number,date:string){
 const trimmed=name.trim();
 if(!trimmed||!Number.isFinite(weight)||weight<=0)throw Error('Give the lift a name and a weight above zero.');
 const existing=gym.bests.find(b=>b.name.toLowerCase()===trimmed.toLowerCase());
 if(existing){if(weight<=existing.weight)throw Error(`Your ${existing.name} best is already ${existing.weight} kg.`);Object.assign(existing,{weight,date});return existing;}
 const best:GymBest={id:crypto.randomUUID(),name:trimmed,weight,date};
 gym.bests.push(best);
 return best;
}

export function lastWeightFor(gym:Gym,exerciseId:string,before:string){
 for(const entry of gym.log){
  if(entry.date>=before||!entry.done.includes(exerciseId))continue;
  const session=gym.sessions.find(s=>s.id===entry.sessionId);
  const exercise=session?.exercises.find(e=>e.id===exerciseId);
  if(exercise)return exercise.weight;
 }
 return null;
}

export function validGym(value:unknown):value is Gym{
 if(!value||typeof value!=='object')return false;
 const gym=value as Gym;
 if(!Array.isArray(gym.sessions)||!Array.isArray(gym.log)||!Array.isArray(gym.bests)||!Array.isArray(gym.week)||gym.week.length!==7)return false;
 if(!Number.isInteger(gym.weeklyGoal)||gym.weeklyGoal<0||gym.weeklyGoal>14)return false;
 if(gym.sessions.some(s=>!s||typeof s.id!=='string'||typeof s.name!=='string'||s.name.length>120||!Array.isArray(s.exercises)||s.exercises.some(e=>!e||typeof e.name!=='string'||e.name.length>120||!Number.isFinite(e.sets)||!Number.isFinite(e.reps)||!Number.isFinite(e.weight))))return false;
 if(gym.log.some(e=>!e||typeof e.date!=='string'||!Array.isArray(e.done)||typeof e.note!=='string'||e.note.length>2000))return false;
 if(gym.bests.some(b=>!b||typeof b.name!=='string'||b.name.length>120||!Number.isFinite(b.weight)))return false;
 return true;
}
