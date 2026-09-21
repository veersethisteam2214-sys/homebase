'use client';
import {useEffect,useState} from 'react';
import {ArrowUpRight,Check,Flame,FolderKanban,Sun,CalendarDays,Play,Sparkles} from 'lucide-react';
import {dayKey,tasksFor,type State} from '../lib/planner';
import {elapsed} from '../lib/life';
export function LocalClock(){const [time,setTime]=useState('');useEffect(()=>{const tick=()=>setTime(new Intl.DateTimeFormat('en-AU',{timeZone:'Australia/Hobart',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date()));tick();const id=setInterval(tick,1000);return()=>clearInterval(id);},[]);return <span className="local-clock">{time}<small>HOBART</small></span>;}
export default function MissionControl({state,date,onNavigate}:{state:State;date:string;onNavigate:(view:string)=>void}){
 const tasks=tasksFor(state,date),done=tasks.filter(t=>t.done).length,percent=tasks.length?Math.round(done/tasks.length*100):0;
 const due=state.assignments.filter(a=>a.date>=dayKey()&&!['submitted','graded'].includes(a.status)).sort((a,b)=>a.date.localeCompare(b.date))[0];
 const active=state.projects.filter(p=>p.active).length;
 return <section className="mission-grid"><div className="mission-main"><div><div className="eyebrow"><Sparkles size={15}/> TODAY’S MOMENTUM</div><h2>{percent===100&&tasks.length?'You followed through.':done?'Keep the momentum.':'Make your next move.'}</h2><p>{done} of {tasks.length} tasks complete <span>·</span> {tasks.length-done} opportunities to move forward</p><div className="mission-progress"><i style={{width:percent+'%'}}/></div></div><div className="completion-ring" style={{'--progress':percent+'%'} as React.CSSProperties}><span><strong>{percent}<em>%</em></strong><small>COMPLETE</small></span></div></div><button className="mission-mini" onClick={()=>onNavigate('Projects')}><span className="metric-icon lavender"><FolderKanban size={22}/></span><strong>{active.toString().padStart(2,'0')}</strong><span>Active projects</span><ArrowUpRight className="metric-arrow" size={17}/></button><button className="mission-mini" onClick={()=>onNavigate('Assignments')}><span className="metric-icon blue"><CalendarDays size={22}/></span><strong className="metric-date">{due?new Date(due.date+'T12:00:00Z').toLocaleDateString('en-AU',{day:'numeric',month:'short',timeZone:'UTC'}):'All clear'}</strong><span>{due?'Next assignment':'No upcoming deadlines'}</span><ArrowUpRight className="metric-arrow" size={17}/></button></section>;
}
export function PersonalShelf({state,onNavigate}:{state:State;onNavigate:(view:string)=>void}){
 const [now,setNow]=useState(Date.now());useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),60000);return()=>clearInterval(timer);},[]);
 const queued=state.videos?.filter(v=>!v.watched)||[];
 return <section className="personal-shelf"><button onClick={()=>onNavigate('Streak')}><span className="shelf-symbol"><Flame size={25}/></span><div><small>PERSONAL STREAK</small><strong>{state.streak?.startedAt?<>{elapsed(state.streak.startedAt,now).days} <em>days & counting</em></>:'Your next commitment'}</strong></div><ArrowUpRight size={19}/></button><button onClick={()=>onNavigate('Watch later')}><span className="shelf-symbol video"><Play size={23}/></span><div><small>WATCH LATER</small><strong>{queued.length?`${queued.length} videos saved`:'A shelf for good ideas'}</strong></div><ArrowUpRight size={19}/></button></section>;
}
