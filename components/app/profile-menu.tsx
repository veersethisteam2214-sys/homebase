'use client';
import {useEffect,useRef,useState} from 'react';
import {Check,Flame,History,Palette,Settings2} from 'lucide-react';
import {accents} from '../../lib/planner';
import type {View} from './types';

type Props={
 name:string;
 monogram:string;
 accent:string;
 onAccent:(hex:string)=>void;
 go:(view:View)=>void;
 onDark?:boolean;
};

/** The only chrome that survives on the orbital screen: settings, streak, history, colour. */
export default function ProfileMenu({name,monogram,accent,onAccent,go,onDark}:Props){
 const [open,setOpen]=useState(false);
 const [picking,setPicking]=useState(false);
 const wrap=useRef<HTMLDivElement>(null);

 useEffect(()=>{
  if(!open)return;
  const onDown=(e:MouseEvent)=>{if(!wrap.current?.contains(e.target as Node)){setOpen(false);setPicking(false);}};
  const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape'){setOpen(false);setPicking(false);}};
  document.addEventListener('mousedown',onDown);
  document.addEventListener('keydown',onKey);
  return()=>{document.removeEventListener('mousedown',onDown);document.removeEventListener('keydown',onKey);};
 },[open]);

 const pick=(next:View)=>{setOpen(false);setPicking(false);go(next);};
 const current=accents.find(c=>c.hex.toLowerCase()===accent.toLowerCase());

 return <div className="profile" ref={wrap}>
  <button type="button" className={onDark?'avatar avatar-dark':'avatar'} aria-haspopup="menu" aria-expanded={open}
   onClick={()=>setOpen(v=>!v)} title="Profile and settings">
   {monogram||'VS'}
  </button>
  {open&&<div className="menu" role="menu">
   <div className="menu-head">
    <strong style={{display:'block',fontSize:14}}>{name||'Your Homebase'}</strong>
    <span className="tiny">Private to you</span>
   </div>
   <button type="button" role="menuitem" className="menu-item" onClick={()=>pick('settings')}><Settings2 size={17}/>Settings</button>
   <button type="button" role="menuitem" className="menu-item" onClick={()=>pick('streak')}><Flame size={17}/>Streak</button>
   <button type="button" role="menuitem" className="menu-item" onClick={()=>pick('history')}><History size={17}/>History</button>
   <button type="button" role="menuitem" className="menu-item" aria-expanded={picking} onClick={()=>setPicking(v=>!v)}>
    <Palette size={17}/>Change highlight colour
    <span className="menu-swatch" style={{background:accent}} aria-hidden="true"/>
   </button>

   {picking&&<div className="swatch-panel">
    <p className="tiny" style={{textAlign:'center'}}>{current?current.name:'Custom'}</p>
    <div className="swatch-wheel">
     {accents.map((colour,index)=>{
      const angle=(index/accents.length)*Math.PI*2-Math.PI/2;
      const active=colour.hex.toLowerCase()===accent.toLowerCase();
      return <button
       key={colour.hex}
       type="button"
       className={active?'swatch is-active':'swatch'}
       style={{left:`${50+38*Math.cos(angle)}%`,top:`${50+38*Math.sin(angle)}%`,background:colour.hex}}
       aria-label={colour.name}
       aria-pressed={active}
       title={colour.name}
       onClick={()=>onAccent(colour.hex)}
      >
       {active?<Check size={13}/>:null}
      </button>;
     })}
     <span className="swatch-hub" aria-hidden="true"/>
    </div>
   </div>}
  </div>}
 </div>;
}
