'use client';
import {useEffect,useRef,useState} from 'react';
import {Flame,History,Moon,Settings2,Sun} from 'lucide-react';
import type {View} from './types';

type Props={name:string;theme:'light'|'dark';onToggleTheme:()=>void;go:(view:View)=>void;onDark?:boolean};

function initials(name:string){
 const parts=name.trim().split(/\s+/).filter(Boolean);
 if(!parts.length)return 'HB';
 return (parts[0][0]+(parts[1]?.[0]??'')).toUpperCase();
}

/** The only chrome that survives on the orbital screen: settings, streak, history, theme. */
export default function ProfileMenu({name,theme,onToggleTheme,go,onDark}:Props){
 const [open,setOpen]=useState(false);
 const wrap=useRef<HTMLDivElement>(null);

 useEffect(()=>{
  if(!open)return;
  const onDown=(e:MouseEvent)=>{if(!wrap.current?.contains(e.target as Node))setOpen(false);};
  const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false);};
  document.addEventListener('mousedown',onDown);
  document.addEventListener('keydown',onKey);
  return()=>{document.removeEventListener('mousedown',onDown);document.removeEventListener('keydown',onKey);};
 },[open]);

 const pick=(next:View)=>{setOpen(false);go(next);};

 return <div className="profile" ref={wrap}>
  <button type="button" className={onDark?'avatar avatar-dark':'avatar'} aria-haspopup="menu" aria-expanded={open}
   onClick={()=>setOpen(v=>!v)} title="Profile and settings">
   {initials(name)}
  </button>
  {open&&<div className="menu" role="menu">
   <div className="menu-head">
    <strong style={{display:'block',fontSize:14}}>{name||'Your Homebase'}</strong>
    <span className="tiny">Private to you</span>
   </div>
   <button type="button" role="menuitem" className="menu-item" onClick={()=>pick('settings')}><Settings2 size={17}/>Settings</button>
   <button type="button" role="menuitem" className="menu-item" onClick={()=>pick('streak')}><Flame size={17}/>Streak</button>
   <button type="button" role="menuitem" className="menu-item" onClick={()=>pick('history')}><History size={17}/>History</button>
   <button type="button" role="menuitem" className="menu-item" onClick={()=>{setOpen(false);onToggleTheme();}}>
    {theme==='dark'?<Sun size={17}/>:<Moon size={17}/>}{theme==='dark'?'Light theme':'Dark theme'}
   </button>
  </div>}
 </div>;
}
