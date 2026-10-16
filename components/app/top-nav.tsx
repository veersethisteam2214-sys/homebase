'use client';
import {useEffect,useRef,useState} from 'react';
import {Flame,History,Moon,Settings2,Sun} from 'lucide-react';
import {sections} from './section-meta';
import type {View} from './types';

type Props={view:View;go:(view:View)=>void;name:string;busy:boolean;theme:'light'|'dark';onToggleTheme:()=>void};

function initials(name:string){
 const parts=name.trim().split(/\s+/).filter(Boolean);
 if(!parts.length)return 'HB';
 return (parts[0][0]+(parts[1]?.[0]??'')).toUpperCase();
}

export default function TopNav({view,go,name,busy,theme,onToggleTheme}:Props){
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

 return <header className="topbar">
  <div className="topbar-inner">
   <button type="button" className="brand" onClick={()=>go('dashboard')} aria-label="Homebase dashboard">
    <span className="brand-dot" aria-hidden="true"/>Homebase
   </button>

   <nav className="nav" aria-label="Sections">
    <button type="button" className="nav-link" aria-current={view==='dashboard'?'page':undefined} onClick={()=>go('dashboard')}>Dashboard</button>
    {sections.filter(s=>s.inNav).map(section=>{
     const Icon=section.icon;
     return <button key={section.id} type="button" className="nav-link" aria-current={view===section.id?'page':undefined} onClick={()=>go(section.id)}>
      <Icon size={16}/>{section.label}
     </button>;
    })}
   </nav>

   <div className="topbar-right" ref={wrap}>
    <span className="save-dot" aria-live="polite">{busy?'Saving…':'Saved'}</span>
    <button type="button" className="avatar" aria-haspopup="menu" aria-expanded={open} onClick={()=>setOpen(v=>!v)} title="Profile and settings">
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
   </div>
  </div>
 </header>;
}
