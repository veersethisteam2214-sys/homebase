'use client';
import {useState} from 'react';
import {Check,Plus,Trash2} from 'lucide-react';
import type {SectionProps} from '../types';
import {Bar,Card,ConfirmButton,Empty,PageHead,Stat} from '../ui';

export default function GoalsSection({state,busy,change,go,notify}:SectionProps){
 const [draft,setDraft]=useState('');
 const goals=state.goals;
 const complete=goals.filter(g=>g.progress>=100).length;
 const average=goals.length?Math.round(goals.reduce((sum,g)=>sum+(g.progress||0),0)/goals.length):0;

 const setProgress=(id:string,value:number)=>{
  const clamped=Math.min(100,Math.max(0,Math.round(value)));
  change('',s=>{const goal=s.goals.find(g=>g.id===id);if(goal)goal.progress=clamped;});
 };

 return <div className="stack">
  <PageHead title="Goals" sub={goals.length?`${complete} of ${goals.length} complete`:'Nothing set yet'} back={()=>go('dashboard')}/>

  <div className="stats">
   <Stat label="Goals" value={goals.length} note="in play"/>
   <Stat label="Average progress" value={`${average}%`} note="across all goals"/>
   <Stat label="Complete" value={complete} note="at 100%"/>
  </div>

  <Card title="Add a goal">
   <form className="row" onSubmit={e=>{
    e.preventDefault();
    const title=draft.trim();
    if(!title)return;
    if(goals.some(g=>g.title.toLowerCase()===title.toLowerCase())){notify('You already have a goal with that name.','error');return;}
    change(`Added goal: ${title}`,s=>{s.goals.push({id:crypto.randomUUID(),title,progress:0});});
    setDraft('');
   }}>
    <label className="sr-only" htmlFor="new-goal">Goal</label>
    <input id="new-goal" value={draft} onChange={e=>setDraft(e.target.value)} placeholder="What do you want to be true by the end of this term" maxLength={200}/>
    <button type="submit" className="btn btn-primary" disabled={busy||!draft.trim()}><Plus size={17}/>Add goal</button>
   </form>
  </Card>

  {goals.length===0
   ? <Card><Empty>No goals yet. Add the handful of things this period is actually for.</Empty></Card>
   : <div className="sections">
     {goals.map(goal=><section key={goal.id} className={goal.progress>=100?'card card-accent':'card'}>
      <div className="card-head">
       <div style={{minWidth:0,flex:'1 1 auto'}}>
        <label className="sr-only" htmlFor={`goal-${goal.id}`}>Goal name</label>
        <input id={`goal-${goal.id}`} defaultValue={goal.title} maxLength={200} disabled={busy}
         style={{background:'transparent',border:0,padding:0,minHeight:0,fontSize:16,fontWeight:600,letterSpacing:'-.01em'}}
         onBlur={e=>{
          const title=e.target.value.trim();
          if(!title){e.target.value=goal.title;return;}
          if(title===goal.title)return;
          change(`Renamed goal to ${title}`,s=>{const target=s.goals.find(g=>g.id===goal.id);if(target)target.title=title;});
         }}/>
       </div>
       <ConfirmButton label={`Delete goal ${goal.title}`} confirmLabel="Delete" disabled={busy}
        onConfirm={()=>change(`Deleted goal: ${goal.title}`,s=>{s.goals=s.goals.filter(g=>g.id!==goal.id);})}>
        <Trash2 size={16}/>
       </ConfirmButton>
      </div>

      <div className="spread" style={{marginBottom:8}}>
       <span className="tiny">Progress</span>
       <strong className="num" style={{fontSize:20,letterSpacing:'-.02em'}}>{goal.progress}%</strong>
      </div>
      <Bar value={goal.progress}/>

      <div className="row" style={{marginTop:14,gap:12}}>
       <label className="sr-only" htmlFor={`range-${goal.id}`}>Progress for {goal.title}</label>
       <input id={`range-${goal.id}`} type="range" min={0} max={100} step={5} value={goal.progress} disabled={busy}
        style={{flex:'1 1 auto'}} onChange={e=>setProgress(goal.id,Number(e.target.value))}/>
       {goal.progress<100&&<button type="button" className="btn btn-sm btn-soft" disabled={busy} onClick={()=>{
        change(`Completed goal: ${goal.title}`,s=>{const target=s.goals.find(g=>g.id===goal.id);if(target)target.progress=100;});
       }}><Check size={15}/>Done</button>}
      </div>
     </section>)}
    </div>}
 </div>;
}
