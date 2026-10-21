'use client';
import {useState} from 'react';
import {Bell,Check,Cloud,Download,HardDrive,Upload,Volume2} from 'lucide-react';
import {accents,defaultSettings} from '../../../lib/planner';
import type {State} from '../../../lib/planner';
import {ringtoneNames,ringtoneIds} from '../../../lib/clock';
import {playRingtone,primeAudio} from '../../../lib/ringtones';
import type {SectionProps} from '../types';
import {Card,Modal,PageHead,Switch} from '../ui';

const REQUIRED=['tasks','history','routine','projects','goals','assignments','reminders','unlocked'] as const;
const summary=(planner:State)=>[
 `${planner.goals.length} goals`,
 `${planner.projects.length} projects`,
 `${planner.assignments.length} assessments`,
 `${planner.routine.length} routine steps`,
 `${planner.tasks.length} tasks`,
].join(' · ');

export default function SettingsSection({state,today,busy,storage,change,go,notify}:SectionProps){
 const settings=state.settings??defaultSettings();
 const [volume,setVolume]=useState(settings.volume);
 const [name,setName]=useState(state.displayName??'');
 const [pending,setPending]=useState<{name:string;planner:State}|null>(null);

 const exportPlanner=()=>{
  const blob=new Blob([JSON.stringify(state,null,1)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;
  link.download=`homebase-${today}.json`;
  link.click();
  URL.revokeObjectURL(url);
  notify('Planner exported.');
 };

 // Read and check the file before anything is replaced, so a wrong file is caught here
 // rather than by the server after the current planner is already gone.
 const stage=async(file:File)=>{
  try{
   const planner=JSON.parse(await file.text()) as State;
   const shaped=planner&&typeof planner==='object'
    &&REQUIRED.every(key=>Array.isArray((planner as unknown as Record<string,unknown>)[key]))
    &&planner.checks&&typeof planner.checks==='object';
   if(!shaped)throw Error('That file is not a Homebase planner.');
   setPending({name:file.name,planner});
  }catch(e){
   notify(e instanceof SyntaxError?'That file is not valid JSON.':(e as Error).message,'error');
  }
 };

 const edit=(label:string,patch:Partial<typeof settings>)=>change(label,s=>{
  s.settings={...defaultSettings(),...s.settings,...patch};
 });

 const askNotifications=async()=>{
  if(typeof Notification==='undefined'){notify('This browser has no notification support.','error');return;}
  if(Notification.permission==='denied'){notify('Notifications are blocked in your browser settings.','error');return;}
  if(Notification.permission==='granted'){notify('Notifications are already allowed.');return;}
  const result=await Notification.requestPermission();
  notify(result==='granted'?'Notifications allowed.':'Notifications stayed blocked.',result==='granted'?'info':'error');
 };

 const permission=typeof Notification!=='undefined'?Notification.permission:'unsupported';

 return <div className="stack">
  <PageHead title="Settings" sub="Your name, the look, sound and where data is kept" back={()=>go('dashboard')}/>

  <div className="split">
   <div className="main">
    <Card tone="lift" title="Profile">
     <div className="field">
      <label htmlFor="display-name">Name used in greetings</label>
      <input id="display-name" value={name} maxLength={80} placeholder="Veer" disabled={busy}
       onChange={e=>setName(e.target.value)}
       onBlur={()=>{
        const next=name.trim();
        if(next===(state.displayName??''))return;
        change(next?`Set the display name to ${next}`:'Cleared the display name',s=>{s.displayName=next||undefined;});
       }}/>
      <p className="tiny">Shown on the dashboard. Saved when you click away.</p>
     </div>
    </Card>

    <Card title="Appearance">
     <div className="field">
      <span>Highlight colour</span>
      <div className="row" style={{flexWrap:'wrap',gap:10}}>
       {accents.map(colour=>{
        const active=settings.accent.toLowerCase()===colour.hex.toLowerCase();
        return <button key={colour.hex} type="button" disabled={busy} title={colour.name}
         aria-label={`Use the ${colour.name} highlight`} aria-pressed={active}
         onClick={()=>edit(`Changed the highlight colour to ${colour.name.toLowerCase()}`,{accent:colour.hex})}
         style={{
          width:40,height:40,borderRadius:12,cursor:'pointer',background:colour.hex,
          display:'inline-flex',alignItems:'center',justifyContent:'center',
          border:active?'3px solid var(--ink)':'1px solid var(--line-strong)',
         }}>
         {active&&<Check size={16} style={{color:'#fff'}}/>}
        </button>;
       })}
      </div>
      <p className="tiny">Every tint, button and progress bar follows this colour.</p>
     </div>
    </Card>

    <Card title="Sound">
     <div className="field">
      <label htmlFor="volume">Alarm and timer volume</label>
      <div className="row" style={{gap:14}}>
       <input id="volume" type="range" min={0} max={1} step={0.05} value={volume} style={{flex:'1 1 auto'}}
        onChange={e=>setVolume(Number(e.target.value))}
        onMouseUp={()=>{if(volume!==settings.volume)edit('Changed the alarm volume',{volume});}}
        onTouchEnd={()=>{if(volume!==settings.volume)edit('Changed the alarm volume',{volume});}}/>
       <span className="num" style={{width:44,textAlign:'right'}}>{Math.round(volume*100)}%</span>
      </div>
     </div>
     <div className="row" style={{flexWrap:'wrap',gap:8,marginTop:14}}>
      {ringtoneIds.map(id=><button key={id} type="button" className="btn btn-sm"
       onClick={()=>{primeAudio();playRingtone(id,{volume});}}>
       <Volume2 size={14}/>{ringtoneNames[id]}
      </button>)}
     </div>
     <p className="tiny" style={{marginTop:12}}>Ringtones are generated in the browser, so they need no files and work offline.</p>
    </Card>

    <Card title="Your data" action={<span className="tiny">Moves a planner between installations</span>}>
     <p className="muted" style={{marginBottom:14}}>
      Export writes your whole planner to a file. Import replaces this planner with one from a file,
      which is how you move it from a local copy onto a hosted one without touching the database.
     </p>
     <div className="row" style={{flexWrap:'wrap',gap:10}}>
      <button type="button" className="btn" onClick={exportPlanner}><Download size={16}/>Export planner</button>
      <label className="btn" style={{cursor:'pointer'}}>
       <Upload size={16}/>Import planner
       <input type="file" accept="application/json,.json" style={{display:'none'}} disabled={busy}
        onChange={e=>{
         const file=e.target.files?.[0];
         e.target.value='';
         if(file)void stage(file);
        }}/>
      </label>
     </div>
     <p className="tiny" style={{marginTop:12}}>Importing replaces everything here. You are asked to confirm first.</p>
    </Card>
   </div>

   <div className="rail">
    <Card eyebrow="Daily quote">
     <div className="spread">
      <p style={{fontSize:14,maxWidth:200}}>Show a new quote when you open Homebase each day</p>
      <Switch checked={settings.quotePopup} label="Show the daily quote" disabled={busy}
       onChange={()=>edit(settings.quotePopup?'Turned off the daily quote':'Turned on the daily quote',{quotePopup:!settings.quotePopup})}/>
     </div>
     <p className="tiny" style={{marginTop:10}}>There are 900 distinct phrases before the cycle repeats.</p>
    </Card>

    <Card eyebrow="Notifications">
     <p style={{fontSize:14,marginBottom:12}}>
      {permission==='granted'?'Allowed. Alarms and timers also raise a desktop notification.'
       :permission==='denied'?'Blocked in your browser settings, so alarms will only make a sound.'
       :permission==='unsupported'?'This browser has no notification support.'
       :'Not asked yet. Allow them and alarms will also raise a desktop notification.'}
     </p>
     <button type="button" className="btn btn-sm" onClick={()=>void askNotifications()}><Bell size={15}/>
      {permission==='granted'?'Already allowed':'Allow notifications'}
     </button>
    </Card>

    <Card eyebrow="Storage">
     <div className="row" style={{gap:10,marginBottom:10}}>
      {storage==='local'?<HardDrive size={18} style={{color:'var(--ink-mute)'}}/>:<Cloud size={18} style={{color:'var(--ink-mute)'}}/>}
      <strong style={{fontWeight:500}}>
       {storage==='postgres'?'Hosted Postgres':storage==='supabase'?'Supabase Postgres':'Local database'}
      </strong>
     </div>
     <p className="tiny" style={{lineHeight:1.6}}>
      {storage==='postgres'
       ? 'Saved to the hosted database. Access to this deployment is controlled by the host.'
       : storage==='supabase'
        ? 'Saved through the authenticated server bridge. Only you can read it.'
        : 'Saved to the local development database on this machine. Keep the state folder to retain your data.'}
     </p>
    </Card>

    <Card tone="dashed" eyebrow="What runs only while open">
     <p className="tiny" style={{lineHeight:1.6}}>
      Alarms, timers, reminders and random motivation all need a Homebase tab open on an awake device. Phone alerts
      through ntfy are the only ones that reach you elsewhere, and they still need this app open to send.
     </p>
    </Card>
   </div>
  </div>

  <Modal open={pending!==null} onClose={()=>setPending(null)} title="Replace this planner?"
   description="Everything currently here is overwritten by the file. This cannot be undone, so export first if you have not.">
   {pending&&<div className="stack" style={{gap:14}}>
    <div className="card" style={{padding:'14px 16px'}}>
     <div className="eyebrow">Coming in</div>
     <strong style={{display:'block',marginTop:4,fontWeight:500}}>{pending.name}</strong>
     <p className="tiny" style={{marginTop:6}}>{summary(pending.planner)}</p>
    </div>
    <div className="card" style={{padding:'14px 16px'}}>
     <div className="eyebrow">Being replaced</div>
     <p className="tiny" style={{marginTop:6}}>{summary(state)}</p>
    </div>
    <div className="row">
     <button type="button" className="btn btn-primary" disabled={busy} onClick={()=>{
      const planner=pending.planner;
      change('Imported a planner from a file',draft=>{
       for(const key of Object.keys(draft))delete (draft as unknown as Record<string,unknown>)[key];
       Object.assign(draft,planner);
      });
      setPending(null);
      notify('Planner imported.');
     }}>Replace planner</button>
     <button type="button" className="btn" onClick={()=>setPending(null)}>Cancel</button>
    </div>
   </div>}
  </Modal>
 </div>;
}
