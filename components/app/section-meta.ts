import {AlarmClock,Bell,BookOpen,Dumbbell,Film,Flag,Flame,FolderKanban,History,ListChecks,Settings2,Sunrise} from 'lucide-react';
import type {ComponentType} from 'react';

export type SectionId='today'|'routine'|'gym'|'goals'|'assignments'|'projects'|'watch'|'streak'|'reminders'|'clock'|'history'|'settings';

export type SectionMeta={id:SectionId;label:string;blurb:string;icon:ComponentType<{size?:number}>;inNav:boolean;onDashboard:boolean};

export const sections:SectionMeta[]=[
 {id:'today',label:'To-do list',blurb:'What you are doing today, in order of what matters.',icon:ListChecks,inNav:true,onDashboard:true},
 {id:'routine',label:'Morning routine',blurb:'The steps that start the day, ticked off one by one.',icon:Sunrise,inNav:true,onDashboard:true},
 {id:'gym',label:'Gym',blurb:'The split, today’s session and what you lifted last.',icon:Dumbbell,inNav:true,onDashboard:true},
 {id:'goals',label:'Goals',blurb:'What this period is for, and how far along you are.',icon:Flag,inNav:true,onDashboard:true},
 {id:'assignments',label:'Assignments',blurb:'Deadlines, weights and the prep that comes with them.',icon:BookOpen,inNav:true,onDashboard:true},
 {id:'projects',label:'Projects',blurb:'What you are building and which days it runs.',icon:FolderKanban,inNav:true,onDashboard:true},
 {id:'watch',label:'Watch later',blurb:'Paste a link in the chat and it is saved here.',icon:Film,inNav:true,onDashboard:true},
 {id:'clock',label:'Alarms',blurb:'Alarms, timers and the sound each one makes.',icon:AlarmClock,inNav:true,onDashboard:true},
 {id:'reminders',label:'Reminders',blurb:'Timed nudges and random motivation.',icon:Bell,inNav:true,onDashboard:true},
 // Both reached from the profile menu: the streak also shows as a count in the top bar.
 {id:'streak',label:'Streak',blurb:'The current run, and every run before it.',icon:Flame,inNav:false,onDashboard:false},
 {id:'history',label:'History',blurb:'Every past day, exactly as it was.',icon:History,inNav:false,onDashboard:false},
 {id:'settings',label:'Settings',blurb:'Your name, the look, sound and storage.',icon:Settings2,inNav:false,onDashboard:false},
];

export function sectionMeta(id:SectionId){return sections.find(s=>s.id===id)??sections[0];}
