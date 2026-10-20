'use client';
import {useState} from 'react';
import {Bell,Check,Cloud,HardDrive,Volume2} from 'lucide-react';
import {accents,defaultSettings} from '../../../lib/planner';
import {ringtoneNames,ringtoneIds} from '../../../lib/clock';
import {playRingtone,primeAudio} from '../../../lib/ringtones';
import type {SectionProps} from '../types';
import {Card,PageHead,Switch} from '../ui';

export default function SettingsSection({state,busy,storage,change,go,notify}:SectionProps){
 const settings=state.settings??defaultSettings();
 const [volume,setVolume]=useState(settings.volume);
 const [name,setName]=useState(state.displayName??'');

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
      <span>Accent</span>
      <div className="row" style={{flexWrap:'wrap',gap:10}}>
       {accents.map(colour=><button key={colour} type="button" disabled={busy}
        aria-label={`Use the accent ${colour}`} aria-pressed={settings.accent===colour}
        onClick={()=>edit('Changed the accent colour',{accent:colour})}
        style={{
         width:40,height:40,borderRadius:12,cursor:'pointer',background:colour,
         border:settings.accent===colour?'3px solid var(--ink)':'1px solid var(--line-strong)',
        }}>
        {settings.accent===colour&&<Check size={16} style={{color:'#fff'}}/>}
       </button>)}
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
 </div>;
}
