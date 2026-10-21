import type {State} from '../../../lib/planner';
import {capitalise,defaultSettings,seedUnits} from '../../../lib/planner';
import {upgradeLife} from '../../../lib/life';
import {ensureRoutinePresets} from '../../../lib/routine-presets';
import {upgradeGym} from '../../../lib/gym';
import {upgradeClock} from '../../../lib/clock';
export function upgradeState(state:State){
 ensureRoutinePresets(state);
 upgradeGym(state);
 upgradeClock(state);
 // Normalised here rather than only on input, so steps saved before this reads the same
 // as the ones saved after. The route persists the result when it differs.
 for(const step of state.routine)step.title=capitalise(step.title);
 for(const preset of state.routinePresets??[])for(const step of preset.steps)step.title=capitalise(step.title);
 // Seeded only when the field has never existed, so deleting a unit makes it stay gone.
 state.units??=seedUnits.map(name=>({id:crypto.randomUUID(),name,notes:[]}));
 state.quoteSeen??=[];
 state.settings={...defaultSettings(),...state.settings};
 // The dismissal list only needs enough history to survive a few days offline.
 if(state.quoteSeen.length>60)state.quoteSeen=state.quoteSeen.slice(-60);
 return upgradeLife(state);
}
