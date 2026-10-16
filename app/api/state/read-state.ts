import type {State} from '../../../lib/planner';
import {defaultSettings} from '../../../lib/planner';
import {upgradeLife} from '../../../lib/life';
import {ensureRoutinePresets} from '../../../lib/routine-presets';
import {upgradeGym} from '../../../lib/gym';
import {upgradeClock} from '../../../lib/clock';
export function upgradeState(state:State){
 ensureRoutinePresets(state);
 upgradeGym(state);
 upgradeClock(state);
 state.quoteSeen??=[];
 state.settings={...defaultSettings(),...state.settings};
 // The dismissal list only needs enough history to survive a few days offline.
 if(state.quoteSeen.length>60)state.quoteSeen=state.quoteSeen.slice(-60);
 return upgradeLife(state);
}
