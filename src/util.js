export function byteToHexString(uint8arr) {
  if (!uint8arr) return '';
  var hexStr = '';
  for (var i = 0; i < uint8arr.length; i++) {
    var hex = (uint8arr[i] & 0xff).toString(16);
    hex = (hex.length === 1) ? '0' + hex : hex;
    hexStr += hex;
  }
  return hexStr.toUpperCase();
}

export function hexStringToByte(str) {
  if (!str) return new Uint8Array();
  var a = [];
  for (var i = 0, len = str.length; i < len; i += 2)
    a.push(parseInt(str.substr(i, 2), 16));
  return new Uint8Array(a);
}

export function hexStringToString(str) {
  let array = hexStringToByte(str);
  return new TextDecoder("utf-8").decode(array);
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
