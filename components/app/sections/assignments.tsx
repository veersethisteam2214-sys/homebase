'use client';
import {useState} from 'react';
import {Check,Dot,Plus,Trash2} from 'lucide-react';
import {weekdays} from '../../../lib/planner';
import type {SectionProps} from '../types';
import {Card,ConfirmButton,Empty,PageHead,Stat,Timeline,TimelineRow} from '../ui';

const statuses=[{value:'',label:'Outstanding'},{value:'submitted',label:'Submitted'},{value:'graded',label:'Graded'}];
const longDate=(date:string)=>new Date(date+'T12:00:00Z').toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});

/** The gutter of a due date: the day over the month, so the column scans vertically. */
const dayAndMonth=(date:string)=>{
 const at=new Date(date+'T12:00:00Z');
 return <>
  <strong>{at.toLocaleDateString('en-AU',{day:'numeric',timeZone:'UTC'})}</strong>
  <br/>
  {at.toLocaleDateString('en-AU',{month:'short',timeZone:'UTC'})}
 </>;
};

const daysBetween=(from:string,to:string)=>Math.round((Date.parse(`${to}T12:00:00Z`)-Date.parse(`${from}T12:00:00Z`))/86400000);

const dueWord=(days:number)=>{
 if(days<0)return `${Math.abs(days)} day${Math.abs(days)===1?'':'s'} overdue`;
 if(days===0)return 'Due today';
 if(days===1)return 'Due tomorrow';
 return `Due in ${days} days`;
};

export default function AssignmentsSection({state,today,busy,change,go,notify}:SectionProps){
 const [draft,setDraft]=useState({unit:'',title:'',date:'',weight:'',format:''});
 const [entry,setEntry]=useState({day:'Mon',start:'09:00',end:'10:00',unit:'',kind:'Lecture',location:''});

 const pending=state.assignments.filter(a=>!['submitted','graded'].includes(a.status));
 const sorted=[...state.assignments].sort((a,b)=>a.date.localeCompare(b.date));
 const classes=state.classes??[];
 const nextUp=[...pending].sort((a,b)=>a.date.localeCompare(b.date))[0];

 return <div className="stack">
  <PageHead title="Assignments" sub={nextUp?`Next due ${longDate(nextUp.date)}`:'Nothing outstanding'} back={()=>go('dashboard')}/>

  <div className="stats">
   <Stat label="Outstanding" value={pending.length} note="still to do"/>
   <Stat label="Submitted" value={state.assignments.filter(a=>a.status==='submitted').length} note="handed in"/>
   <Stat label="Graded" value={state.assignments.filter(a=>a.status==='graded').length} note="marked"/>
   <Stat label="Timetabled" value={classes.length} note="classes a week"/>
  </div>

  <Card tone="lift" title="Every assessment" action={<span className="tiny">Prep tasks appear seven and three days before each due date</span>}>
   {sorted.length===0?<Empty>Nothing recorded yet.</Empty>:<Timeline lead={46}>
    {sorted.map(a=>{
     const done=['submitted','graded'].includes(a.status);
     const away=daysBetween(today,a.date);
     const overdue=!done&&away<0;
     return <TimelineRow
      key={a.id}
      tone={done?'done':overdue?'warn':away<=7?'active':'plain'}
      lead={dayAndMonth(a.date)}
      marker={done?<Check size={12}/>:null}
      title={a.title}
      meta={<>
       {a.unit}
       {a.weight?` · ${a.weight}`:''}
       {a.format?` · ${a.format}`:''}
       {' · '}
       {done?statuses.find(s=>s.value===a.status)?.label:dueWord(away)}
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
    })}
   </Timeline>}
  </Card>

  <div className="split">
   <div className="main">
    <Card title="Add an assessment">
     <form className="stack" style={{gap:12}} onSubmit={e=>{
      e.preventDefault();
      const title=draft.title.trim(),unit=draft.unit.trim();
      if(!title||!unit){notify('A unit and a title are both needed.','error');return;}
      if(!/^\d{4}-\d{2}-\d{2}$/.test(draft.date)){notify('Pick a due date.','error');return;}
      change(`Added assessment: ${title}`,s=>{
       s.assignments.push({id:crypto.randomUUID(),date:draft.date,unit,title,weight:draft.weight.trim(),format:draft.format.trim(),notes:'',status:''});
      });
      setDraft({unit:'',title:'',date:'',weight:'',format:''});
     }}>
      <div className="field-row">
       <div className="field"><label htmlFor="a-unit">Unit</label><input id="a-unit" value={draft.unit} onChange={e=>setDraft({...draft,unit:e.target.value})} placeholder="Business ethics" maxLength={120}/></div>
       <div className="field"><label htmlFor="a-title">Assessment</label><input id="a-title" value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} placeholder="Final report" maxLength={200}/></div>
      </div>
      <div className="field-row">
       <div className="field"><label htmlFor="a-date">Due</label><input id="a-date" type="date" value={draft.date} onChange={e=>setDraft({...draft,date:e.target.value})}/></div>
       <div className="field"><label htmlFor="a-weight">Weight</label><input id="a-weight" value={draft.weight} onChange={e=>setDraft({...draft,weight:e.target.value})} placeholder="30%" maxLength={20}/></div>
       <div className="field"><label htmlFor="a-format">Format</label><input id="a-format" value={draft.format} onChange={e=>setDraft({...draft,format:e.target.value})} placeholder="Report" maxLength={60}/></div>
      </div>
      <button type="submit" className="btn btn-primary" style={{alignSelf:'flex-start'}} disabled={busy}><Plus size={17}/>Add assessment</button>
     </form>
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
      <div className="field"><label htmlFor="c-unit">Add a class</label><input id="c-unit" value={entry.unit} onChange={e=>setEntry({...entry,unit:e.target.value})} placeholder="Unit name" maxLength={120}/></div>
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
