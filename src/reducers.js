import { TYPES } from "./actions";

export function device(state = null, action) {
    if (action.type === TYPES.SET_DEVICE) {
        if (state !== null) {
            state.close();
        }
        return action.device;
    }
    return state;
}