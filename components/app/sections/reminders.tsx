'use client';
import {useState} from 'react';
import {Copy,Pause,Play,Plus,Send,Smartphone,Trash2} from 'lucide-react';
import {nextNudge} from '../../../lib/life';
import type {State} from '../../../lib/planner';
import type {SectionProps} from '../types';
import {Card,ConfirmButton,Empty,Modal,PageHead,Switch} from '../ui';

export default function RemindersSection({state,busy,change,adopt,go,notify}:SectionProps){
 const [draft,setDraft]=useState({title:'',time:'09:00'});
 const [phrase,setPhrase]=useState('');
 const [timing,setTiming]=useState(()=>({
  min:state.motivation?.minMinutes??30,
  max:state.motivation?.maxMinutes??90,
  start:state.motivation?.startHour??8,
  end:state.motivation?.endHour??22,
 }));
 const [previewing,setPreviewing]=useState<string|null>(null);
 const [copied,setCopied]=useState(false);
 const [sending,setSending]=useState(false);

 const motivation=state.motivation;
 const editMotivation=(label:string,mutate:(m:NonNullable<State['motivation']>)=>void)=>change(label,s=>{if(s.motivation)mutate(s.motivation);});

 const sendTest=async()=>{
  setSending(true);
  try{
   const response=await fetch('/api/motivation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'phone-test'})});
   const data=await response.json() as {state?:State;revision?:number;phrase?:string;delivery?:string;error?:string};
   if(!response.ok)throw Error(data.error||'The test could not be sent.');
   if(data.state&&typeof data.revision==='number')adopt(data.state,data.revision);
   notify(data.delivery==='sent'?'ntfy accepted the message. Check your phone.':'ntfy did not accept the message.',data.delivery==='sent'?'info':'error');
  }catch(e){notify((e as Error).message,'error');}
  finally{setSending(false);}
 };

 return <div className="stack">
  <PageHead title="Reminders" sub={`${state.reminders.filter(r=>r.enabled).length} of ${state.reminders.length} active`} back={()=>go('dashboard')}/>

  <div className="split">
   <div className="main">
    <Card tone="lift" title="Timed reminders">
     {state.reminders.length===0?<Empty>No reminders yet.</Empty>:<div className="list">
      {[...state.reminders].sort((a,b)=>a.time.localeCompare(b.time)).map(reminder=><div key={reminder.id} className="list-row">
       <span style={{width:56,flex:'none',fontWeight:500,fontVariantNumeric:'tabular-nums'}}>{reminder.time}</span>
       <span className="grow">{reminder.title}</span>
       <Switch checked={reminder.enabled} label={`${reminder.title} enabled`} disabled={busy}
        onChange={()=>change(`${reminder.enabled?'Turned off':'Turned on'} reminder: ${reminder.title}`,s=>{
         const target=s.reminders.find(r=>r.id===reminder.id);
         if(target)target.enabled=!target.enabled;
        })}/>
       <ConfirmButton label={`Delete reminder ${reminder.title}`} confirmLabel="Delete" disabled={busy}
        onConfirm={()=>change(`Deleted reminder: ${reminder.title}`,s=>{s.reminders=s.reminders.filter(r=>r.id!==reminder.id);})}>
        <Trash2 size={16}/>
       </ConfirmButton>
      </div>)}
     </div>}

     <div style={{marginTop:16,paddingTop:14,borderTop:'1px solid var(--line)'}}>
     <form className="entry" onSubmit={e=>{
      e.preventDefault();
      const title=draft.title.trim();
      if(!title)return;
      change(`Added reminder: ${title}`,s=>{s.reminders.push({id:crypto.randomUUID(),title,time:draft.time,enabled:true});});
      setDraft({title:'',time:draft.time});
     }}>
      <label className="sr-only" htmlFor="reminder-title">Reminder</label>
      <input id="reminder-title" value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} placeholder="What should it say" maxLength={200}/>
      <label className="sr-only" htmlFor="reminder-time">Time</label>
      <input id="reminder-time" type="time" value={draft.time} onChange={e=>setDraft({...draft,time:e.target.value})}/>
      <button type="submit" className="btn btn-primary btn-sm" disabled={busy||!draft.title.trim()}><Plus size={16}/>Add</button>
     </form>
     <p className="entry-hint">Reminders use Hobart time and show while Homebase is open. For alarms that make a sound, use the alarms section.</p>
     </div>
    </Card>

    {motivation&&<Card title="Random motivation" action={
     <button type="button" className={motivation.enabled?'btn btn-sm btn-soft':'btn btn-sm'} disabled={busy}
      onClick={()=>editMotivation(`${motivation.enabled?'Paused':'Enabled'} random motivation`,m=>{
       m.enabled=!m.enabled;
       m.nextAt=nextNudge(m.minMinutes,m.maxMinutes);
      })}>
      {motivation.enabled?<Pause size={15}/>:<Play size={15}/>}{motivation.enabled?'Active':'Paused'}
     </button>
    }>
     <p className="muted" style={{marginBottom:16}}>Your own words, at unpredictable moments. Pop-ups wait while you are typing.</p>

     <form className="stack" style={{gap:12,marginBottom:18}} onSubmit={e=>{
      e.preventDefault();
      const {min,max,start,end}=timing;
      if(!Number.isInteger(min)||!Number.isInteger(max)||min<5||max>720||min>max){notify('Use whole minutes from 5 to 720, with the maximum at least the minimum.','error');return;}
      editMotivation('Updated the motivation timing',m=>{
       Object.assign(m,{minMinutes:min,maxMinutes:max,startHour:start,endHour:end,nextAt:nextNudge(min,max)});
      });
     }}>
      <div className="field-row">
       <div className="field"><label htmlFor="m-min">Minimum minutes</label><input id="m-min" type="number" min={5} max={720} value={timing.min} onChange={e=>setTiming({...timing,min:Number(e.target.value)})}/></div>
       <div className="field"><label htmlFor="m-max">Maximum minutes</label><input id="m-max" type="number" min={5} max={720} value={timing.max} onChange={e=>setTiming({...timing,max:Number(e.target.value)})}/></div>
      </div>
      <div className="field-row">
       <div className="field">
        <label htmlFor="m-start">Active from</label>
        <select id="m-start" value={timing.start} onChange={e=>setTiming({...timing,start:Number(e.target.value)})}>
         {Array.from({length:24},(_,h)=><option key={h} value={h}>{String(h).padStart(2,'0')}:00</option>)}
        </select>
       </div>
       <div className="field">
        <label htmlFor="m-end">Until</label>
        <select id="m-end" value={timing.end} onChange={e=>setTiming({...timing,end:Number(e.target.value)})}>
         {Array.from({length:24},(_,h)=><option key={h} value={h}>{String(h).padStart(2,'0')}:00</option>)}
        </select>
       </div>
      </div>
      <button type="submit" className="btn" style={{alignSelf:'flex-start'}} disabled={busy}>Save timing</button>
      <p className="tiny">Matching hours mean all day. The next interval is picked at random after each pop-up.</p>
     </form>

     <div className="eyebrow" style={{marginBottom:8}}>Your phrases</div>
     {motivation.phrases.length===0?<Empty>No phrases yet.</Empty>:<div className="list">
      {motivation.phrases.map((p,i)=><div key={p.id} className="list-row" style={{alignItems:'flex-start'}}>
       <span className="tiny" style={{width:24,flex:'none',paddingTop:2}}>{String(i+1).padStart(2,'0')}</span>
       <span className="grow" style={{fontFamily:'var(--serif)',fontSize:16}}>{p.text}</span>
       <div className="row-actions" style={{opacity:1}}>
        <button type="button" className="btn-icon" aria-label={`Preview phrase ${i+1}`} onClick={()=>setPreviewing(p.text)}><Play size={15}/></button>
        <ConfirmButton label={`Delete phrase ${i+1}`} confirmLabel="Delete" disabled={busy}
         onConfirm={()=>editMotivation('Removed a motivation phrase',m=>{m.phrases=m.phrases.filter(x=>x.id!==p.id);})}>
         <Trash2 size={15}/>
        </ConfirmButton>
       </div>
      </div>)}
     </div>}

     <form className="stack" style={{gap:10,marginTop:14}} onSubmit={e=>{
      e.preventDefault();
      const text=phrase.trim();
      if(!text)return;
      editMotivation('Added a motivation phrase',m=>{m.phrases.push({id:crypto.randomUUID(),text});});
      setPhrase('');
     }}>
      <label className="sr-only" htmlFor="new-phrase">New phrase</label>
      <textarea id="new-phrase" value={phrase} onChange={e=>setPhrase(e.target.value)} rows={2} maxLength={1500} placeholder="Words you want to be reminded of"/>
      <button type="submit" className="btn btn-primary" style={{alignSelf:'flex-start'}} disabled={busy||!phrase.trim()}><Plus size={17}/>Add phrase</button>
     </form>
    </Card>}
   </div>

   <div className="rail">
    {motivation&&<Card eyebrow="Phone alerts" action={<Smartphone size={18} style={{color:'var(--ink-mute)'}}/>}>
     <p className="tiny" style={{lineHeight:1.6,marginBottom:14}}>
      Only the phrase is sent, through <a href="https://docs.ntfy.sh/subscribe/phone/" target="_blank" rel="noopener noreferrer">ntfy</a>.
      Install ntfy, subscribe to the topic below on server https://ntfy.sh, then enable alerts.
     </p>
     {!motivation.phoneTopic
      ? <button type="button" className="btn btn-sm" disabled={busy}
         onClick={()=>editMotivation('Created the phone notification channel',m=>{m.phoneTopic='homebase-'+crypto.randomUUID().replaceAll('-','');})}>
         <Smartphone size={15}/>Create a channel
        </button>
      : <>
        <div className="field">
         <span>Your topic</span>
         <div className="row">
          <code style={{flex:'1 1 auto',minWidth:0,fontSize:12,wordBreak:'break-all',background:'var(--surface-mute)',padding:'8px 10px',borderRadius:8}}>{motivation.phoneTopic}</code>
          <button type="button" className="btn-icon" aria-label="Copy the topic" onClick={async()=>{
           try{await navigator.clipboard.writeText(motivation.phoneTopic);setCopied(true);notify('Topic copied.');}catch{setCopied(false);notify('Copying was blocked. Select the text instead.','error');}
          }}><Copy size={15}/></button>
         </div>
        </div>
        <p className="tiny" style={{marginTop:8}}>Keep it private. Anyone who knows the topic can read or post to it, and it is not end-to-end encrypted.{copied?' Copied.':''}</p>
        <label className="row" style={{marginTop:14,gap:10,cursor:'pointer'}}>
         <input type="checkbox" checked={motivation.phoneEnabled} disabled={busy}
          onChange={()=>editMotivation(`${motivation.phoneEnabled?'Disabled':'Enabled'} phone alerts`,m=>{m.phoneEnabled=!m.phoneEnabled;})}/>
         <span style={{fontSize:13}}>Send these phrases to my phone</span>
        </label>
        <button type="button" className="btn btn-sm" style={{marginTop:12}} disabled={busy||sending||!motivation.phoneEnabled} onClick={()=>void sendTest()}>
         <Send size={15}/>{sending?'Sending':'Send a test'}
        </button>
       </>}
     <p className="tiny" style={{marginTop:14,lineHeight:1.6}}>
      Homebase must be open on an awake device to send. A successful test means ntfy accepted it; check the phone to confirm it arrived.
     </p>
    </Card>}
   </div>
  </div>

  <Modal open={previewing!==null} onClose={()=>setPreviewing(null)} title="Preview">
   <p style={{fontFamily:'var(--serif)',fontSize:24,lineHeight:1.35}}>{previewing}</p>
  </Modal>
 </div>;
}
