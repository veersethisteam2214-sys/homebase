'use client';
import {useState} from 'react';
import {Check,Dot,Pin,PinOff,Plus,Trash2} from 'lucide-react';
import {capitalise,weekdays,type ProjectNote,type Unit} from '../../../lib/planner';
import type {SectionProps} from '../types';
import {Card,ConfirmButton,Empty,PageHead,Stat,Timeline,TimelineRow} from '../ui';

const statuses=[{value:'',label:'Outstanding'},{value:'submitted',label:'Submitted'},{value:'graded',label:'Graded'}];
const done=(status:string)=>['submitted','graded'].includes(status);

/** The gutter of a due date: the day over the month, so the column scans vertically. */
const dayAndMonth=(date:string)=>{
 const at=new Date(date+'T12:00:00Z');
 return <>
  <strong>{at.toLocaleDateString('en-AU',{day:'numeric',timeZone:'UTC'})}</strong>
  <br/>
  {at.toLocaleDateString('en-AU',{month:'short',timeZone:'UTC'})}
 </>;
};

const when=(iso:string)=>{
 const at=new Date(iso);
 return <>
  {at.toLocaleDateString('en-AU',{day:'numeric',month:'short'})}
  <br/>
  {at.toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit',hour12:false})}
 </>;
};

const daysBetween=(from:string,to:string)=>Math.round((Date.parse(`${to}T12:00:00Z`)-Date.parse(`${from}T12:00:00Z`))/86400000);

const dueWord=(days:number)=>{
 if(days<0)return `${Math.abs(days)} day${Math.abs(days)===1?'':'s'} overdue`;
 if(days===0)return 'Due today';
 if(days===1)return 'Due tomorrow';
 return `Due in ${days} days`;
};

type Draft={title:string;date:string;weight:string};
const emptyDraft:Draft={title:'',date:'',weight:''};

export default function AssignmentsSection({state,today,busy,change,go,notify}:SectionProps){
 const [drafts,setDrafts]=useState<Record<string,Draft>>({});
 const [notes,setNotes]=useState<Record<string,string>>({});
 const [unitDraft,setUnitDraft]=useState('');
 const [entry,setEntry]=useState({day:'Mon',start:'09:00',end:'10:00',unit:'',kind:'Lecture',location:''});

 const units=state.units??[];
 const classes=state.classes??[];
 const pending=state.assignments.filter(a=>!done(a.status));
 const nextUp=[...pending].sort((a,b)=>a.date.localeCompare(b.date))[0];
 const loose=state.assignments.filter(a=>!units.some(u=>u.name===a.unit));

 const draftFor=(key:string)=>drafts[key]??emptyDraft;
 const setDraft=(key:string,patch:Partial<Draft>)=>setDrafts(all=>({...all,[key]:{...draftFor(key),...patch}}));

 const editUnit=(id:string,label:string,mutate:(u:Unit)=>void)=>change(label,s=>{
  const target=s.units?.find(u=>u.id===id);
  if(target)mutate(target);
 });

 const addAssessment=(unitName:string,key:string)=>{
  const draft=draftFor(key);
  const title=capitalise(draft.title);
  if(!title){notify('Name the assessment first.','error');return;}
  if(!/^\d{4}-\d{2}-\d{2}$/.test(draft.date)){notify('Pick a due date.','error');return;}
  change(`Added assessment: ${title}`,s=>{
   s.assignments.push({id:crypto.randomUUID(),date:draft.date,unit:unitName,title,weight:draft.weight.trim(),format:'',notes:'',status:''});
  });
  setDrafts(all=>({...all,[key]:emptyDraft}));
 };

 const addNote=(unit:Unit)=>{
  const text=notes[unit.id]?.trim();
  if(!text)return;
  editUnit(unit.id,`Added a note to ${unit.name}`,u=>{
   u.notes=[{id:crypto.randomUUID(),text,at:new Date().toISOString()},...(u.notes??[])];
  });
  setNotes(all=>({...all,[unit.id]:''}));
 };

 /** One assessment, however it got here: inside a unit or in the loose pile. */
 const assessmentRow=(a:typeof state.assignments[number])=>{
  const finished=done(a.status);
  const away=daysBetween(today,a.date);
  return <TimelineRow
   key={a.id}
   tone={finished?'done':away<0?'warn':away<=7?'active':'plain'}
   lead={dayAndMonth(a.date)}
   marker={finished?<Check size={12}/>:null}
   title={a.title}
   meta={<>
    {a.weight?`${a.weight} · `:''}
    {a.format?`${a.format} · `:''}
    {finished?statuses.find(s=>s.value===a.status)?.label:dueWord(away)}
   </>}
   trailing={<>
    <label className="sr-only" htmlFor={`status-${a.id}`}>Status for {a.title}</label>
    <select id={`status-${a.id}`} className="tl-select" value={statuses.some(s=>s.value===a.status)?a.status:''} disabled={busy}
     onChange={e=>change(`Marked ${a.title} as ${statuses.find(s=>s.value===e.target.value)?.label.toLowerCase()}`,s=>{
      const target=s.assignments.find(x=>x.id===a.id);
      if(target)target.status=e.target.value;
     })}>
     {statuses.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}
    </select>
    <ConfirmButton label={`Delete ${a.title}`} confirmLabel="Delete" disabled={busy}
     onConfirm={()=>change(`Deleted assessment: ${a.title}`,s=>{s.assignments=s.assignments.filter(x=>x.id!==a.id);})}>
     <Trash2 size={16}/>
    </ConfirmButton>
   </>}
  />;
 };

 const noteRow=(unit:Unit,n:ProjectNote)=><TimelineRow
  key={n.id}
  tone={n.pinned?'active':'plain'}
  lead={when(n.at)}
  marker={n.pinned?<Pin size={11}/>:null}
  title={<span className="tl-note">{n.text}</span>}
  trailing={<>
   <button type="button" className="btn-icon" aria-label={n.pinned?'Unpin note':'Pin as important'} disabled={busy}
    style={n.pinned?{color:'var(--accent)'}:undefined}
    onClick={()=>editUnit(unit.id,n.pinned?'Unpinned a unit note':'Pinned a unit note',u=>{
     const target=u.notes?.find(x=>x.id===n.id);
     if(target)target.pinned=!target.pinned;
    })}>
    {n.pinned?<PinOff size={16}/>:<Pin size={16}/>}
   </button>
   <ConfirmButton label="Delete note" confirmLabel="Delete" disabled={busy}
    onConfirm={()=>editUnit(unit.id,'Deleted a unit note',u=>{u.notes=(u.notes??[]).filter(x=>x.id!==n.id);})}>
    <Trash2 size={16}/>
   </ConfirmButton>
  </>}
 />;

 /** The quick entry under a unit's assessments: name it, date it, weight it, done. */
 const entryForm=(unitName:string,key:string)=><form className="assess-entry" onSubmit={e=>{e.preventDefault();addAssessment(unitName,key);}}>
  <div className="field">
   <label className="sr-only" htmlFor={`new-${key}`}>Assessment for {unitName}</label>
   <input id={`new-${key}`} value={draftFor(key).title} onChange={e=>setDraft(key,{title:e.target.value})}
    placeholder="Add an assessment" maxLength={200}/>
  </div>
  <label className="sr-only" htmlFor={`due-${key}`}>Due date</label>
  <input id={`due-${key}`} type="date" value={draftFor(key).date} onChange={e=>setDraft(key,{date:e.target.value})}/>
  <label className="sr-only" htmlFor={`weight-${key}`}>Weight</label>
  <input id={`weight-${key}`} className="weight-input" value={draftFor(key).weight} onChange={e=>setDraft(key,{weight:e.target.value})}
   placeholder="30%" maxLength={20}/>
  <button type="submit" className="btn btn-primary btn-sm" disabled={busy||!draftFor(key).title.trim()}><Plus size={16}/>Add</button>
 </form>;

 return <div className="stack">
  <PageHead title="Assignments" sub={nextUp?`Next due ${new Date(nextUp.date+'T12:00:00Z').toLocaleDateString('en-AU',{day:'numeric',month:'short',timeZone:'UTC'})}`:'Nothing outstanding'} back={()=>go('dashboard')}/>

  <div className="stats">
   <Stat label="Units" value={units.length} note="this semester"/>
   <Stat label="Outstanding" value={pending.length} note="still to do"/>
   <Stat label="Submitted" value={state.assignments.filter(a=>a.status==='submitted').length} note="handed in"/>
   <Stat label="Timetabled" value={classes.length} note="classes a week"/>
  </div>

  <div className="split">
   <div className="main">
    {units.length===0&&<Card><Empty>No units yet. Add one below to start listing assessments.</Empty></Card>}

    {units.map(unit=>{
     const mine=state.assignments.filter(a=>a.unit===unit.name).sort((a,b)=>a.date.localeCompare(b.date));
     const outstanding=mine.filter(a=>!done(a.status)).length;
     const unitNotes=unit.notes??[];
     return <Card key={unit.id} tone="lift"
      title={unit.name}
      action={<div className="row">
       <span className="tiny">{outstanding?`${outstanding} outstanding`:'All clear'}</span>
       <ConfirmButton label={`Delete unit ${unit.name}`} confirmLabel="Delete unit" disabled={busy}
        onConfirm={()=>change(`Deleted unit: ${unit.name}`,s=>{s.units=(s.units??[]).filter(u=>u.id!==unit.id);})}>
        <Trash2 size={16}/>
       </ConfirmButton>
      </div>}>

      <div className="eyebrow unit-label">Assessments</div>
      {mine.length===0
       ? <Empty>Nothing listed for this unit yet.</Empty>
       : <Timeline lead={46}>{mine.map(assessmentRow)}</Timeline>}
      {entryForm(unit.name,unit.id)}

      <div className="eyebrow unit-label">Notes</div>
      <form className="composer" onSubmit={e=>{e.preventDefault();addNote(unit);}}>
       <label className="sr-only" htmlFor={`note-${unit.id}`}>Note for {unit.name}</label>
       <textarea id={`note-${unit.id}`} value={notes[unit.id]??''} rows={2} maxLength={4000}
        placeholder="Readings, marking criteria, what the tutor said"
        onChange={e=>setNotes(all=>({...all,[unit.id]:e.target.value}))}
        onKeyDown={e=>{
         if(e.key!=='Enter'||e.shiftKey)return;
         e.preventDefault();
         addNote(unit);
        }}/>
       <div className="composer-foot">
        <span className="entry-hint">Enter saves it. Shift + Enter starts a new line.</span>
        <button type="submit" className="btn btn-primary btn-sm" disabled={busy||!notes[unit.id]?.trim()}><Plus size={16}/>Add note</button>
       </div>
      </form>
      {unitNotes.length===0
       ? <Empty>No notes on this unit yet.</Empty>
       : <Timeline lead={62}>{[...unitNotes].sort((a,b)=>Number(!!b.pinned)-Number(!!a.pinned)).map(n=>noteRow(unit,n))}</Timeline>}
     </Card>;
    })}

    {loose.length>0&&<Card title="Not in a unit" action={<span className="tiny">Assessments whose unit no longer exists</span>}>
     <Timeline lead={46}>{[...loose].sort((a,b)=>a.date.localeCompare(b.date)).map(assessmentRow)}</Timeline>
    </Card>}

    <Card title="Add a unit">
     <form className="entry" onSubmit={e=>{
      e.preventDefault();
      const name=unitDraft.trim();
      if(!name)return;
      if(units.some(u=>u.name.toLowerCase()===name.toLowerCase())){notify('You already have a unit with that name.','error');return;}
      change(`Added unit: ${name}`,s=>{s.units=[...(s.units??[]),{id:crypto.randomUUID(),name,notes:[]}];});
      setUnitDraft('');
     }}>
      <label className="sr-only" htmlFor="new-unit">Unit</label>
      <input id="new-unit" value={unitDraft} onChange={e=>setUnitDraft(e.target.value)} placeholder="Unit code and name" maxLength={160}/>
      <button type="submit" className="btn btn-primary btn-sm" disabled={busy||!unitDraft.trim()}><Plus size={16}/>Add unit</button>
     </form>
     <p className="entry-hint">Prep tasks appear on your to-do list seven and three days before each due date.</p>
    </Card>
   </div>

   <div className="rail">
    <Card eyebrow="Weekly timetable">
     {classes.length===0?<Empty>No classes recorded.</Empty>:<Timeline lead={54}>
      {[...classes].sort((a,b)=>weekdays.indexOf(a.day)-weekdays.indexOf(b.day)||a.start.localeCompare(b.start)).map((c,i)=>
       <TimelineRow
        key={`${c.day}-${c.start}-${c.unit}-${i}`}
        lead={<><strong>{c.day}</strong><br/>{c.start}</>}
        marker={<Dot size={11}/>}
        title={c.unit}
        meta={<>{c.kind} &middot; {c.start}&ndash;{c.end}{c.location?` · ${c.location}`:''}</>}
        trailing={<ConfirmButton label={`Delete ${c.unit} on ${c.day}`} confirmLabel="Delete" disabled={busy}
         onConfirm={()=>change(`Removed a timetable entry: ${c.unit} ${c.day}`,s=>{
          s.classes=(s.classes??[]).filter(x=>!(x.day===c.day&&x.start===c.start&&x.unit===c.unit));
         })}>
         <Trash2 size={15}/>
        </ConfirmButton>}
       />)}
     </Timeline>}

     <form className="stack" style={{gap:10,marginTop:16,paddingTop:14,borderTop:'1px solid var(--line)'}} onSubmit={e=>{
      e.preventDefault();
      const unit=entry.unit.trim();
      if(!unit){notify('Name the unit for this class.','error');return;}
      change(`Added a timetable entry: ${unit} ${entry.day}`,s=>{
       s.classes=[...(s.classes??[]),{day:entry.day,start:entry.start,end:entry.end,unit,kind:entry.kind.trim()||'Class',location:entry.location.trim(),note:''}];
      });
      setEntry({...entry,unit:'',location:''});
     }}>
      <div className="field">
       <label htmlFor="c-unit">Add a class</label>
       <input id="c-unit" list="unit-names" value={entry.unit} onChange={e=>setEntry({...entry,unit:e.target.value})} placeholder="Unit name" maxLength={160}/>
       <datalist id="unit-names">{units.map(u=><option key={u.id} value={u.name}/>)}</datalist>
      </div>
      <div className="row row-wrap">
       <label className="sr-only" htmlFor="c-day">Day</label>
       <select id="c-day" value={entry.day} onChange={e=>setEntry({...entry,day:e.target.value})}>
        {[1,2,3,4,5,6,0].map(d=><option key={d} value={weekdays[d]}>{weekdays[d]}</option>)}
       </select>
       <label className="sr-only" htmlFor="c-start">Start</label>
       <input id="c-start" type="time" value={entry.start} onChange={e=>setEntry({...entry,start:e.target.value})}/>
       <label className="sr-only" htmlFor="c-end">End</label>
       <input id="c-end" type="time" value={entry.end} onChange={e=>setEntry({...entry,end:e.target.value})}/>
      </div>
      <div className="row row-wrap">
       <label className="sr-only" htmlFor="c-kind">Kind</label>
       <input id="c-kind" value={entry.kind} onChange={e=>setEntry({...entry,kind:e.target.value})} placeholder="Lecture" maxLength={40}/>
       <label className="sr-only" htmlFor="c-where">Location</label>
       <input id="c-where" value={entry.location} onChange={e=>setEntry({...entry,location:e.target.value})} placeholder="Room" maxLength={80}/>
      </div>
      <button type="submit" className="btn" disabled={busy||!entry.unit.trim()}><Plus size={16}/>Add class</button>
     </form>
    </Card>
   </div>
  </div>
 </div>;
}
