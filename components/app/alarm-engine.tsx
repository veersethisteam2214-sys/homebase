'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {AlarmClock,Timer as TimerIcon} from 'lucide-react';
import {dueAlarms,fireKey,formatCountdown,ringtoneNames,type RingtoneId} from '../../lib/clock';
import {playRingtone} from '../../lib/ringtones';
import {Modal} from './ui';
import type {SectionProps} from './types';

type Ringing={kind:'alarm'|'timer';id:string;label:string;detail:string;ringtone:RingtoneId};

const SNOOZE_MINUTES=9;

/**
 * Watches the clock while Homebase is open. Alarms and timers can only ring in a live tab —
 * a closed browser runs no timers, which is why the reminders section also offers phone alerts.
 */
export default function AlarmEngine({state,change,notify}:Pick<SectionProps,'state'|'change'|'notify'>){
 const [ringing,setRinging]=useState<Ringing|null>(null);
 const snooze=useRef<{at:number;ringing:Ringing}|null>(null);
 const stopSound=useRef<(()=>void)|null>(null);
 const volume=state.settings?.volume??0.7;

 const start=useCallback((next:Ringing)=>{
  stopSound.current?.();
  stopSound.current=playRingtone(next.ringtone,{loops:10,volume});
  setRinging(next);
  if(typeof Notification!=='undefined'&&Notification.permission==='granted'){
   try{new Notification(next.label,{body:next.detail,tag:next.id});}catch{/* notifications are a nicety, never required */}
  }
 },[volume]);

 const silence=useCallback(()=>{stopSound.current?.();stopSound.current=null;},[]);
 useEffect(()=>()=>{stopSound.current?.();},[]);

 const clock=state.clock;
 useEffect(()=>{
  const tick=()=>{
   if(ringing)return;
   const now=Date.now();
   const pending=snooze.current;
   if(pending&&now>=pending.at){snooze.current=null;start(pending.ringing);return;}
   if(!clock)return;
   const [alarm]=dueAlarms(clock.alarms);
   if(alarm){
    const key=fireKey();
    change(`Alarm rang: ${alarm.label||alarm.time}`,s=>{
     const target=s.clock?.alarms.find(a=>a.id===alarm.id);
     if(target)target.lastFired=key;
    });
    start({kind:'alarm',id:alarm.id,label:alarm.label||'Alarm',detail:`${alarm.time} · ${ringtoneNames[alarm.ringtone]}`,ringtone:alarm.ringtone});
    return;
   }
   const timer=clock.timers.find(t=>t.endsAt!==null&&t.endsAt<=now);
   if(timer){
    change(`Timer finished: ${timer.label}`,s=>{
     const target=s.clock?.timers.find(t=>t.id===timer.id);
     if(target)target.endsAt=null;
    });
    start({kind:'timer',id:timer.id,label:timer.label,detail:`${formatCountdown(timer.seconds)} is up`,ringtone:timer.ringtone});
   }
  };
  const handle=setInterval(tick,1000);
  return()=>clearInterval(handle);
 },[clock,ringing,change,start]);

 if(!ringing)return null;

 return <Modal open dismissible={false}>
  <div style={{textAlign:'center',padding:'8px 4px 0'}}>
   <span className="quote-mark ringing" aria-hidden="true">
    {ringing.kind==='alarm'?<AlarmClock size={20}/>:<TimerIcon size={20}/>}
   </span>
   <h2 style={{fontSize:22,marginBottom:6}}>{ringing.label}</h2>
   <p className="muted" style={{marginBottom:24}}>{ringing.detail}</p>
   <div className="row" style={{justifyContent:'center',flexWrap:'wrap'}}>
    <button type="button" className="btn btn-primary" autoFocus onClick={()=>{silence();setRinging(null);}}>Stop</button>
    <button type="button" className="btn" onClick={()=>{
     silence();
     snooze.current={at:Date.now()+SNOOZE_MINUTES*60000,ringing};
     setRinging(null);
     notify(`Snoozed for ${SNOOZE_MINUTES} minutes.`);
    }}>Snooze {SNOOZE_MINUTES} min</button>
   </div>
  </div>
 </Modal>;
}
