import { TYPES } from "./actions";
import { List } from 'immutable';

export function device(state = null, action) {
    if (action.type === TYPES.SET_DEVICE) {
        if (state !== null) {
            state.close();
        }
        return action.device;
    }
    return state;
}

export function apduLog(state = List(), action) {
    if (action.type === TYPES.APPEND_APDU_LOG) {
        return state.push({
            capdu: action.capdu,
            rapdu: action.rapdu
        });
    }
    return state;
}
