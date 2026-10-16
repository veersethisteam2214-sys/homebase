'use client';
import {ArrowRight,Quote} from 'lucide-react';
import {quoteFor} from '../../lib/planner';
import {Modal} from './ui';

const pretty=(date:string)=>new Date(date+'T12:00:00Z').toLocaleDateString('en-AU',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'});

/** The first thing you see each day. Dismissing it is what opens the dashboard. */
export default function QuoteGate({today,open,onClose}:{today:string;open:boolean;onClose:()=>void}){
 return <Modal open={open} dismissible={false}>
  <div className="quote-card">
   <span className="quote-mark"><Quote size={19}/></span>
   <p className="quote-text">{quoteFor(today)}</p>
   <p className="quote-date">{pretty(today)}</p>
   <button type="button" className="btn btn-primary" onClick={onClose} autoFocus>
    Start the day <ArrowRight size={17}/>
   </button>
  </div>
 </Modal>;
}
