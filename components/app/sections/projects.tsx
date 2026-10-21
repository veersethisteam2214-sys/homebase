'use client';
import {useState} from 'react';
import {ArrowRight,Pin,PinOff,Plus,Trash2} from 'lucide-react';
import {capitalise,tasksFor,weekdays,type Project} from '../../../lib/planner';
import type {SectionProps} from '../types';
import {Card,ConfirmButton,Empty,PageHead,Stat,Switch} from '../ui';

const dayOrder=[1,2,3,4,5,6,0];
const stamp=(iso:string)=>new Date(iso).toLocaleString('en-AU',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});

function ProjectDetail({project,busy,change,onBack}:{project:Project;onBack:()=>void}&Pick<SectionProps,'busy'|'change'>){
 const [note,setNote]=useState('');
 const notes=project.notes??[];
 const pinned=notes.filter(n=>n.pinned);
 const rest=notes.filter(n=>!n.pinned);
 const edit=(label:string,mutate:(p:Project)=>void)=>change(label,s=>{
  const target=s.projects.find(p=>p.id===project.id);
  if(target)mutate(target);
 });

 const noteRow=(n:{id:string;text:string;at:string;pinned?:boolean})=><div key={n.id} className="list-row" style={{alignItems:'flex-start'}}>
  <span className="grow" style={{whiteSpace:'pre-wrap'}}>{n.text}<br/><span className="tiny">{stamp(n.at)}</span></span>
  <div className="row-actions" style={{opacity:1}}>
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
  </div>
 </div>;

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
     {pinned.length===0?<Empty>Pin a note below to keep it at the top here.</Empty>:<div className="list">{pinned.map(noteRow)}</div>}
    </Card>

    <Card title="Notes">
     <form className="stack" style={{gap:10,marginBottom:14}} onSubmit={e=>{
      e.preventDefault();
      const text=note.trim();
      if(!text)return;
      edit(`Added a note to ${project.title}`,p=>{
       p.notes=[{id:crypto.randomUUID(),text,at:new Date().toISOString()},...(p.notes??[])];
      });
      setNote('');
     }}>
      <label className="sr-only" htmlFor="project-note">New note</label>
      <textarea id="project-note" value={note} onChange={e=>setNote(e.target.value)} rows={3} maxLength={4000}
       placeholder="Where this is up to, what is blocking it, what to do next"/>
      <button type="submit" className="btn btn-primary" style={{alignSelf:'flex-start'}} disabled={busy||!note.trim()}><Plus size={17}/>Add note</button>
     </form>
     {rest.length===0?<Empty>No notes yet.</Empty>:<div className="list">{rest.map(noteRow)}</div>}
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

  {state.projects.length===0
   ? <Card><Empty>No projects yet. Add the things you are actually building.</Empty></Card>
   : <div className="sections">
     {state.projects.map(project=>{
      const notes=project.notes??[];
      return <button key={project.id} type="button" className="section-card" onClick={()=>setOpenId(project.id)}>
       <div className="section-card-top">
        <h2>{project.title}</h2>
        <span className={project.active?'chip chip-accent':'chip'}>{project.active?'Active':'Paused'}</span>
       </div>
       {project.summary&&<p className="tiny" style={{lineHeight:1.5}}>{project.summary}</p>}
       <ul className="section-lines">
        <li><span>Recurring action</span><b style={{textAlign:'right'}}>{project.action||'—'}</b></li>
        <li><span>Days</span><b>{project.days.length?dayOrder.filter(d=>project.days.includes(d)).map(d=>weekdays[d]).join(', '):'None'}</b></li>
        <li><span>Notes</span><b>{notes.length}{notes.some(n=>n.pinned)?` · ${notes.filter(n=>n.pinned).length} pinned`:''}</b></li>
       </ul>
       <span className="section-foot">Open project <ArrowRight size={15}/></span>
      </button>;
     })}
    </div>}
 </div>;
}
