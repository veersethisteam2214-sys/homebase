/* eslint-disable @next/next/no-img-element */
'use client';
import {useEffect,useRef,useState} from 'react';
import {Check,ExternalLink,Send,Trash2} from 'lucide-react';
import type {Video} from '../../../lib/life';
import type {SectionProps} from '../types';
import {Card,ConfirmButton,Empty,PageHead,Stat,Timeline,TimelineRow} from '../ui';

type Message={id:string;from:'you'|'app'|'error';text:string};

const thumb=(videoId:string)=>`https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
const stamp=(iso:string)=>new Date(iso).toLocaleDateString('en-AU',{day:'numeric',month:'short'});
const findLinks=(text:string)=>text.match(/https?:\/\/[^\s]+/g)??[];

export default function WatchLaterSection({state,busy,change,go}:SectionProps){
 const [log,setLog]=useState<Message[]>([{id:'hello',from:'app',text:'Paste a YouTube link and I will save it here. You can paste several at once.'}]);
 const [draft,setDraft]=useState('');
 const [working,setWorking]=useState(false);
 const logEnd=useRef<HTMLDivElement>(null);

 useEffect(()=>{logEnd.current?.scrollIntoView({block:'nearest'});},[log]);

 const videos=state.videos??[];
 const unwatched=videos.filter(v=>!v.watched);

 const say=(from:Message['from'],text:string)=>setLog(prev=>[...prev,{id:crypto.randomUUID(),from,text}]);

 const submit=async()=>{
  const text=draft.trim();
  if(!text||working)return;
  setDraft('');
  say('you',text);
  const links=findLinks(text);
  if(!links.length){say('app','That had no link in it. Paste a YouTube video, Shorts or youtu.be address and I will save it.');return;}
  setWorking(true);
  for(const link of links){
   try{
    const response=await fetch('/api/video-info',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:link})});
    const data=await response.json() as {videoId?:string;url?:string;title?:string;author?:string;metadataUnavailable?:boolean;error?:string};
    if(!response.ok||!data.videoId||!data.url)throw Error(data.error||'That link could not be read.');
    const already=(state.videos??[]).some(v=>v.videoId===data.videoId);
    if(already){say('error',`${data.title||'That video'} is already in your list.`);continue;}
    const video:Video={id:crypto.randomUUID(),videoId:data.videoId,url:data.url,title:data.title||'',author:data.author||'',addedAt:new Date().toISOString(),watched:false};
    change(`Saved a video to watch later${data.title?`: ${data.title}`:''}`,s=>{s.videos=[video,...(s.videos??[])];});
    say('app',data.metadataUnavailable||!data.title
     ? 'Saved it. YouTube did not return a title, so give it a name on the card below.'
     : `Saved “${data.title}”${data.author?` by ${data.author}`:''}.`);
   }catch(e){say('error',(e as Error).message);}
  }
  setWorking(false);
 };

 return <div className="stack">
  <PageHead title="Watch later" sub={`${unwatched.length} still to watch of ${videos.length}`} back={()=>go('dashboard')}/>

  <div className="stats">
   <Stat label="Saved" value={videos.length} note="videos"/>
   <Stat label="To watch" value={unwatched.length} note="not marked watched"/>
   <Stat label="Watched" value={videos.length-unwatched.length} note="kept for reference"/>
  </div>

  <Card tone="lift" title="Paste a link">
   <div className="chat">
    <div className="chat-log">
     {log.map(message=><div key={message.id} className={message.from==='you'?'bubble bubble-you':message.from==='error'?'bubble bubble-err':'bubble bubble-app'}>{message.text}</div>)}
     <div ref={logEnd}/>
    </div>
    <form className="chat-form" onSubmit={e=>{e.preventDefault();void submit();}}>
     <label className="sr-only" htmlFor="watch-input">Paste a YouTube link</label>
     <textarea id="watch-input" rows={1} value={draft} maxLength={2000} style={{minHeight:44}}
      placeholder="https://www.youtube.com/watch?v=..."
      onChange={e=>setDraft(e.target.value)}
      onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();void submit();}}}/>
     <button type="submit" className="btn btn-primary" disabled={working||!draft.trim()}>
      <Send size={16}/>{working?'Saving':'Send'}
     </button>
    </form>
    <p className="tiny">Enter sends, shift and enter adds a line.</p>
   </div>
  </Card>

  <Card tone="lift" title="Your list" action={<span className="tiny">Newest first</span>}>
   {videos.length===0
    ? <Empty>Nothing saved yet. Paste your first link above.</Empty>
    : <Timeline lead={108}>
      {videos.map(video=><TimelineRow
       key={video.id}
       tone={video.watched?'done':'plain'}
       lead={<a href={video.url} target="_blank" rel="noopener noreferrer" aria-label={`Watch ${video.title||'this video'} on YouTube`}>
        <img className="tl-thumb" src={thumb(video.videoId)} alt="" loading="lazy" width={320} height={180}/>
       </a>}
       marker={video.watched?<Check size={12}/>:null}
       title={video.title
        ? video.title
        : <>
          <label className="sr-only" htmlFor={`name-${video.id}`}>Name this video</label>
          <input id={`name-${video.id}`} className="tl-edit" placeholder="Name this video" maxLength={300} disabled={busy}
           onBlur={e=>{
            const title=e.target.value.trim();
            if(!title)return;
            change(`Named a saved video: ${title}`,s=>{const target=s.videos?.find(v=>v.id===video.id);if(target)target.title=title;});
           }}/>
         </>}
       meta={<>{video.author||'Unknown channel'} &middot; {stamp(video.addedAt)}</>}
       trailing={<>
        <button type="button" className={video.watched?'btn btn-sm btn-soft':'btn btn-sm btn-ghost'} disabled={busy}
         onClick={()=>change('',s=>{const target=s.videos?.find(v=>v.id===video.id);if(target)target.watched=!target.watched;})}>
         <Check size={15}/>{video.watched?'Watched':'Mark watched'}
        </button>
        <a className="btn-icon" href={video.url} target="_blank" rel="noopener noreferrer" aria-label="Open on YouTube"
         style={{display:'inline-flex',alignItems:'center',justifyContent:'center'}}>
         <ExternalLink size={15}/>
        </a>
        <ConfirmButton label="Remove video" confirmLabel="Remove" disabled={busy}
         onConfirm={()=>change(`Removed a saved video${video.title?`: ${video.title}`:''}`,s=>{s.videos=(s.videos??[]).filter(v=>v.id!==video.id);})}>
         <Trash2 size={15}/>
        </ConfirmButton>
       </>}
      />)}
     </Timeline>}
  </Card>
 </div>;
}
