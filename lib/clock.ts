import type {State} from './planner';

export type RingtoneId='chime'|'bell'|'pulse'|'sunrise'|'alert';
export const ringtoneIds:RingtoneId[]=['chime','bell','pulse','sunrise','alert'];
export const ringtoneNames:Record<RingtoneId,string>={chime:'Chime',bell:'Bell',pulse:'Pulse',sunrise:'Sunrise',alert:'Alert'};

// days is indexed like weekDay(): 0 = Sunday. An empty list means every day.
export type Alarm={id:string;label:string;time:string;days:number[];enabled:boolean;ringtone:RingtoneId;lastFired?:string};
export type Timer={id:string;label:string;seconds:number;endsAt:number|null;ringtone:RingtoneId};
export type Clock={alarms:Alarm[];timers:Timer[]};

export function defaultClock():Clock{
 return {alarms:[],timers:[{id:'pomodoro',label:'Focus block',seconds:1500,endsAt:null,ringtone:'chime'},{id:'break',label:'Short break',seconds:300,endsAt:null,ringtone:'bell'}]};
}

export function upgradeClock(state:State){
 state.clock??=defaultClock();
 const clock=state.clock;
 clock.alarms??=[];clock.timers??=[];
 for(const alarm of clock.alarms){
  alarm.days??=[];
  if(!ringtoneIds.includes(alarm.ringtone))alarm.ringtone='chime';
 }
 for(const timer of clock.timers)if(!ringtoneIds.includes(timer.ringtone))timer.ringtone='chime';
 return clock;
}

export function validTime(value:string){return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);}

/** Wall-clock parts in the planner's timezone, so an alarm fires on Hobart time wherever you are. */
export function localParts(date=new Date()){
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Australia/Hobart',hour:'2-digit',minute:'2-digit',weekday:'short',hourCycle:'h23'}).formatToParts(date);
 const get=(type:string)=>parts.find(p=>p.type===type)?.value??'';
 const weekday=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(get('weekday'));
 return {time:`${get('hour')}:${get('minute')}`,weekday};
}

export function alarmRingsToday(alarm:Alarm,weekday:number){return alarm.days.length===0||alarm.days.includes(weekday);}

/** A minute-resolution key, so a ringing alarm is not re-triggered by the next tick. */
export function fireKey(date=new Date()){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Australia/Hobart',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);
 const get=(type:string)=>parts.find(p=>p.type===type)?.value??'';
 return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

export function dueAlarms(alarms:Alarm[],date=new Date()){
 const {time,weekday}=localParts(date),key=fireKey(date);
 return alarms.filter(a=>a.enabled&&a.time===time&&alarmRingsToday(a,weekday)&&a.lastFired!==key);
}

/** Minutes until an alarm next rings, or null when it never does. */
export function minutesUntil(alarm:Alarm,date=new Date()){
 const {time,weekday}=localParts(date);
 const [nowH,nowM]=time.split(':').map(Number),[alarmH,alarmM]=alarm.time.split(':').map(Number);
 const nowMinutes=nowH*60+nowM,alarmMinutes=alarmH*60+alarmM;
 for(let ahead=0;ahead<8;ahead++){
  const day=(weekday+ahead)%7;
  if(!alarmRingsToday(alarm,day))continue;
  const delta=ahead*1440+alarmMinutes-nowMinutes;
  if(delta>0)return delta;
 }
 return null;
}

export function describeDays(days:number[]){
 if(days.length===0)return 'Every day';
 const names=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
 const sorted=[...days].sort();
 if(sorted.join()==='1,2,3,4,5')return 'Weekdays';
 if(sorted.join()==='0,6')return 'Weekends';
 return [1,2,3,4,5,6,0].filter(d=>sorted.includes(d)).map(d=>names[d]).join(', ');
}

export function formatCountdown(totalSeconds:number){
 const seconds=Math.max(0,Math.round(totalSeconds));
 const hours=Math.floor(seconds/3600),minutes=Math.floor(seconds/60)%60,rest=seconds%60;
 const pad=(n:number)=>String(n).padStart(2,'0');
 return hours?`${hours}:${pad(minutes)}:${pad(rest)}`:`${pad(minutes)}:${pad(rest)}`;
}

export function validClock(value:unknown):value is Clock{
 if(!value||typeof value!=='object')return false;
 const clock=value as Clock;
 if(!Array.isArray(clock.alarms)||!Array.isArray(clock.timers))return false;
 if(clock.alarms.some(a=>!a||typeof a.id!=='string'||typeof a.label!=='string'||a.label.length>120||!validTime(a.time)||typeof a.enabled!=='boolean'||!ringtoneIds.includes(a.ringtone)||!Array.isArray(a.days)||a.days.some(d=>!Number.isInteger(d)||d<0||d>6)))return false;
 if(clock.timers.some(t=>!t||typeof t.id!=='string'||typeof t.label!=='string'||t.label.length>120||!Number.isInteger(t.seconds)||t.seconds<1||t.seconds>86400||!ringtoneIds.includes(t.ringtone)||(t.endsAt!==null&&!Number.isFinite(t.endsAt))))return false;
 return true;
}
