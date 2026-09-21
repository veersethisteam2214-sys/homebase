import type {State} from './planner';
export type Video={id:string;videoId:string;url:string;title:string;author:string;addedAt:string;watched:boolean};
export type Streak={startedAt:string|null;past:{startedAt:string;endedAt:string}[]};
export type Motivation={enabled:boolean;minMinutes:number;maxMinutes:number;startHour:number;endHour:number;nextAt:number;lastIndex:number;phrases:{id:string;text:string}[];phoneEnabled:boolean;phoneTopic:string;lastPhoneAt?:number};
export const defaultPhrases=[{id:'step',text:'Take one useful step today.'},{id:'effort',text:'Give your next hour your full attention.'}];
export function nextNudge(min:number,max:number,now=Date.now(),random=Math.random()) {return now+(min+Math.floor(random*(max-min+1)))*60000;}
export function inActiveHours(start:number,end:number,date=new Date()){const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Australia/Hobart',hour:'2-digit',hourCycle:'h23'}).format(date));return start===end|| (start<end?hour>=start&&hour<end:hour>=start||hour<end);}
export function upgradeLife(state:State){
 state.videos??=[];state.streak??={startedAt:null,past:[]};
 state.motivation??={enabled:true,minMinutes:30,maxMinutes:90,startHour:8,endHour:22,nextAt:nextNudge(30,90),lastIndex:-1,phrases:structuredClone(defaultPhrases),phoneEnabled:false,phoneTopic:''};
 state.listRevision??=1;
 return state;
}
export function parseYouTube(input:string){
 let url:URL;try{url=new URL(input.trim());}catch{throw Error('Paste a complete YouTube video link.');}
 if(!['https:','http:'].includes(url.protocol))throw Error('Use a YouTube website link.');
 const host=url.hostname.toLowerCase();let id:string|null=null;
 if(host==='youtu.be')id=url.pathname.split('/')[1];
 else if(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com'].includes(host)){
  const bits=url.pathname.split('/');id=url.pathname==='/watch'?url.searchParams.get('v'):['shorts','embed','live'].includes(bits[1])?bits[2]:null;
 }
 if(!id||!/^[a-zA-Z0-9_-]{11}$/.test(id))throw Error('Use a YouTube video, Shorts or youtu.be link, not a channel or playlist.');
 return {videoId:id,url:'https://www.youtube.com/watch?v='+id};
}
export function elapsed(start:string|null,now=Date.now()){const diff=start?Math.max(0,now-Date.parse(start)):0;return {days:Math.floor(diff/86400000),hours:Math.floor(diff/3600000)%24,minutes:Math.floor(diff/60000)%60,total:diff};}
export function resetStreak(streak:Streak,now=new Date().toISOString()){if(streak.startedAt)streak.past.unshift({startedAt:streak.startedAt,endedAt:now});streak.startedAt=now;}
