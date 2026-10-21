'use client';
import ProfileMenu from './profile-menu';
import type {View} from './types';

type Props={go:(view:View)=>void;name:string;monogram:string;busy:boolean;accent:string;onAccent:(hex:string)=>void};

/**
 * Section pages only. The orbit is the navigation, so there are no section links here —
 * just the way back and the profile menu.
 */
export default function TopNav({go,name,monogram,busy,accent,onAccent}:Props){
 return <header className="topbar">
  <div className="topbar-inner">
   <button type="button" className="brand" onClick={()=>go('dashboard')} aria-label="Back to the dashboard">
    <span className="brand-dot" aria-hidden="true"/>Homebase
   </button>
   <div className="topbar-right" style={{marginLeft:'auto'}}>
    <span className="save-dot" aria-live="polite">{busy?'Saving…':'Saved'}</span>
    <ProfileMenu name={name} monogram={monogram} accent={accent} onAccent={onAccent} go={go}/>
   </div>
  </div>
 </header>;
}
