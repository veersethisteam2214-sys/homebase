'use client';
import {useState} from 'react';
import {Check,Dot,Pencil,Plus,Trash2,Trophy} from 'lucide-react';
import {weekdays} from '../../../lib/planner';
import {entryFor,lastWeightFor,recordBest,sessionFor,sessionsThisWeek,startEntry,toggleExercise,weekDates,weekOrder} from '../../../lib/gym';
import type {SectionProps} from '../types';
import {Bar,Card,ConfirmButton,Empty,Modal,PageHead,Timeline,TimelineRow} from '../ui';

const shortDate=(date:string)=>new Date(date+'T12:00:00Z').toLocaleDateString('en-AU',{day:'numeric',month:'short',timeZone:'UTC'});

export default function GymSection({state,today,busy,change,go,notify}:SectionProps){
 const [pickDay,setPickDay]=useState<number|null>(null);
 const [editSplit,setEditSplit]=useState(false);
 const [openSession,setOpenSession]=useState<string|null>(null);
 const [sessionName,setSessionName]=useState('');
 const [exercise,setExercise]=useState({name:'',sets:'3',reps:'10',weight:'0'});
 const [best,setBest]=useState({name:'',weight:''});

 const gym=state.gym;
 if(!gym)return <div className="stack"><PageHead title="Gym" back={()=>go('dashboard')}/><Empty>Gym data is still loading.</Empty></div>;

 const dates=weekDates(today);
 const session=sessionFor(gym,today);
 const entry=entryFor(gym,today);
 const done=entry?.done??[];
 const doneThisWeek=sessionsThisWeek(gym,today);
 const current=openSession?gym.sessions.find(s=>s.id===openSession)??null:null;

 const status=(date:string)=>{
  const dayEntry=gym.log.find(e=>e.date===date);
  const planned=gym.week[new Date(date+'T12:00:00Z').getUTCDay()];
  if(dayEntry&&dayEntry.done.length)return {text:'Done',tone:'var(--accent-ink)'};
  if(date===today)return {text:'Today',tone:'var(--accent-ink)'};
  if(!planned)return {text:'—',tone:'var(--ink-mute)'};
  if(date<today)return {text:'Missed',tone:'var(--warn)'};
  return {text:'Planned',tone:'var(--ink-mute)'};
 };

 return <div className="stack">
  <PageHead title="Gym" sub={session?`${session.name} today`:'Rest day today'} back={()=>go('dashboard')}>
   <div className="row">
    <button type="button" className="btn btn-sm" onClick={()=>setEditSplit(true)}><Pencil size={15}/>Edit split</button>
   </div>
  </PageHead>

  <Card title="This week" action={<span className="tiny">Click a day to change what it is</span>}>
   <div className="week-strip">
    {dates.map((date,i)=>{
     const weekday=weekOrder[i];
     const planned=gym.week[weekday];
     const named=planned?gym.sessions.find(s=>s.id===planned)?.name??'Session':'Rest';
     const info=status(date);
     return <button key={date} type="button" className={date===today?'day-cell is-today':'day-cell'} onClick={()=>setPickDay(weekday)}>
      <span className="eyebrow">{weekdays[weekday]}</span>
      <b style={planned?undefined:{color:'var(--ink-mute)'}}>{named}</b>
      <span className="tiny" style={{color:info.tone,marginTop:6,display:'block'}}>{info.text}</span>
     </button>;
    })}
   </div>
  </Card>

  <div className="split">
   <div className="main">
    <Card tone="lift" title={session?`Today · ${session.name}`:'Today · rest'}
     action={session&&session.exercises.length>0?<span className="tiny">{done.length} of {session.exercises.length} ticked</span>:null}>
     {!session
      ? <Empty>Nothing scheduled today. Assign a session to this weekday above, or rest.</Empty>
      : session.exercises.length===0
       ? <Empty>This session has no exercises yet. Add them in edit split.</Empty>
       : <Timeline lead={34}>
         {session.exercises.map((e,index)=>{
          const last=lastWeightFor(gym,e.id,today);
          const ticked=done.includes(e.id);
          return <TimelineRow
           key={e.id}
           tone={ticked?'done':'plain'}
           lead={String(index+1).padStart(2,'0')}
           marker={ticked?<Check size={12}/>:null}
           title={e.name}
           meta={<>
            {e.sets}&times;{e.reps}
            {e.weight?` · ${e.weight} kg`:''}
            {last===null?'':` · last ${last} kg`}
           </>}
           trailing={<input type="checkbox" aria-label={`${e.name} done`} checked={ticked} disabled={busy}
            onChange={()=>change('',s=>{if(s.gym)toggleExercise(s.gym,today,e.id);})}/>}
          />;
         })}
        </Timeline>}
    </Card>

    {session&&<Card title="Session note">
     <label className="sr-only" htmlFor="gym-note">Session note</label>
     <textarea id="gym-note" rows={2} defaultValue={entry?.note??''} placeholder="How it felt, what to push next time"
      onBlur={e=>{
       const value=e.target.value;
       if((entry?.note??'')===value)return;
       change('',s=>{if(s.gym)startEntry(s.gym,today).note=value;});
      }}/>
     <p className="tiny" style={{marginTop:6}}>Saved when you click away.</p>
    </Card>}
   </div>

   <div className="rail">
    <Card eyebrow="This week">
     <div className="row" style={{alignItems:'baseline',gap:7,marginBottom:10}}>
      <span style={{fontSize:30,fontWeight:600,letterSpacing:'-.02em',fontVariantNumeric:'tabular-nums'}}>{doneThisWeek}</span>
      <span className="muted">of {gym.weeklyGoal} sessions</span>
     </div>
     <Bar value={doneThisWeek} max={gym.weeklyGoal}/>
     <div className="field" style={{marginTop:16}}>
      <label htmlFor="weekly-goal">Weekly goal</label>
      <input id="weekly-goal" type="number" min={0} max={14} defaultValue={gym.weeklyGoal} disabled={busy}
       onBlur={e=>{
        const value=Number(e.target.value);
        if(!Number.isInteger(value)||value<0||value>14){notify('Use a whole number from 0 to 14.','error');e.target.value=String(gym.weeklyGoal);return;}
        if(value===gym.weeklyGoal)return;
        change(`Set the weekly gym goal to ${value}`,s=>{if(s.gym)s.gym.weeklyGoal=value;});
       }}/>
     </div>
    </Card>

    <Card eyebrow="Personal bests" action={<Trophy size={18} style={{color:'var(--ink-mute)'}}/>}>
     {gym.bests.length===0?<Empty>No bests recorded yet.</Empty>:<Timeline lead={52}>
      {[...gym.bests].sort((a,b)=>b.weight-a.weight).map(b=>
       <TimelineRow
        key={b.id}
        tone="active"
        lead={<><strong>{b.weight}</strong>kg</>}
        marker={<Trophy size={11}/>}
        title={b.name}
        meta={shortDate(b.date)}
       />)}
     </Timeline>}
     <form className="stack" style={{gap:9,marginTop:16,paddingTop:14,borderTop:'1px solid var(--line)'}} onSubmit={e=>{
      e.preventDefault();
      const weight=Number(best.weight);
      change(`Recorded a best: ${best.name.trim()} ${weight} kg`,s=>{if(s.gym)recordBest(s.gym,best.name,weight,today);});
      setBest({name:'',weight:''});
     }}>
      <label className="sr-only" htmlFor="best-name">Lift</label>
      <input id="best-name" value={best.name} onChange={e=>setBest({...best,name:e.target.value})} placeholder="Lift, for example squat" maxLength={120}/>
      <div className="row">
       <label className="sr-only" htmlFor="best-weight">Weight in kilograms</label>
       <input id="best-weight" type="number" min={1} step="0.5" value={best.weight} onChange={e=>setBest({...best,weight:e.target.value})} placeholder="kg"/>
       <button type="submit" className="btn" disabled={busy||!best.name.trim()||!best.weight}>Save</button>
      </div>
     </form>
    </Card>

    {gym.sessions.length===0&&<Card tone="dashed" eyebrow="Your split">
     <p className="muted" style={{fontSize:13}}>Add your sessions and the week strip and daily list build themselves.</p>
     <button type="button" className="btn btn-soft btn-sm" style={{marginTop:12}} onClick={()=>setEditSplit(true)}>Set up the split</button>
    </Card>}
   </div>
  </div>

  <Modal open={pickDay!==null} onClose={()=>setPickDay(null)} title={pickDay===null?'':`${weekdays[pickDay]}`} description="Pick the session for this weekday, or make it a rest day.">
   <div className="stack" style={{gap:8}}>
    <button type="button" className="btn" disabled={busy} onClick={()=>{
     change(`Set ${weekdays[pickDay??0]} as a rest day`,s=>{if(s.gym&&pickDay!==null)s.gym.week[pickDay]=null;});
     setPickDay(null);
    }}>Rest day</button>
    {gym.sessions.map(s=><button key={s.id} type="button" className="btn" disabled={busy} onClick={()=>{
     change(`Set ${weekdays[pickDay??0]} to ${s.name}`,next=>{if(next.gym&&pickDay!==null)next.gym.week[pickDay]=s.id;});
     setPickDay(null);
    }}>{s.name} <span className="tiny">{s.exercises.length} exercises</span></button>)}
    {gym.sessions.length===0&&<Empty>No sessions yet. Create one in edit split first.</Empty>}
   </div>
  </Modal>

  <Modal open={editSplit} onClose={()=>{setEditSplit(false);setOpenSession(null);}} wide
   title={current?current.name:'Your split'}
   description={current?'Exercises run in this order during the session.':'Create a session for each training day, then add its exercises.'}>
   {!current?<>
    {gym.sessions.length===0
     ? <Empty>No sessions yet.</Empty>
     : <Timeline lead={34}>
       {gym.sessions.map((s,index)=><TimelineRow
        key={s.id}
        tone={s.exercises.length?'active':'plain'}
        lead={String(index+1).padStart(2,'0')}
        marker={s.exercises.length?<Dot size={11}/>:null}
        title={s.name}
        meta={s.exercises.length===1?'1 exercise':`${s.exercises.length} exercises`}
        openLabel={`Open ${s.name}`}
        onOpen={()=>setOpenSession(s.id)}
        trailing={<>
         <button type="button" className="btn-icon" aria-label={`Edit ${s.name}`} onClick={()=>setOpenSession(s.id)}><Pencil size={16}/></button>
         <ConfirmButton label={`Delete ${s.name}`} confirmLabel="Delete" disabled={busy}
          onConfirm={()=>change(`Deleted gym session: ${s.name}`,next=>{
           if(!next.gym)return;
           next.gym.sessions=next.gym.sessions.filter(x=>x.id!==s.id);
           next.gym.week=next.gym.week.map(id=>id===s.id?null:id);
          })}>
          <Trash2 size={16}/>
         </ConfirmButton>
        </>}
       />)}
      </Timeline>}
    <form className="entry" style={{marginTop:16}} onSubmit={e=>{
     e.preventDefault();
     const name=sessionName.trim();
     if(!name)return;
     const id=crypto.randomUUID();
     change(`Added gym session: ${name}`,s=>{s.gym?.sessions.push({id,name,exercises:[]});});
     setSessionName('');
     setOpenSession(id);
    }}>
     <label className="sr-only" htmlFor="session-name">Session name</label>
     <input id="session-name" value={sessionName} onChange={e=>setSessionName(e.target.value)} placeholder="Push, pull or legs" maxLength={60}/>
     <button type="submit" className="btn btn-primary btn-sm" disabled={busy||!sessionName.trim()}><Plus size={16}/>Add session</button>
    </form>
   </>:<>
    <button type="button" className="back-link" onClick={()=>setOpenSession(null)}>All sessions</button>
    <div style={{marginBottom:18}}>
     {current.exercises.length===0
      ? <Empty>No exercises yet.</Empty>
      : <Timeline lead={34}>
        {current.exercises.map((e,index)=><TimelineRow
         key={e.id}
         lead={String(index+1).padStart(2,'0')}
         marker={<Dot size={11}/>}
         title={e.name}
         meta={<>{e.sets}&times;{e.reps}{e.weight?` · ${e.weight} kg`:''}</>}
         trailing={<ConfirmButton label={`Delete ${e.name}`} confirmLabel="Delete" disabled={busy}
          onConfirm={()=>change(`Removed ${e.name} from ${current.name}`,next=>{
           const target=next.gym?.sessions.find(s=>s.id===current.id);
           if(target)target.exercises=target.exercises.filter(x=>x.id!==e.id);
          })}>
          <Trash2 size={16}/>
         </ConfirmButton>}
        />)}
       </Timeline>}
    </div>
    <form className="stack" style={{gap:10}} onSubmit={e=>{
     e.preventDefault();
     const name=exercise.name.trim();
     const sets=Number(exercise.sets),reps=Number(exercise.reps),weight=Number(exercise.weight);
     if(!name)return;
     if(!Number.isFinite(sets)||!Number.isFinite(reps)||!Number.isFinite(weight)||sets<1||reps<1||weight<0){notify('Use numbers for sets, reps and weight.','error');return;}
     change(`Added ${name} to ${current.name}`,next=>{
      next.gym?.sessions.find(s=>s.id===current.id)?.exercises.push({id:crypto.randomUUID(),name,sets,reps,weight});
     });
     setExercise({name:'',sets:String(sets),reps:String(reps),weight:'0'});
    }}>
     <div className="field">
      <label htmlFor="ex-name">Exercise</label>
      <input id="ex-name" value={exercise.name} onChange={e=>setExercise({...exercise,name:e.target.value})} placeholder="Bench press" maxLength={120}/>
     </div>
     <div className="field-row">
      <div className="field"><label htmlFor="ex-sets">Sets</label><input id="ex-sets" type="number" min={1} max={20} value={exercise.sets} onChange={e=>setExercise({...exercise,sets:e.target.value})}/></div>
      <div className="field"><label htmlFor="ex-reps">Reps</label><input id="ex-reps" type="number" min={1} max={100} value={exercise.reps} onChange={e=>setExercise({...exercise,reps:e.target.value})}/></div>
      <div className="field"><label htmlFor="ex-weight">Weight (kg)</label><input id="ex-weight" type="number" min={0} step="0.5" value={exercise.weight} onChange={e=>setExercise({...exercise,weight:e.target.value})}/></div>
     </div>
     <button type="submit" className="btn btn-primary" disabled={busy||!exercise.name.trim()}><Plus size={17}/>Add exercise</button>
    </form>
   </>}
  </Modal>
 </div>;
}
