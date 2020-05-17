export const TYPES = {
    SET_DEVICE: Symbol('SET_DEVICE'),
}

export function setDevice(device) {
    return {
        type: TYPES.SET_DEVICE,
        device
    }
}

export function connect() {
    return async dispatch => {
        try {
            let device = await navigator.usb.requestDevice({
                filters: [{
                    classCode: 0xFF, // vendor specific
                }]
            });
            if (device !== undefined) {
                await device.open();
                await device.claimInterface(1);
                dispatch(setDevice(device));
            }
        } catch (err) {
            console.log(err);
        }
    };
}

export function disconnect() {
    return {
        type: TYPES.SET_DEVICE,
        device: null
    }
}