import type {State} from '../../../lib/planner';
import {upgradeLife} from '../../../lib/life';
import {ensureRoutinePresets} from '../../../lib/routine-presets';
export function upgradeState(state:State){ensureRoutinePresets(state);return upgradeLife(state);}
