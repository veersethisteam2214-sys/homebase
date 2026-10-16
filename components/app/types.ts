import type {State} from '../../lib/planner';
import type {SectionId} from './section-meta';

export type View='dashboard'|SectionId;

export type SectionProps={
 state:State;
 today:string;
 busy:boolean;
 storage:'local'|'supabase';
 /** Clones the state, applies the change, records it in history and saves. An empty label skips history. */
 change:(label:string,mutate:(state:State)=>void)=>void;
 /** Takes over a state and revision that the server itself wrote, so the next save does not conflict. */
 adopt:(state:State,revision:number)=>void;
 go:(view:View)=>void;
 notify:(message:string,tone?:'info'|'error')=>void;
};
