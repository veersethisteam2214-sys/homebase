import {tasksFor,type State,type Task} from './planner';
import {elapsed} from './life';
import {minutesUntil} from './clock';
import {sessionFor,sessionsThisWeek} from './gym';

/**
 * Answers questions about the planner by reading it. This is pattern matching over the
 * real state rather than a language model: it runs offline, costs nothing, and can only
 * ever tell you something that is actually in your data.
 */

const bullet=(lines:string[])=>lines.map(l=>`· ${l}`).join('\n');
const plural=(n:number,one:string,many=one+'s')=>`${n} ${n===1?one:many}`;
const shortDate=(date:string)=>new Date(date+'T12:00:00Z').toLocaleDateString('en-AU',{day:'numeric',month:'short',timeZone:'UTC'});

function label(task:Task){return task.source?`${task.title} (${task.source.toLowerCase()})`:task.title;}

function tasksAnswer(state:State,today:string){
 const all=tasksFor(state,today);
 const open=all.filter(t=>!t.done);
 if(!all.length)return 'Nothing on your list today. Open the to-do list and add what matters.';
 if(!open.length)return `All ${plural(all.length,'task')} done today. Nothing left.`;
 const critical=open.filter(t=>t.important);
 const rest=open.filter(t=>!t.important);
 const parts=[`${plural(open.length,'task')} left of ${all.length}.`];
 if(critical.length)parts.push('Critical first:\n'+bullet(critical.map(label)));
 if(rest.length)parts.push((critical.length?'Then:':'Left to do:')+'\n'+bullet(rest.slice(0,8).map(label))+(rest.length>8?`\n· and ${rest.length-8} more`:''));
 return parts.join('\n\n');
}

function criticalAnswer(state:State,today:string){
 const critical=tasksFor(state,today).filter(t=>t.important);
 if(!critical.length)return 'Nothing marked critical today. Star up to three things on your list and they show on the dashboard.';
 const open=critical.filter(t=>!t.done);
 if(!open.length)return `All ${plural(critical.length,'critical task')} done. That was the hard part.`;
 return `${plural(open.length,'critical task')} left:\n`+bullet(open.map(t=>t.title));
}

function routineAnswer(state:State,today:string){
 const steps=state.routine;
 if(!steps.length)return 'No morning routine set up yet. Open Morning routine and add your steps.';
 const checked=state.checks[today]??[];
 const left=steps.filter(s=>!checked.includes(s.id));
 if(!left.length)return `Morning routine complete, all ${steps.length} steps.`;
 return `${checked.length} of ${steps.length} done. Still to do:\n`+bullet(left.slice(0,8).map(s=>s.title))+(left.length>8?`\n· and ${left.length-8} more`:'');
}

function gymAnswer(state:State,today:string){
 const gym=state.gym;
 if(!gym||!gym.sessions.length)return 'No training split set up yet. Open Gym to add your sessions.';
 const session=sessionFor(gym,today);
 const count=sessionsThisWeek(gym,today);
 if(!session)return `Rest day today. ${count} of ${gym.weeklyGoal} sessions done this week.`;
 const entry=gym.log.find(e=>e.date===today);
 const ticked=entry?.done.length??0;
 const head=`${session.name} today, ${count} of ${gym.weeklyGoal} this week.`;
 if(!session.exercises.length)return head+' No exercises on it yet.';
 if(ticked>=session.exercises.length)return head+' Session finished.';
 const left=session.exercises.filter(e=>!entry?.done.includes(e.id));
 return head+`\n${plural(left.length,'exercise')} left:\n`+bullet(left.map(e=>`${e.name} ${e.sets}×${e.reps}`));
}

function assignmentsAnswer(state:State,today:string){
 const pending=state.assignments.filter(a=>!['submitted','graded'].includes(a.status));
 if(!state.assignments.length)return 'No assessments recorded. Open Assignments to add them.';
 if(!pending.length)return 'Nothing outstanding. Everything is submitted or graded.';
 const sorted=[...pending].sort((a,b)=>a.date.localeCompare(b.date));
 const overdue=sorted.filter(a=>a.date<today);
 const lines=sorted.slice(0,6).map(a=>`${a.title} — ${a.unit}, ${a.date<today?'overdue':a.date===today?'due today':`due ${shortDate(a.date)}`}${a.weight?`, ${a.weight}`:''}`);
 return `${plural(pending.length,'assessment')} outstanding${overdue.length?`, ${overdue.length} overdue`:''}:\n`+bullet(lines);
}

function projectsAnswer(state:State,today:string){
 if(!state.projects.length)return 'No projects yet. Open Projects to add what you are building.';
 const active=state.projects.filter(p=>p.active);
 const todayTasks=tasksFor(state,today).filter(t=>t.source==='Project schedule'&&!t.done);
 const lines=active.slice(0,8).map(p=>`${p.title}${p.action?` — ${p.action}`:''}`);
 return `${plural(active.length,'active project')} of ${state.projects.length}.`+(lines.length?'\n'+bullet(lines):'')+(todayTasks.length?`\n\n${plural(todayTasks.length,'project task')} on today's list.`:'');
}

function goalsAnswer(state:State){
 if(!state.goals.length)return 'No goals set. Open Goals to add them.';
 const average=Math.round(state.goals.reduce((sum,g)=>sum+(g.progress||0),0)/state.goals.length);
 const behind=[...state.goals].sort((a,b)=>a.progress-b.progress).slice(0,3);
 return `${plural(state.goals.length,'goal')}, ${average}% average.\nFurthest behind:\n`+bullet(behind.map(g=>`${g.title} — ${g.progress}%`));
}

function streakAnswer(state:State){
 if(!state.streak?.startedAt)return 'No streak running. Open Streak to start one.';
 const time=elapsed(state.streak.startedAt);
 return `${plural(time.days,'full day')}, ${time.hours}h ${time.minutes}m since it started.`;
}

function clockAnswer(state:State){
 const clock=state.clock;
 const on=clock?.alarms.filter(a=>a.enabled)??[];
 const running=clock?.timers.filter(t=>t.endsAt!==null)??[];
 if(!on.length&&!running.length)return 'No alarms on and no timers running.';
 const lines:string[]=[];
 for(const alarm of on){
  const mins=minutesUntil(alarm);
  lines.push(`${alarm.time}${alarm.label?` ${alarm.label}`:''}${mins===null?'':` — in ${mins<60?`${mins} min`:`${Math.floor(mins/60)}h ${mins%60}m`}`}`);
 }
 for(const timer of running)lines.push(`${timer.label} running`);
 return bullet(lines);
}

function watchAnswer(state:State){
 const videos=state.videos??[];
 if(!videos.length)return 'Nothing saved to watch later.';
 const unwatched=videos.filter(v=>!v.watched);
 if(!unwatched.length)return `All ${plural(videos.length,'video')} watched.`;
 return `${plural(unwatched.length,'video')} to watch:\n`+bullet(unwatched.slice(0,5).map(v=>v.title||'Untitled'));
}

function digest(state:State,today:string){
 const all=tasksFor(state,today);
 const open=all.filter(t=>!t.done);
 const steps=state.routine.length,checked=(state.checks[today]??[]).length;
 const pending=state.assignments.filter(a=>!['submitted','graded'].includes(a.status));
 const lines=[
  steps?`Morning routine ${checked} of ${steps}${checked>=steps?' — done':''}`:'No morning routine set up',
  all.length?`${plural(open.length,'task')} left of ${all.length} today`:'Nothing on today’s list',
 ];
 const critical=open.filter(t=>t.important);
 if(critical.length)lines.push(`${plural(critical.length,'critical task')} still open`);
 if(state.gym?.sessions.length){
  const session=sessionFor(state.gym,today);
  lines.push(session?`Gym: ${session.name}`:'Gym: rest day');
 }
 if(pending.length)lines.push(`${plural(pending.length,'assessment')} outstanding`);
 if(state.streak?.startedAt)lines.push(`Streak at ${elapsed(state.streak.startedAt).days} days`);
 return bullet(lines);
}

const HELP='Ask me about your list, what is critical, your morning routine, the gym, assignments, projects, goals, your streak, alarms or watch later. Or just ask how the day is going.';

export function askAssistant(question:string,state:State,today:string):string{
 const q=question.toLowerCase();
 const has=(re:RegExp)=>re.test(q);

 if(has(/\b(help|what can you|commands?)\b/))return HELP;
 if(has(/\b(critical|important|priorit|must do)\b/))return criticalAnswer(state,today);
 if(has(/\b(routine|morning)\b/))return routineAnswer(state,today);
 if(has(/\b(gym|workout|work out|train|training|lift|exercise)\b/))return gymAnswer(state,today);
 if(has(/\b(assignment|assessment|due|deadline|uni|exam|submit)\b/))return assignmentsAnswer(state,today);
 if(has(/\bproject/))return projectsAnswer(state,today);
 if(has(/\bgoal/))return goalsAnswer(state);
 if(has(/\bstreak\b/))return streakAnswer(state);
 if(has(/\b(alarm|timer|wake)\b/))return clockAnswer(state);
 if(has(/\b(video|watch later|youtube)\b/))return watchAnswer(state);
 if(has(/\b(left|remaining|outstanding|to-?do|todo|task|list|do today|get done)\b/))return tasksAnswer(state,today);
 if(has(/\b(overview|summary|status|everything|how am i|how is|where am i|brief|going)\b/))return digest(state,today);

 return `${digest(state,today)}\n\n${HELP}`;
}
