import { TYPES } from "./actions";

export function device(state = null, action) {
    if (action.type === TYPES.SET_DEVICE)
        return action.device;
    return state;
}