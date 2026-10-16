import type {RingtoneId} from './clock';

type Note={freq:number;at:number;dur:number;shape:OscillatorType;level:number};
type Pattern={notes:Note[];length:number};

// Ringtones are synthesised rather than loaded, so there is no audio file to ship,
// nothing to license, and they work with no network.
const patterns:Record<RingtoneId,Pattern>={
 chime:{length:3,notes:[
  {freq:880,at:0,dur:1.1,shape:'sine',level:0.5},
  {freq:1108.73,at:0.28,dur:1.1,shape:'sine',level:0.4},
  {freq:1318.51,at:0.56,dur:1.3,shape:'sine',level:0.34},
 ]},
 bell:{length:2.4,notes:[
  {freq:659.25,at:0,dur:1.5,shape:'triangle',level:0.5},
  {freq:1318.51,at:0,dur:0.9,shape:'sine',level:0.18},
  {freq:659.25,at:0.8,dur:1.5,shape:'triangle',level:0.4},
 ]},
 pulse:{length:2,notes:[
  {freq:440,at:0,dur:0.14,shape:'square',level:0.3},
  {freq:440,at:0.25,dur:0.14,shape:'square',level:0.3},
  {freq:440,at:0.5,dur:0.14,shape:'square',level:0.3},
  {freq:587.33,at:0.78,dur:0.3,shape:'square',level:0.3},
 ]},
 sunrise:{length:4,notes:[
  {freq:329.63,at:0,dur:1.6,shape:'sine',level:0.34},
  {freq:415.3,at:0.7,dur:1.6,shape:'sine',level:0.36},
  {freq:493.88,at:1.4,dur:1.6,shape:'sine',level:0.38},
  {freq:659.25,at:2.1,dur:1.9,shape:'sine',level:0.4},
 ]},
 alert:{length:1.6,notes:[
  {freq:880,at:0,dur:0.2,shape:'square',level:0.34},
  {freq:1046.5,at:0.22,dur:0.2,shape:'square',level:0.34},
  {freq:880,at:0.44,dur:0.2,shape:'square',level:0.34},
  {freq:1046.5,at:0.66,dur:0.2,shape:'square',level:0.34},
 ]},
};

type Ctor=typeof AudioContext;
let shared:AudioContext|null=null;

function context(){
 if(typeof window==='undefined')return null;
 const Ctor=(window.AudioContext||(window as unknown as {webkitAudioContext?:Ctor}).webkitAudioContext) as Ctor|undefined;
 if(!Ctor)return null;
 if(!shared||shared.state==='closed')shared=new Ctor();
 return shared;
}

/**
 * Browsers only let audio start from a user gesture. Calling this from any click keeps a
 * running context ready, so an alarm that fires later can actually be heard.
 */
export function primeAudio(){
 const ctx=context();
 if(!ctx)return;
 if(ctx.state==='suspended')void ctx.resume();
}

export function audioReady(){return shared!==null&&shared.state==='running';}

export function audioSupported(){
 if(typeof window==='undefined')return false;
 return Boolean(window.AudioContext||(window as unknown as {webkitAudioContext?:Ctor}).webkitAudioContext);
}

/** Plays a ringtone and returns a function that stops it early. */
export function playRingtone(id:RingtoneId,{loops=1,volume=0.7}:{loops?:number;volume?:number}={}){
 const ctx=context();
 const pattern=patterns[id]??patterns.chime;
 if(!ctx)return()=>{};
 if(ctx.state==='suspended')void ctx.resume();
 const master=ctx.createGain();
 master.gain.value=Math.min(1,Math.max(0,volume));
 master.connect(ctx.destination);
 const started:OscillatorNode[]=[];
 const base=ctx.currentTime+0.04;
 for(let loop=0;loop<loops;loop++){
  for(const note of pattern.notes){
   const at=base+loop*pattern.length+note.at;
   const osc=ctx.createOscillator(),gain=ctx.createGain();
   osc.type=note.shape;
   osc.frequency.setValueAtTime(note.freq,at);
   // A short attack and an exponential tail keep the tone from clicking.
   gain.gain.setValueAtTime(0.0001,at);
   gain.gain.exponentialRampToValueAtTime(note.level,at+0.02);
   gain.gain.exponentialRampToValueAtTime(0.0001,at+note.dur);
   osc.connect(gain);gain.connect(master);
   osc.start(at);osc.stop(at+note.dur+0.05);
   started.push(osc);
  }
 }
 let stopped=false;
 return()=>{
  if(stopped)return;
  stopped=true;
  for(const osc of started){try{osc.stop();}catch{/* already finished */}}
  try{master.disconnect();}catch{/* already detached */}
 };
}

export function ringtoneLength(id:RingtoneId){return (patterns[id]??patterns.chime).length;}
