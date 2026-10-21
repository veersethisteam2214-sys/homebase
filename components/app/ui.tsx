'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {ArrowLeft,X} from 'lucide-react';

export function PageHead({title,sub,back,children}:{title:string;sub?:string;back?:()=>void;children?:ReactNode}){
 return <div className="page-head">
  <div style={{minWidth:0}}>
   {back&&<button type="button" className="back-link" onClick={back}><ArrowLeft size={14}/>Dashboard</button>}
   <h1>{title}</h1>
   {sub&&<p>{sub}</p>}
  </div>
  {children}
 </div>;
}

/** A ticking clock for countdowns and live times. */
export function useNow(intervalMs=1000){
 const [now,setNow]=useState(()=>Date.now());
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),intervalMs);return()=>clearInterval(timer);},[intervalMs]);
 return now;
}

type ModalProps={open:boolean;onClose?:()=>void;title?:string;description?:string;wide?:boolean;dismissible?:boolean;children:ReactNode};

export function Modal({open,onClose,title,description,wide,dismissible=true,children}:ModalProps){
 const panel=useRef<HTMLDivElement>(null);

 // Opening the dialog moves focus into it, and locks the page behind it. This is keyed on
 // `open` alone: callers pass onClose as an inline arrow, so it changes identity on every
 // render, and anything that re-focuses the panel on that would steal focus from whatever
 // the user is typing in — one character per click.
 useEffect(()=>{
  if(!open)return;
  const previous=document.body.style.overflow;
  document.body.style.overflow='hidden';
  panel.current?.focus();
  return()=>{document.body.style.overflow=previous;};
 },[open]);

 // Re-subscribing this one as onClose changes is harmless: it touches nothing on screen.
 useEffect(()=>{
  if(!open||!dismissible)return;
  const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose?.();};
  document.addEventListener('keydown',onKey);
  return()=>document.removeEventListener('keydown',onKey);
 },[open,onClose,dismissible]);
 if(!open)return null;
 return <div className="backdrop" onMouseDown={e=>{if(dismissible&&e.target===e.currentTarget)onClose?.();}}>
  <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className={wide?'modal modal-wide':'modal'}>
   {(title||dismissible)&&<div className="spread" style={{marginBottom:description?6:16}}>
    {title?<h2 style={{fontSize:19}}>{title}</h2>:<span/>}
    {dismissible&&<button type="button" className="btn-icon" aria-label="Close" onClick={()=>onClose?.()}><X size={18}/></button>}
   </div>}
   {description&&<p className="muted" style={{marginBottom:18}}>{description}</p>}
   {children}
  </div>
 </div>;
}

export function Toast({message,tone,onDone}:{message:string;tone:'info'|'error';onDone:()=>void}){
 useEffect(()=>{const timer=setTimeout(onDone,tone==='error'?6000:2600);return()=>clearTimeout(timer);},[message,tone,onDone]);
 return <div role="status" aria-live="polite" className={tone==='error'?'toast toast-err':'toast'}>{message}</div>;
}

export function Switch({checked,onChange,label,disabled}:{checked:boolean;onChange:()=>void;label:string;disabled?:boolean}){
 return <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} className="switch" onClick={onChange}><i/></button>;
}

export function Bar({value,max=100}:{value:number;max?:number}){
 const pct=max>0?Math.min(100,Math.max(0,(value/max)*100)):0;
 return <div className="bar"><i style={{width:`${pct}%`}}/></div>;
}

export function Stat({label,value,note}:{label:string;value:ReactNode;note?:string}){
 return <div className="stat">
  <div className="eyebrow">{label}</div>
  <div className="stat-value">{value}</div>
  {note&&<div className="tiny">{note}</div>}
 </div>;
}

export function Card({title,action,eyebrow,tone,children}:{title?:string;action?:ReactNode;eyebrow?:string;tone?:'plain'|'lift'|'accent'|'dashed';children:ReactNode}){
 const tones={plain:'card',lift:'card card-lift',accent:'card card-accent',dashed:'card dashed'};
 return <section className={tones[tone??'plain']}>
  {(title||action||eyebrow)&&<div className="card-head">
   <div>
    {eyebrow&&<div className="eyebrow">{eyebrow}</div>}
    {title&&<h2 style={{marginTop:eyebrow?4:0}}>{title}</h2>}
   </div>
   {action}
  </div>}
  {children}
 </section>;
}

/** A two-step delete, so nothing irreversible is one click away. */
export function ConfirmButton({label,confirmLabel,onConfirm,disabled,children}:{label:string;confirmLabel?:string;onConfirm:()=>void;disabled?:boolean;children:ReactNode}){
 const [armed,setArmed]=useState(false);
 useEffect(()=>{if(!armed)return;const timer=setTimeout(()=>setArmed(false),4000);return()=>clearTimeout(timer);},[armed]);
 if(armed)return <button type="button" className="btn btn-sm btn-danger" disabled={disabled} onClick={()=>{setArmed(false);onConfirm();}}>{confirmLabel??'Confirm'}</button>;
 return <button type="button" className="btn-icon" aria-label={label} disabled={disabled} onClick={()=>setArmed(true)}>{children}</button>;
}

export function Empty({children}:{children:ReactNode}){return <p className="empty">{children}</p>;}
