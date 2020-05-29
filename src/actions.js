import {byteToHexString, hexStringToByte, sleep} from "./util";

export const TYPES = {
  SET_DEVICE: Symbol('SET_DEVICE'),
  APPEND_APDU_LOG: Symbol('APPEND_APDU_LOG'),
  SET_ADMIN_AUTHENTICATED: Symbol('SET_ADMIN_AUTHENTICATED'),
}

export function setDevice(device) {
  return {
    type: TYPES.SET_DEVICE,
    device
  }
}

export function connect() {
  return async dispatch => {
    let device = await navigator.usb.requestDevice({
      filters: [{
        classCode: 0xFF, // vendor specific
      }]
    });
    if (device !== undefined) {
      await device.open();
      await device.claimInterface(1);
      dispatch(setDevice(device));
      dispatch(setAdminAuthenticated(false));
      navigator.usb.addEventListener('disconnect', event => {
        console.log(`USB device disconnected ${event}`);
        if (event.device === device) {
          dispatch(setDevice(null));
          dispatch(setAdminAuthenticated(false));
        }
      });
      return true;
    }
    return false;
  };
}

export function disconnect() {
  return {
    type: TYPES.SET_DEVICE,
    device: null
  }
}

export function setAdminAuthenticated(state) {
  return {
    type: TYPES.SET_ADMIN_AUTHENTICATED,
    adminAuthenticated: state,
  }
}

export function appendAPDULog(capdu, rapdu) {
  return {
    type: TYPES.APPEND_APDU_LOG,
    capdu: capdu.toUpperCase(),
    rapdu: rapdu.toUpperCase()
  }
}


async function transceive_webusb(device, capdu) {
  let data = hexStringToByte(capdu);

  // send a command
  let resp = await device.controlTransferOut({
    requestType: 'vendor',
    recipient: 'interface',
    request: 0,
    value: 0,
    index: 1
  }, data);
  // wait for execution
  while (1) {
    resp = await device.controlTransferIn({
      requestType: 'vendor',
      recipient: 'interface',
      request: 2,
      value: 0,
      index: 1
    }, 1);
    if (resp.status === 'stalled') {
      throw 'Device busy';
    }
    let code = new Uint8Array(resp.data.buffer)[0];
    if (code === 0) break;
    else if (code === 1) {
      await sleep(100);
    } else {
      throw 'Device busy';
    }
  }
  // get the response
  resp = await device.controlTransferIn({
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

export function transceive(capdu, is_secret) {
  return async (dispatch, getState) => {
    const {device} = getState();
    let res = await transceive_webusb(device, capdu);
    if (is_secret) {
      dispatch(appendAPDULog('REDACTED', res));
    } else {
      dispatch(appendAPDULog(capdu, res));
    }
    return res;
  };
}
