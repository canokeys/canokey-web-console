export const TYPES = {
    SET_DEVICE: Symbol('SET_DEVICE'),
    APPEND_APDU_LOG: Symbol('APPEND_APDU_LOG'),
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

export function appendAPDULog(capdu, rapdu) {
    return {
        type: TYPES.APPEND_APDU_LOG,
        capdu,
        rapdu
    }
}

function byteToHexString(uint8arr) {
    if (!uint8arr) return '';
    var hexStr = '';
    for (var i = 0; i < uint8arr.length; i++) {
        var hex = (uint8arr[i] & 0xff).toString(16);
        hex = (hex.length === 1) ? '0' + hex : hex;
        hexStr += hex;
    }
    return hexStr.toUpperCase();
}

function hexStringToByte(str) {
    if (!str) return new Uint8Array();
    var a = [];
    for (var i = 0, len = str.length; i < len; i += 2)
        a.push(parseInt(str.substr(i, 2), 16));
    return new Uint8Array(a);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function transceive_webusb(device, capdu) {
    let data = hexStringToByte(capdu);
    // send a command
    await device.controlTransferOut({
        requestType: 'vendor',
        recipient: 'interface',
        request: 0,
        value: 0,
        index: 1
    }, data);
    // wait for execution
    while (1) {
        let resp = await device.controlTransferIn({
            requestType: 'vendor',
            recipient: 'interface',
            request: 2,
            value: 0,
            index: 1
        }, 1);
        if (new Uint8Array(resp.data.buffer)[0] === 0) break;
        await sleep(100);
    }
    // get the response
    let resp = await device.controlTransferIn({
        requestType: 'vendor',
        recipient: 'interface',
        request: 1,
        value: 0,
        index: 1
    }, 1500);
    if (resp.status === "ok")
        return byteToHexString(new Uint8Array(resp.data.buffer));
    return '';
}

export function transceive(capdu) {
    return async (dispatch, getState) => {
        const { device } = getState();
        try {
            let res = await transceive_webusb(device, capdu);
            dispatch(appendAPDULog(capdu, res));
            return res;
        } catch (err) {
            console.log(err);
        }
        return '';
    };
}