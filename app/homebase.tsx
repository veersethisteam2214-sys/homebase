'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {Sparkles} from 'lucide-react';
import {dayKey,defaultSettings,materializeThrough,type State} from '../lib/planner';
import {inActiveHours} from '../lib/life';
import {primeAudio} from '../lib/ringtones';
import AlarmEngine from '../components/app/alarm-engine';
import Orbital from '../components/app/orbital';
import Overview from '../components/app/overview';
import QuoteGate from '../components/app/quote-gate';
import TopNav from '../components/app/top-nav';
import {Modal,Toast} from '../components/app/ui';
import type {SectionProps,View} from '../components/app/types';
import AssignmentsSection from '../components/app/sections/assignments';
import ClockSection from '../components/app/sections/clock';
import GoalsSection from '../components/app/sections/goals';
import GymSection from '../components/app/sections/gym';
import HistorySection from '../components/app/sections/history';
import ProjectsSection from '../components/app/sections/projects';
import RemindersSection from '../components/app/sections/reminders';
import SettingsSection from '../components/app/sections/settings';
import StreakSection from '../components/app/sections/streak';
import TodaySection from '../components/app/sections/today';
import WatchLaterSection from '../components/app/sections/watch-later';

export default function Homebase(){
 const [state,setState]=useState<State|null>(null);
 const [fatal,setFatal]=useState('');
 const [busy,setBusy]=useState(false);
 const [today,setToday]=useState(()=>dayKey());
 const [view,setView]=useState<View>('dashboard');
 const [storage,setStorage]=useState<'local'|'supabase'|'postgres'>('local');
 const [toast,setToast]=useState<{message:string;tone:'info'|'error'}|null>(null);
 const [quoteDone,setQuoteDone]=useState(false);
 const [nudge,setNudge]=useState<string|null>(null);
 const [listView,setListView]=useState(false);

 const stateRef=useRef<State|null>(null);
 const revision=useRef(0);
 const claiming=useRef(false);

 const notify=useCallback((message:string,tone:'info'|'error'='info')=>setToast({message,tone}),[]);

 const persist=useCallback(async(next:State)=>{
  stateRef.current=next;
  setState(next);
  setBusy(true);
  try{
   const response=await fetch('/api/state',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({state:next,revision:revision.current})});
   const data=await response.json() as {revision?:number;error?:string};
   if(!response.ok)throw Error(data.error||'Your changes could not be saved.');
   if(typeof data.revision==='number')revision.current=data.revision;
  }catch(e){
   notify((e as Error).message,'error');
  }finally{
   setBusy(false);
  }
 },[notify]);

 const change=useCallback<SectionProps['change']>((label,mutate)=>{
  const base=stateRef.current;
  if(!base)return;
  const next=structuredClone(base);
  try{
   mutate(next);
  }catch(e){
   notify((e as Error).message,'error');
   return;
  }
  if(label)next.history=[{id:crypto.randomUUID(),time:new Date().toISOString(),text:label},...next.history].slice(0,500);
  void persist(next);
 },[persist,notify]);

 const adopt=useCallback<SectionProps['adopt']>((next,nextRevision)=>{
  revision.current=nextRevision;
  stateRef.current=next;
  setState(next);
 },[]);

 useEffect(()=>{
  let alive=true;
  (async()=>{
   try{
    const response=await fetch('/api/state');
    const data=await response.json() as {state?:State;revision?:number;storage?:'local'|'supabase'|'postgres';error?:string};
    if(!response.ok||!data.state)throw Error(data.error||'Your Homebase could not be loaded.');
    if(!alive)return;
    revision.current=data.revision??0;
    setStorage(data.storage??'local');
    const key=dayKey();
    const loaded=data.state;
    const before=JSON.stringify(loaded);
    materializeThrough(loaded,key);
    stateRef.current=loaded;
    setToday(key);
    setState(loaded);
    // Today's list is frozen the first time the day is opened, so persist that straight away.
    if(JSON.stringify(loaded)!==before)void persist(loaded);
   }catch(e){
    if(alive)setFatal((e as Error).message);
   }
  })();
  return()=>{alive=false;};
 },[persist]);

 // Browsers need a gesture before audio can play, so the first interaction opens the sound context.
 useEffect(()=>{
  const once=()=>primeAudio();
  document.addEventListener('pointerdown',once,{once:true});
  document.addEventListener('keydown',once,{once:true});
  return()=>{
   document.removeEventListener('pointerdown',once);
   document.removeEventListener('keydown',once);
  };
 },[]);

 const settings=state?.settings??defaultSettings();

 useEffect(()=>{
  const root=document.documentElement;
  // One look: the orbit is a dark field and the section pages share it.
  root.dataset.theme='dark';
  root.style.setProperty('--accent',settings.accent);
 },[settings.accent]);

 // Roll over at midnight without a reload, and freeze the new day's list.
 useEffect(()=>{
  const timer=setInterval(()=>{
   const key=dayKey();
   if(key===today)return;
   setToday(key);
   setQuoteDone(false);
   const base=stateRef.current;
   if(!base)return;
   const next=structuredClone(base);
   materializeThrough(next,key);
   void persist(next);
  },30000);
  return()=>clearInterval(timer);
 },[today,persist]);

 // Random motivation is claimed on the server so two open tabs cannot fire the same nudge.
 const motivation=state?.motivation;
 useEffect(()=>{
  if(!motivation)return;
  const check=async()=>{
   if(claiming.current||!motivation.enabled||!motivation.phrases.length)return;
   if(Date.now()<motivation.nextAt||!inActiveHours(motivation.startHour,motivation.endHour))return;
   if(document.querySelector('[role="dialog"]')||document.activeElement instanceof HTMLInputElement||document.activeElement instanceof HTMLTextAreaElement)return;
   claiming.current=true;
   try{
    const response=await fetch('/api/motivation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'auto'})});
    const data=await response.json() as {state?:State;revision?:number;phrase?:string;skipped?:boolean};
    if(response.ok&&data.state&&typeof data.revision==='number'){
     adopt(data.state,data.revision);
     if(data.phrase&&!data.skipped)setNudge(data.phrase);
    }
   }catch{
    // A missed nudge is not worth interrupting the day for.
   }finally{
    claiming.current=false;
   }
  };
  const timer=setInterval(()=>void check(),15000);
  return()=>clearInterval(timer);
 },[motivation,adopt]);

 if(fatal)return <div className="page"><div className="card card-lift"><h2>Homebase could not load</h2><p className="muted" style={{marginTop:8}}>{fatal}</p><button type="button" className="btn btn-primary" style={{marginTop:16}} onClick={()=>location.reload()}>Try again</button></div></div>;
 if(!state)return <div className="page"><p className="muted">Opening your Homebase&hellip;</p></div>;

 const quoteOpen=Boolean(settings.quotePopup)&&!quoteDone&&!(state.quoteSeen??[]).includes(today);
 const props:SectionProps={state,today,busy,storage,change,adopt,go:setView,notify};

 const body=(()=>{
  switch(view){
   case 'today':return <TodaySection {...props}/>;
   case 'gym':return <GymSection {...props}/>;
   case 'goals':return <GoalsSection {...props}/>;
   case 'assignments':return <AssignmentsSection {...props}/>;
   case 'projects':return <ProjectsSection {...props}/>;
   case 'watch':return <WatchLaterSection {...props}/>;
   case 'clock':return <ClockSection {...props}/>;
   case 'reminders':return <RemindersSection {...props}/>;
   case 'streak':return <StreakSection {...props}/>;
   case 'history':return <HistorySection {...props}/>;
   case 'settings':return <SettingsSection {...props}/>;
   default:return listView
    ? <Overview state={state} today={today} go={setView} onOrbitView={()=>setListView(false)}/>
    : <Orbital state={state} today={today} busy={busy} go={setView} onListView={()=>setListView(true)}/>;
  }
 })();

 // The dashboard is the orbit, full bleed: it carries its own profile menu and needs no bar.
 return <>
  {(view!=='dashboard'||listView)&&<TopNav go={setView} name={state.displayName??''} busy={busy}/>}

  {view==='dashboard'&&!listView?body:<main className="page">{body}</main>}

  <QuoteGate today={today} open={quoteOpen} onClose={()=>{
   setQuoteDone(true);
   change('',s=>{
    s.quoteSeen??=[];
    if(!s.quoteSeen.includes(today))s.quoteSeen.push(today);
   });
  }}/>

  <AlarmEngine state={state} change={change} notify={notify}/>

  <Modal open={nudge!==null} onClose={()=>setNudge(null)} title="A moment of perspective">
   <div style={{textAlign:'center',padding:'4px 0 8px'}}>
    <span className="quote-mark"><Sparkles size={19}/></span>
    <p style={{fontFamily:'var(--serif)',fontSize:25,lineHeight:1.35,marginBottom:22}}>{nudge}</p>
    <button type="button" className="btn btn-primary" onClick={()=>setNudge(null)}>Back to making it count</button>
   </div>
  </Modal>

  {toast&&<Toast message={toast.message} tone={toast.tone} onDone={()=>setToast(null)}/>}
 </>;
}
