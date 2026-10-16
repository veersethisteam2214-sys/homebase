'use client';
import {useState} from 'react';
import {Bell,Pause,Play,Plus,RotateCcw,Trash2,Volume2} from 'lucide-react';
import {weekdays} from '../../../lib/planner';
import {describeDays,formatCountdown,minutesUntil,ringtoneIds,ringtoneNames,validTime,type RingtoneId} from '../../../lib/clock';
import {audioReady,audioSupported,playRingtone,primeAudio} from '../../../lib/ringtones';
import type {SectionProps} from '../types';
import {Card,ConfirmButton,Empty,PageHead,Stat,Switch,useNow} from '../ui';

const dayOrder=[1,2,3,4,5,6,0];

export default function ClockSection({state,busy,change,go,notify}:SectionProps){
 const now=useNow(1000);
 const [draft,setDraft]=useState<{time:string;label:string;days:number[];ringtone:RingtoneId}>({time:'06:30',label:'',days:[],ringtone:'chime'});
 const [timer,setTimer]=useState({label:'',minutes:'10',ringtone:'chime' as RingtoneId});
 const [soundOn,setSoundOn]=useState(false);
 const volume=state.settings?.volume??0.7;

 const clock=state.clock;
 if(!clock)return <div className="stack"><PageHead title="Alarms" back={()=>go('dashboard')}/><Empty>Clock data is still loading.</Empty></div>;

 const enabled=clock.alarms.filter(a=>a.enabled);
 const soonest=enabled.map(a=>minutesUntil(a)).filter((m):m is number=>m!==null).sort((a,b)=>a-b)[0];
 const running=clock.timers.filter(t=>t.endsAt!==null);
 const ready=soundOn&&audioReady();

 const preview=(ringtone:RingtoneId)=>{primeAudio();setSoundOn(true);playRingtone(ringtone,{volume});};

 const askNotifications=async()=>{
  if(typeof Notification==='undefined'){notify('This browser has no notification support.','error');return;}
  if(Notification.permission==='granted'){notify('Notifications are already allowed.');return;}
  const result=await Notification.requestPermission();
  notify(result==='granted'?'Notifications allowed.':'Notifications stayed blocked.',result==='granted'?'info':'error');
 };

 return <div className="stack">
  <PageHead title="Alarms and timers"
   sub={soonest===undefined?'Nothing scheduled':soonest<60?`Next alarm in ${soonest} minutes`:`Next alarm in ${Math.floor(soonest/60)}h ${soonest%60}m`}
   back={()=>go('dashboard')}>
   <div className="row">
    <button type="button" className="btn btn-sm" onClick={()=>{primeAudio();setSoundOn(true);playRingtone('chime',{volume});}}><Volume2 size={15}/>Test sound</button>
    <button type="button" className="btn btn-sm" onClick={askNotifications}><Bell size={15}/>Allow notifications</button>
   </div>
  </PageHead>

  {!ready&&audioSupported()&&<Card tone="dashed">
   <div className="spread">
    <p className="muted" style={{fontSize:14,maxWidth:560}}>
     Browsers only allow sound after you interact with the page. Press test sound once per visit so an alarm can actually be heard.
     Alarms ring while Homebase is open in a tab; a closed browser runs no timers.
    </p>
    <button type="button" className="btn btn-soft btn-sm" onClick={()=>{primeAudio();setSoundOn(true);playRingtone('chime',{volume});}}>Enable sound</button>
   </div>
  </Card>}

  <div className="stats">
   <Stat label="Alarms on" value={`${enabled.length}/${clock.alarms.length}`} note="scheduled"/>
   <Stat label="Timers running" value={running.length} note={`${clock.timers.length} saved`}/>
   <Stat label="Ringtones" value={ringtoneIds.length} note="all synthesised"/>
  </div>

  <div className="split">
   <div className="main">
    <Card tone="lift" title="Alarms">
     {clock.alarms.length===0
      ? <Empty>No alarms yet. Add one below.</Empty>
      : <div className="list">
        {[...clock.alarms].sort((a,b)=>a.time.localeCompare(b.time)).map(alarm=>{
         const until=minutesUntil(alarm);
         return <div key={alarm.id} className="list-row" style={{alignItems:'center'}}>
          <div className="grow">
           <span className="alarm-time" style={alarm.enabled?undefined:{color:'var(--ink-mute)'}}>{alarm.time}</span>
           <div className="tiny" style={{marginTop:2}}>
            {alarm.label?`${alarm.label} · `:''}{describeDays(alarm.days)} &middot; {ringtoneNames[alarm.ringtone]}
            {alarm.enabled&&until!==null?` · in ${until<60?`${until} min`:`${Math.floor(until/60)}h ${until%60}m`}`:''}
           </div>
          </div>
          <button type="button" className="btn-icon" aria-label={`Preview ${ringtoneNames[alarm.ringtone]}`} onClick={()=>preview(alarm.ringtone)}><Play size={15}/></button>
          <Switch checked={alarm.enabled} label={`Alarm at ${alarm.time}`} disabled={busy}
           onChange={()=>change(`${alarm.enabled?'Turned off':'Turned on'} the ${alarm.time} alarm`,s=>{
            const target=s.clock?.alarms.find(a=>a.id===alarm.id);
            if(target)target.enabled=!target.enabled;
           })}/>
          <ConfirmButton label={`Delete the ${alarm.time} alarm`} confirmLabel="Delete" disabled={busy}
           onConfirm={()=>change(`Deleted the ${alarm.time} alarm`,s=>{if(s.clock)s.clock.alarms=s.clock.alarms.filter(a=>a.id!==alarm.id);})}>
           <Trash2 size={16}/>
          </ConfirmButton>
         </div>;
        })}
       </div>}
    </Card>

    <Card title="Add an alarm">
     <form className="stack" style={{gap:14}} onSubmit={e=>{
      e.preventDefault();
      if(!validTime(draft.time)){notify('Use a time like 06:30.','error');return;}
      change(`Added an alarm at ${draft.time}`,s=>{
       s.clock?.alarms.push({id:crypto.randomUUID(),time:draft.time,label:draft.label.trim(),days:[...draft.days],enabled:true,ringtone:draft.ringtone});
      });
      setDraft({time:draft.time,label:'',days:[],ringtone:draft.ringtone});
     }}>
      <div className="field-row">
       <div className="field"><label htmlFor="alarm-time">Time</label><input id="alarm-time" type="time" required value={draft.time} onChange={e=>setDraft({...draft,time:e.target.value})}/></div>
       <div className="field"><label htmlFor="alarm-label">Label</label><input id="alarm-label" value={draft.label} onChange={e=>setDraft({...draft,label:e.target.value})} placeholder="Wake up" maxLength={120}/></div>
       <div className="field">
        <label htmlFor="alarm-tone">Ringtone</label>
        <select id="alarm-tone" value={draft.ringtone} onChange={e=>setDraft({...draft,ringtone:e.target.value as RingtoneId})}>
         {ringtoneIds.map(id=><option key={id} value={id}>{ringtoneNames[id]}</option>)}
        </select>
       </div>
      </div>
      <div className="field">
       <span>Repeat</span>
       <div className="daypick">
        {dayOrder.map(day=><button key={day} type="button" aria-pressed={draft.days.includes(day)}
         onClick={()=>setDraft({...draft,days:draft.days.includes(day)?draft.days.filter(d=>d!==day):[...draft.days,day]})}>
         {weekdays[day]}
        </button>)}
       </div>
       <p className="tiny">No days selected means every day. Times run on Hobart time.</p>
      </div>
      <div className="row">
       <button type="submit" className="btn btn-primary" disabled={busy}><Plus size={17}/>Add alarm</button>
       <button type="button" className="btn btn-sm btn-ghost" onClick={()=>preview(draft.ringtone)}><Play size={15}/>Hear {ringtoneNames[draft.ringtone]}</button>
      </div>
     </form>
    </Card>
   </div>

   <div className="rail">
    <Card eyebrow="Timers">
     <div className="stack" style={{gap:14}}>
      {clock.timers.length===0?<Empty>No timers saved.</Empty>:clock.timers.map(t=>{
       const left=t.endsAt===null?t.seconds:Math.max(0,(t.endsAt-now)/1000);
       return <div key={t.id} style={{paddingBottom:14,borderBottom:'1px solid var(--line)'}}>
        <div className="spread" style={{marginBottom:8}}>
         <strong style={{fontWeight:500}}>{t.label}</strong>
         <ConfirmButton label={`Delete timer ${t.label}`} confirmLabel="Delete" disabled={busy}
          onConfirm={()=>change(`Deleted timer: ${t.label}`,s=>{if(s.clock)s.clock.timers=s.clock.timers.filter(x=>x.id!==t.id);})}>
          <Trash2 size={15}/>
         </ConfirmButton>
        </div>
        <div className="countdown" style={t.endsAt===null?{color:'var(--ink-mute)'}:undefined}>{formatCountdown(left)}</div>
        <div className="row" style={{marginTop:12,gap:8}}>
         {t.endsAt===null
          ? <button type="button" className="btn btn-sm btn-primary" disabled={busy} onClick={()=>{
             primeAudio();setSoundOn(true);
             change('',s=>{const target=s.clock?.timers.find(x=>x.id===t.id);if(target)target.endsAt=Date.now()+target.seconds*1000;});
            }}><Play size={15}/>Start</button>
          : <button type="button" className="btn btn-sm" disabled={busy} onClick={()=>change('',s=>{
             const target=s.clock?.timers.find(x=>x.id===t.id);if(target)target.endsAt=null;
            })}><Pause size={15}/>Stop</button>}
         <button type="button" className="btn-icon" aria-label={`Reset ${t.label}`} disabled={busy} onClick={()=>change('',s=>{
          const target=s.clock?.timers.find(x=>x.id===t.id);if(target)target.endsAt=null;
         })}><RotateCcw size={15}/></button>
         <button type="button" className="btn-icon" aria-label={`Preview ${ringtoneNames[t.ringtone]}`} onClick={()=>preview(t.ringtone)}><Volume2 size={15}/></button>
        </div>
        <p className="tiny" style={{marginTop:8}}>{Math.round(t.seconds/60)} min &middot; {ringtoneNames[t.ringtone]}</p>
       </div>;
      })}
     </div>

     <form className="stack" style={{gap:10,marginTop:4}} onSubmit={e=>{
      e.preventDefault();
      const minutes=Number(timer.minutes);
      const label=timer.label.trim();
      if(!label){notify('Give the timer a name.','error');return;}
      if(!Number.isFinite(minutes)||minutes<1||minutes>1440){notify('Use between 1 and 1440 minutes.','error');return;}
      change(`Added timer: ${label}`,s=>{
       s.clock?.timers.push({id:crypto.randomUUID(),label,seconds:Math.round(minutes*60),endsAt:null,ringtone:timer.ringtone});
      });
      setTimer({label:'',minutes:timer.minutes,ringtone:timer.ringtone});
     }}>
      <div className="field"><label htmlFor="timer-label">New timer</label><input id="timer-label" value={timer.label} onChange={e=>setTimer({...timer,label:e.target.value})} placeholder="Deep work" maxLength={120}/></div>
      <div className="row">
       <label className="sr-only" htmlFor="timer-minutes">Minutes</label>
       <input id="timer-minutes" type="number" min={1} max={1440} value={timer.minutes} onChange={e=>setTimer({...timer,minutes:e.target.value})}/>
       <label className="sr-only" htmlFor="timer-tone">Ringtone</label>
       <select id="timer-tone" value={timer.ringtone} onChange={e=>setTimer({...timer,ringtone:e.target.value as RingtoneId})}>
        {ringtoneIds.map(id=><option key={id} value={id}>{ringtoneNames[id]}</option>)}
       </select>
      </div>
      <button type="submit" className="btn" disabled={busy||!timer.label.trim()}><Plus size={16}/>Add timer</button>
     </form>
    </Card>

    <Card tone="dashed" eyebrow="How the sound works">
     <p className="tiny" style={{lineHeight:1.6}}>
      Every ringtone is generated in the browser rather than loaded from a file, so there is nothing to download and
      they work offline. Alarms and timers need a Homebase tab open on a device that is awake. For alerts that reach
      you with the browser closed, use the phone channel in reminders.
     </p>
    </Card>
   </div>
  </div>
 </div>;
}
