'use client';
import {useState} from 'react';
import {ArrowRight,Dot,Pin,PinOff,Plus,Trash2} from 'lucide-react';
import {capitalise,tasksFor,weekdays,type Project,type ProjectNote} from '../../../lib/planner';
import type {SectionProps} from '../types';
import {Card,ConfirmButton,Empty,PageHead,Stat,Switch,Timeline,TimelineRow} from '../ui';

const dayOrder=[1,2,3,4,5,6,0];

/** Notes sit on a timeline, so the gutter carries when it was written, over two lines. */
const when=(iso:string)=>{
 const at=new Date(iso);
 return <>
  {at.toLocaleDateString('en-AU',{day:'numeric',month:'short'})}
  <br/>
  {at.toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit',hour12:false})}
 </>;
};

function ProjectDetail({project,busy,change,onBack}:{project:Project;onBack:()=>void}&Pick<SectionProps,'busy'|'change'>){
 const [note,setNote]=useState('');
 const notes=project.notes??[];
 const pinned=notes.filter(n=>n.pinned);
 const rest=notes.filter(n=>!n.pinned);
 const edit=(label:string,mutate:(p:Project)=>void)=>change(label,s=>{
  const target=s.projects.find(p=>p.id===project.id);
  if(target)mutate(target);
 });

 const addNote=()=>{
  const text=note.trim();
  if(!text)return;
  edit(`Added a note to ${project.title}`,p=>{
   p.notes=[{id:crypto.randomUUID(),text,at:new Date().toISOString()},...(p.notes??[])];
  });
  setNote('');
 };

 const noteRow=(n:ProjectNote)=><TimelineRow
  key={n.id}
  tone={n.pinned?'active':'plain'}
  lead={when(n.at)}
  marker={n.pinned?<Pin size={11}/>:null}
  title={<span className="tl-note">{n.text}</span>}
  trailing={<>
   <button type="button" className="btn-icon" aria-label={n.pinned?'Unpin note':'Pin as important'} disabled={busy}
    style={n.pinned?{color:'var(--accent)'}:undefined}
    onClick={()=>edit(n.pinned?'Unpinned a project note':'Pinned a project note',p=>{
     const target=p.notes?.find(x=>x.id===n.id);
     if(target)target.pinned=!target.pinned;
    })}>
    {n.pinned?<PinOff size={16}/>:<Pin size={16}/>}
   </button>
   <ConfirmButton label="Delete note" confirmLabel="Delete" disabled={busy}
    onConfirm={()=>edit('Deleted a project note',p=>{p.notes=(p.notes??[]).filter(x=>x.id!==n.id);})}>
    <Trash2 size={16}/>
   </ConfirmButton>
  </>}
 />;

 return <div className="stack">
  <PageHead title={project.title} sub={project.active?'Active':'Paused'} back={onBack}>
   <div className="row">
    <span className="tiny">{project.active?'Active':'Paused'}</span>
    <Switch checked={project.active} label={`${project.title} active`} disabled={busy}
     onChange={()=>edit(`${project.active?'Paused':'Resumed'} project: ${project.title}`,p=>{p.active=!p.active;})}/>
   </div>
  </PageHead>

  <div className="split">
   <div className="main">
    <Card tone="lift" title="Important" action={<span className="tiny">{pinned.length} pinned</span>}>
     {pinned.length===0?<Empty>Pin a note below to keep it at the top here.</Empty>:<Timeline lead={62}>{pinned.map(noteRow)}</Timeline>}
    </Card>

    <Card title="Notes">
     <form className="composer" onSubmit={e=>{e.preventDefault();addNote();}}>
      <label className="sr-only" htmlFor="project-note">New note</label>
      <textarea id="project-note" value={note} onChange={e=>setNote(e.target.value)} rows={3} maxLength={4000}
       placeholder="Where this is up to, what is blocking it, what to do next"
       onKeyDown={e=>{
        if(e.key!=='Enter'||e.shiftKey)return;
        e.preventDefault();
        addNote();
       }}/>
      <div className="composer-foot">
       <span className="entry-hint">Enter saves it. Shift + Enter starts a new line.</span>
       <button type="submit" className="btn btn-primary btn-sm" disabled={busy||!note.trim()}><Plus size={16}/>Add note</button>
      </div>
     </form>
     {rest.length===0?<Empty>No notes yet.</Empty>:<Timeline lead={62}>{rest.map(noteRow)}</Timeline>}
    </Card>
   </div>

   <div className="rail">
    <Card eyebrow="Summary">
     <label className="sr-only" htmlFor="project-summary">Project summary</label>
     <textarea id="project-summary" rows={4} defaultValue={project.summary??''} maxLength={2000}
      placeholder="What this project is, in a sentence or two"
      onBlur={e=>{
       const value=e.target.value;
       if((project.summary??'')===value)return;
       edit('',p=>{p.summary=value.trim()||undefined;});
      }}/>
     <p className="tiny" style={{marginTop:6}}>Saved when you click away.</p>
    </Card>

    <Card eyebrow="Recurring action">
     <div className="field">
      <label htmlFor="project-action">Task added on scheduled days</label>
      <input id="project-action" defaultValue={project.action} maxLength={200} placeholder="Edit two clips"
       onBlur={e=>{
        const value=e.target.value.trim();
        if(!value||value===project.action){e.target.value=project.action;return;}
        edit(`Changed the recurring action for ${project.title}`,p=>{p.action=value;});
       }}/>
     </div>
     <div className="field" style={{marginTop:14}}>
      <span>Days it runs</span>
      <div className="daypick">
       {dayOrder.map(day=><button key={day} type="button" aria-pressed={project.days.includes(day)} disabled={busy}
        onClick={()=>edit('',p=>{p.days=p.days.includes(day)?p.days.filter(d=>d!==day):[...p.days,day];})}>
        {weekdays[day]}
       </button>)}
      </div>
     </div>
     <p className="tiny" style={{marginTop:10}}>Changes affect future days. Days already planned keep the list they had.</p>
    </Card>
   </div>
  </div>
 </div>;
}

export default function ProjectsSection(props:SectionProps){
 const {state,today,busy,change,go,notify}=props;
 const [openId,setOpenId]=useState<string|null>(null);
 const [draft,setDraft]=useState('');

 const open=openId?state.projects.find(p=>p.id===openId):null;
 if(open)return <ProjectDetail project={open} busy={busy} change={change} onBack={()=>setOpenId(null)}/>;

 const tasks=tasksFor(state,today);
 const active=state.projects.filter(p=>p.active);

 return <div className="stack">
  <PageHead title="Projects" sub={`${active.length} active of ${state.projects.length}`} back={()=>go('dashboard')}/>

  <div className="stats">
   <Stat label="Active" value={active.length} note="running on a schedule"/>
   <Stat label="Paused" value={state.projects.length-active.length} note="kept, not scheduled"/>
   <Stat label="On today" value={tasks.filter(t=>t.source==='Project schedule').length} note="tasks from projects"/>
  </div>

  <Card title="Add a project">
   <form className="entry" onSubmit={e=>{
    e.preventDefault();
    const title=capitalise(draft);
    if(!title)return;
    if(state.projects.some(p=>p.title.toLowerCase()===title.toLowerCase())){notify('You already have a project with that name.','error');return;}
    const id=crypto.randomUUID();
    change(`Added project: ${title}`,s=>{s.projects.push({id,title,action:`Work on ${title}`,days:[],active:true,notes:[]});});
    setDraft('');
    setOpenId(id);
   }}>
    <label className="sr-only" htmlFor="new-project">Project name</label>
    <input id="new-project" value={draft} onChange={e=>setDraft(e.target.value)} placeholder="What are you building?" maxLength={160}/>
    <button type="submit" className="btn btn-primary btn-sm" disabled={busy||!draft.trim()}><Plus size={16}/>Add project</button>
   </form>
  </Card>

  <Card tone="lift" title="Everything you are building" action={<span className="tiny">Open one to write notes on it</span>}>
   {state.projects.length===0
    ? <Empty>No projects yet. Add the things you are actually building.</Empty>
    : <Timeline lead={34}>
      {state.projects.map((project,index)=>{
       const notes=project.notes??[];
       const pinned=notes.filter(n=>n.pinned).length;
       const days=project.days.length?dayOrder.filter(d=>project.days.includes(d)).map(d=>weekdays[d]).join(' '):'No days set';
       return <TimelineRow
        key={project.id}
        tone={project.active?'active':'plain'}
        lead={String(index+1).padStart(2,'0')}
        marker={project.active?<Dot size={11}/>:null}
        title={project.title}
        meta={<>{project.action||'No recurring action'} &middot; {days} &middot; {notes.length===1?'1 note':`${notes.length} notes`}{pinned?` · ${pinned} pinned`:''}</>}
        trailing={<>
         {!project.active&&<span className="chip">Paused</span>}
         <ArrowRight size={16} style={{color:'var(--ink-mute)'}}/>
        </>}
        openLabel={`Open ${project.title}`}
        onOpen={()=>setOpenId(project.id)}
       />;
      })}
     </Timeline>}
  </Card>
 </div>;
}
