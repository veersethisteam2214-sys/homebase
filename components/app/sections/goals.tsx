'use client';
import {useState} from 'react';
import {Check,Plus,Trash2} from 'lucide-react';
import {capitalise} from '../../../lib/planner';
import type {SectionProps} from '../types';
import {Bar,Card,ConfirmButton,Empty,PageHead,Stat,Timeline,TimelineRow} from '../ui';

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
   <form className="entry" onSubmit={e=>{
    e.preventDefault();
    const title=capitalise(draft);
    if(!title)return;
    if(goals.some(g=>g.title.toLowerCase()===title.toLowerCase())){notify('You already have a goal with that name.','error');return;}
    change(`Added goal: ${title}`,s=>{s.goals.push({id:crypto.randomUUID(),title,progress:0});});
    setDraft('');
   }}>
    <label className="sr-only" htmlFor="new-goal">Goal</label>
    <input id="new-goal" value={draft} onChange={e=>setDraft(e.target.value)} placeholder="What do you want to be true by the end of this term?" maxLength={200}/>
    <button type="submit" className="btn btn-primary btn-sm" disabled={busy||!draft.trim()}><Plus size={16}/>Add goal</button>
   </form>
  </Card>

  <Card tone="lift" title="What this period is for" action={<span className="tiny">Drag a bar to move a goal along</span>}>
   {goals.length===0
    ? <Empty>No goals yet. Add the handful of things this period is actually for.</Empty>
    : <Timeline lead={48}>
      {goals.map(goal=><TimelineRow
       key={goal.id}
       tone={goal.progress>=100?'done':goal.progress>0?'active':'plain'}
       lead={`${goal.progress}%`}
       marker={goal.progress>=100?<Check size={12}/>:null}
       title={<>
        <label className="sr-only" htmlFor={`goal-${goal.id}`}>Goal name</label>
        <input id={`goal-${goal.id}`} className="tl-edit" defaultValue={goal.title} maxLength={200} disabled={busy}
         onBlur={e=>{
          const title=capitalise(e.target.value);
          if(!title){e.target.value=goal.title;return;}
          if(title===goal.title){e.target.value=title;return;}
          change(`Renamed goal to ${title}`,s=>{const target=s.goals.find(g=>g.id===goal.id);if(target)target.title=title;});
         }}
         onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();}}/>
       </>}
       meta={<span className="goal-track">
        <Bar value={goal.progress}/>
        <label className="sr-only" htmlFor={`range-${goal.id}`}>Progress for {goal.title}</label>
        <input id={`range-${goal.id}`} type="range" min={0} max={100} step={5} value={goal.progress} disabled={busy}
         onChange={e=>setProgress(goal.id,Number(e.target.value))}/>
       </span>}
       trailing={<>
        {goal.progress<100&&<button type="button" className="btn btn-sm btn-soft" disabled={busy}
         onClick={()=>change(`Completed goal: ${goal.title}`,s=>{const target=s.goals.find(g=>g.id===goal.id);if(target)target.progress=100;})}>
         <Check size={14}/>Done
        </button>}
        <ConfirmButton label={`Delete goal ${goal.title}`} confirmLabel="Delete" disabled={busy}
         onConfirm={()=>change(`Deleted goal: ${goal.title}`,s=>{s.goals=s.goals.filter(g=>g.id!==goal.id);})}>
         <Trash2 size={16}/>
        </ConfirmButton>
       </>}
      />)}
     </Timeline>}
  </Card>
 </div>;
}
