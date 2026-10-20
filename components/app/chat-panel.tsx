'use client';
import {useEffect,useRef,useState} from 'react';
import {Send} from 'lucide-react';
import {askAssistant} from '../../lib/assistant';
import type {State} from '../../lib/planner';

type Line={id:string;from:'you'|'app';text:string};

const SUGGESTIONS=['What is left today?','What is critical?','Morning routine','Gym today'];

export default function ChatPanel({state,today}:{state:State;today:string}){
 const [log,setLog]=useState<Line[]>([{id:'hello',from:'app',text:'Ask me what is left, what is critical, or how the day is going.'}]);
 const [draft,setDraft]=useState('');
 const end=useRef<HTMLDivElement>(null);

 useEffect(()=>{end.current?.scrollIntoView({block:'nearest'});},[log]);

 const ask=(question:string)=>{
  const text=question.trim();
  if(!text)return;
  setLog(prev=>[
   ...prev,
   {id:crypto.randomUUID(),from:'you',text},
   {id:crypto.randomUUID(),from:'app',text:askAssistant(text,state,today)},
  ]);
  setDraft('');
 };

 return <aside className="orbital-aside" aria-label="Ask about your day">
  <div className="aside-head">
   <span className="orbital-core-kicker">Ask</span>
   <span className="tiny">Reads your planner</span>
  </div>

  <div className="aside-log">
   {log.map(line=><div key={line.id} className={line.from==='you'?'aside-bubble is-you':'aside-bubble'}>{line.text}</div>)}
   <div ref={end}/>
  </div>

  <div className="aside-chips">
   {SUGGESTIONS.map(s=><button key={s} type="button" className="aside-chip" onClick={()=>ask(s)}>{s}</button>)}
  </div>

  <form className="aside-form" onSubmit={e=>{e.preventDefault();ask(draft);}}>
   <label className="sr-only" htmlFor="ask-input">Ask about your day</label>
   <input id="ask-input" value={draft} onChange={e=>setDraft(e.target.value)} maxLength={300}
    placeholder="What is left on my list?"/>
   <button type="submit" className="aside-send" disabled={!draft.trim()} aria-label="Ask"><Send size={15}/></button>
  </form>
 </aside>;
}
