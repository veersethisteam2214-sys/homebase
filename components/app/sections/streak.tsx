'use client';
import {useState} from 'react';
import {Flame,Play,RotateCcw,Trophy} from 'lucide-react';
import {elapsed,resetStreak} from '../../../lib/life';
import type {SectionProps} from '../types';
import {Bar,Card,Empty,Modal,PageHead,Stat,useNow} from '../ui';

const milestones=[1,3,7,14,30,60,90,180,365];
const stamp=(iso:string)=>new Date(iso).toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'});

export default function StreakSection({state,busy,change,go,notify}:SectionProps){
 const now=useNow(1000);
 const [mode,setMode]=useState<'reset'|'date'|null>(null);
 const [start,setStart]=useState('');

 const streak=state.streak??{startedAt:null,past:[]};
 const time=elapsed(streak.startedAt,now);
 const best=Math.max(time.days,...streak.past.map(p=>elapsed(p.startedAt,Date.parse(p.endedAt)).days),0);
 const target=milestones.find(d=>d>time.days)??Math.ceil((time.days+1)/100)*100;

 return <div className="stack">
  <PageHead title="Streak" sub={streak.startedAt?`Running since ${stamp(streak.startedAt)}`:'Not started yet'} back={()=>go('dashboard')}>
   <div className="row">
    {!streak.startedAt
     ? <button type="button" className="btn btn-primary btn-sm" disabled={busy}
        onClick={()=>change('Started a streak',s=>{s.streak={startedAt:new Date().toISOString(),past:s.streak?.past??[]};})}>
        <Play size={15}/>Start now
       </button>
     : <button type="button" className="btn btn-sm" disabled={busy} onClick={()=>setMode('reset')}><RotateCcw size={15}/>Reset</button>}
    <button type="button" className="btn btn-sm btn-ghost" disabled={busy} onClick={()=>{setMode('date');setStart('');}}>
     {streak.startedAt?'Correct start date':'Set a start date'}
    </button>
   </div>
  </PageHead>

  <div className="split">
   <div className="main">
    <Card tone="lift">
     <div className="row" style={{gap:14,alignItems:'center'}}>
      <span className="section-icon" style={{width:46,height:46,borderRadius:12}}><Flame size={22}/></span>
      <div>
       <div className="eyebrow">Current streak</div>
       <div className="row" style={{alignItems:'baseline',gap:8}}>
        <span style={{fontSize:46,fontWeight:600,letterSpacing:'-.03em',fontVariantNumeric:'tabular-nums',lineHeight:1}}>{time.days}</span>
        <span className="muted">{time.days===1?'full day':'full days'}</span>
       </div>
      </div>
     </div>
     {streak.startedAt
      ? <p className="muted" style={{marginTop:14,fontVariantNumeric:'tabular-nums'}}>
        {String(time.hours).padStart(2,'0')} hours and {String(time.minutes).padStart(2,'0')} minutes since the last reset.
       </p>
      : <p className="muted" style={{marginTop:14}}>Start now, or set the date and time your current run began.</p>}
    </Card>

    <Card title="Previous runs">
     {streak.past.length===0?<Empty>Earlier runs are kept here when you reset.</Empty>:<div className="list">
      {streak.past.map((p,i)=><div key={`${p.startedAt}-${i}`} className="list-row">
       <strong className="grow" style={{fontWeight:500}}>{elapsed(p.startedAt,Date.parse(p.endedAt)).days} days</strong>
       <span className="tiny">{stamp(p.startedAt)} &rarr; {stamp(p.endedAt)}</span>
      </div>)}
     </div>}
    </Card>
   </div>

   <div className="rail">
    <Card eyebrow="Next milestone" action={<Trophy size={18} style={{color:'var(--ink-mute)'}}/>}>
     <div className="row" style={{alignItems:'baseline',gap:7,marginBottom:10}}>
      <span style={{fontSize:30,fontWeight:600,letterSpacing:'-.02em',fontVariantNumeric:'tabular-nums'}}>{target}</span>
      <span className="muted">{target===1?'day':'days'}</span>
     </div>
     <Bar value={time.days} max={target}/>
     <p className="tiny" style={{marginTop:10}}>{Math.max(0,target-time.days)} to go</p>
    </Card>
    <div className="stats" style={{gridTemplateColumns:'1fr'}}>
     <Stat label="Personal best" value={`${best} days`} note="longest run so far"/>
     <Stat label="Resets" value={streak.past.length} note="recorded"/>
    </div>
   </div>
  </div>

  <Modal open={mode==='reset'} onClose={()=>setMode(null)} title="Start again"
   description="The current run is saved to previous runs and a new one begins now.">
   <button type="button" className="btn btn-primary" disabled={busy} onClick={()=>{
    change('Reset the streak',s=>{s.streak??={startedAt:null,past:[]};resetStreak(s.streak);});
    setMode(null);
   }}>Save this run and start again</button>
  </Modal>

  <Modal open={mode==='date'} onClose={()=>setMode(null)} title="When did it start?"
   description="Use your own local date and time. The count continues whenever you reopen Homebase.">
   <form className="stack" style={{gap:14}} onSubmit={e=>{
    e.preventDefault();
    const when=new Date(start);
    if(!Number.isFinite(when.getTime())||when.getTime()>Date.now()){notify('Choose a time in the past.','error');return;}
    change('Set the streak start date',s=>{s.streak??={startedAt:null,past:[]};s.streak.startedAt=when.toISOString();});
    setMode(null);
   }}>
    <div className="field">
     <label htmlFor="streak-start">Start date and time</label>
     <input id="streak-start" type="datetime-local" required value={start} onChange={e=>setStart(e.target.value)}/>
    </div>
    <button type="submit" className="btn btn-primary" disabled={busy}>Save start date</button>
   </form>
  </Modal>
 </div>;
}
