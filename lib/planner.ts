export type Assignment={id:string;date:string;unit:string;title:string;weight:string;format:string;notes:string;status:string};
export type ClassEntry={day:string;start:string;end:string;unit:string;kind:string;location:string;note:string};
export type Task = {id:string; title:string; date:string; project?:string; done:boolean; deleted?:boolean; source?:string; important?:boolean};
export type ProjectNote = {id:string; text:string; at:string; pinned?:boolean};
export type Project = {id:string; title:string; action:string; days:number[]; active:boolean; summary?:string; notes?:ProjectNote[]};
export type AppSettings={accent:string;theme:'light'|'dark';quotePopup:boolean;volume:number};
/**
 * The highlight colours offered in the picker. All sit in the same darkness band so
 * white text stays readable on them and they hold up against the dark field. Stored
 * accents are validated by shape rather than against this list, so curating it never
 * invalidates a planner that was saved with an older colour.
 */
export const accents=[
 {hex:'#27514A',name:'Forest'},
 {hex:'#1F6F5E',name:'Jade'},
 {hex:'#176B82',name:'Teal'},
 {hex:'#2B5FA8',name:'Ocean'},
 {hex:'#3F47A6',name:'Indigo'},
 {hex:'#6B46A8',name:'Violet'},
 {hex:'#8E3D9E',name:'Orchid'},
 {hex:'#A8367A',name:'Magenta'},
 {hex:'#A83752',name:'Rose'},
 {hex:'#A84430',name:'Rust'},
 {hex:'#8A5A18',name:'Amber'},
 {hex:'#4F7A24',name:'Olive'},
];
export const accentPattern=/^#[0-9a-f]{6}$/i;
// The orbit is a dark field and the section pages share it, so there is one look.
export function defaultSettings():AppSettings{return {accent:'#27514A',theme:'dark',quotePopup:true,volume:0.7};}
export type State = {tasks:Task[]; projects:Project[]; goals:{id:string;title:string;progress:number}[]; routine:{id:string;title:string}[]; checks:Record<string,string[]>; unlocked:string[]; assignments:Assignment[]; classes?:ClassEntry[]; displayName?:string; history:{id:string;time:string;text:string}[]; reminders:{id:string;title:string;time:string;enabled:boolean}[]; notes:Record<string,string>; termEnd:string; plannedDates?:string[]; lastPlanDate?:string; routinePresets?:import("./routine-presets").RoutinePreset[]; activeRoutinePresetId?:string; videos?:import("./life").Video[]; streak?:import("./life").Streak; motivation?:import("./life").Motivation; listRevision?:number; gym?:import("./gym").Gym; clock?:import("./clock").Clock; quoteSeen?:string[]; settings?:AppSettings};
export const weekdays=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
export function dayKey(d=new Date()) {return new Intl.DateTimeFormat('en-CA',{timeZone:'Australia/Hobart',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);}
export function offset(date:string,days:number){const d=new Date(date+'T12:00:00Z'); d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
export function weekDay(date:string){return new Date(date+'T12:00:00Z').getUTCDay();}
export function initialState():State {
 return {tasks:[],projects:[],goals:[],routine:[],checks:{},unlocked:[],assignments:[],classes:[],history:[],reminders:[],notes:{},termEnd:dayKey(),listRevision:1};
}
export function tasksFor(state:State,date:string):Task[]{
 const generated:Task[]=[]; if(state.plannedDates?.includes(date))return state.tasks.filter(t=>t.date===date&&!t.deleted);
 for(const p of state.projects) if(p.active&&p.days.includes(weekDay(date))) generated.push({id:`project:${p.id}:${date}`,title:p.action,date,project:p.id,source:'Project schedule',done:false});
 for(const a of state.assignments) if(!['submitted','graded'].includes(a.status)) {for(const lead of [7,3,0]) if(offset(a.date,-lead)===date) generated.push({id:`assignment:${a.id}:${lead}:${date}`,title:`${lead===0?'Submit':lead===7?'Start':'Review'} ${a.title} · ${a.unit}`,date,source:lead===0?'Assignment due':'Assignment prep',done:false});}
 const stored=state.tasks.filter(t=>t.date===date);return [...generated.filter(g=>!stored.some(t=>t.id===g.id)),...stored].filter(t=>!t.deleted);
}
export function quoteFor(date:string){
 const starts=['Build trust in yourself','Move toward the life you want','Make your next hour count','Give your future self a reason to smile','Keep your promise to yourself','Let small actions compound','Choose the work that matters','Create evidence of your progress','Bring your attention back','Grow at a pace you can sustain','Give your goal a place in today','Make room for the person you are becoming','Put care into the next step','Turn intention into practice','Keep showing up with purpose','Begin with what you can do','Build strength through consistency','Make today part of your story','Respect the effort you can give','Find momentum in a small win','Be patient with the bigger picture','Invest in the habits that carry you','Let your values shape your calendar','Take responsibility for the next step','Give progress your full attention','Choose a useful beginning','Let effort become your confidence','Make something your future can build on','Turn your focus into forward movement','Keep your goals close'];
 const ends=['one honest action at a time.','with one task finished well.','by beginning before you feel ready.','through a promise kept today.','without needing a perfect day.','by doing the next useful thing.','with steady effort and a little patience.','by protecting time for what you value.','with curiosity when the work gets difficult.','by returning after a setback.','through practice you can repeat tomorrow.','with attention to what is in your control.','by choosing progress over comparison.','with a small step you can take right now.','by giving one priority your best energy.','through the quiet work that adds up.','with kindness toward yourself along the way.','by making space for growth.','with a clear intention and a concrete action.','by following through on what matters.','through effort that reflects your values.','with the courage to keep learning.','by finishing the step in front of you.','with consistency beyond motivation.','through actions your future self will recognise.','by trading a little comfort for meaningful growth.','with the courage to ask better questions.','by noticing how far you have come.','through deliberate practice today.','with one less distraction and one more action.'];
 const n=Math.floor((Date.parse(date+'T00:00:00Z')-Date.parse('2026-01-01T00:00:00Z'))/86400000);const k=((n%900)+900)%900;return starts[k%30]+', '+ends[Math.floor(k/30)];
}
// Freeze actual daily lists so later schedule edits never rewrite past days.
export function materializeThrough(state:State,today:string){
 state.plannedDates??=[];
 let date=state.lastPlanDate?offset(state.lastPlanDate,1):today;
 while(date<=today){
  if(!state.plannedDates.includes(date)){
   const planned=tasksFor(state,date);
   for(const t of planned)if(!state.tasks.some(x=>x.id===t.id))state.tasks.push(t);
   state.plannedDates.push(date);
  }
  date=offset(date,1);
 }
 state.lastPlanDate=today;
}

