import React, {useCallback, useState} from 'react';
import {makeStyles} from '@material-ui/core/styles';
import {useDispatch, useSelector} from "react-redux";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import Typography from "@material-ui/core/Typography";
import CardActions from "@material-ui/core/CardActions";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import TextField from "@material-ui/core/TextField";
import DialogActions from "@material-ui/core/DialogActions";
import {connect, setAdminAuthenticated, transceive} from "./actions";
import {byteToHexString} from "./util";
import {useSnackbar} from "notistack";
import ButtonGroup from "@material-ui/core/ButtonGroup";
import {Switch} from "@material-ui/core";

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
  },
  card: {
    marginLeft: "10%",
    marginRight: "10%",
    marginTop: "30px",
  },
  buttonGroup: {
    marginLeft: "20px"
  }
}));

/* eslint-disable no-throw-literal */
export default function Overview() {
  const classes = useStyles();
  const device = useSelector(state => state.device);
  const dispatch = useDispatch();
  const authenticated = useSelector(state => state.adminAuthenticated);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [chPinDialogOpen, setChPinDialogOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [flashSpace, setFlashSpace] = useState('unknown');
  const [state, setState] = useState({
    led: false,
    hotp: false,
    ndefReadonly: false
  });
  const {enqueueSnackbar} = useSnackbar();

  const onAuthenticate = useCallback(() => {
    setPinDialogOpen(true);
  }, []);


  const onChangePin = useCallback(() => {
    setChPinDialogOpen(true);
  }, []);

  const selectAdminApplet = useCallback(async () => {
    if (device === null) {
      if (!await dispatch(connect())) {
        throw 'Cannot connect to CanoKey';
      }
    }

    let res = await dispatch(transceive("00A4040005F000000000"));
    if (!res.endsWith("9000")) {
      throw 'Selecting admin applet failed';
    }
  }, [device, dispatch]);

  const adminTransceive = useCallback(async (capdu, success_msg, failed_msg, secret) => {
    try {
      let res = await dispatch(transceive(capdu, secret));
      if (res.endsWith("9000")) {
        enqueueSnackbar(success_msg, {variant: 'success'});
        return true;
      } else {
        enqueueSnackbar(failed_msg, {variant: 'error'});
      }
    } catch (err) {
      enqueueSnackbar(err.toString(), {variant: 'error'});
    }
    return false;
  }, [dispatch, selectAdminApplet, enqueueSnackbar]);

  const doAuthenticate = useCallback(async () => {
    setPinDialogOpen(false);
    try {
      let array = new TextEncoder().encode(pin);
      let len = new Uint8Array([array.length]);
      await selectAdminApplet();
      let res = await dispatch(transceive(`00200000${byteToHexString(len)}${byteToHexString(array)}`, true));
      if (res.startsWith("63C")) {
        let retry = parseInt(res.substr(3, 1), 16);
        enqueueSnackbar(`PIN verification failed, ${retry} retires left`, {variant: 'error'});
      } else if (res.endsWith("9000")) {
        dispatch(setAdminAuthenticated(true));
        enqueueSnackbar('PIN verification success', {variant: 'success'});
        res = await dispatch(transceive("0041000000"));
        if (res.endsWith("9000")) {
          let used = parseInt(res.substring(0, 2), 16);
          let total = parseInt(res.substring(2, 4), 16);
          setFlashSpace(`${used} KiB / ${total} KiB`);
        }
        res = await dispatch(transceive("0042000000"));
        if (res.endsWith("9000")) {
          let ledOn = res.substring(0, 2) === "01";
          let hotpOn = res.substring(2, 4) === "01";
          let ndefReadonly = res.substring(4, 6) === "01";
          setState({led: ledOn, hotp: hotpOn, ndefReadonly: ndefReadonly});
        }
      } else {
        enqueueSnackbar('PIN verification failed', {variant: 'error'});
      }
    } catch (err) {
      enqueueSnackbar(err.toString(), {variant: 'error'});
    }
  }, [pin, dispatch, enqueueSnackbar, selectAdminApplet]);

  const doChangePin = useCallback(async () => {
    setChPinDialogOpen(false);
    try {
      let array = new TextEncoder().encode(pin);
      let len = new Uint8Array([array.length]);
      await selectAdminApplet();
      let res = await dispatch(transceive(`00210000${byteToHexString(len)}${byteToHexString(array)}`, true));
      if (res.endsWith("9000")) {
        dispatch(setAdminAuthenticated(true));
        enqueueSnackbar('PIN changed', {variant: 'success'});
        res = await dispatch(transceive("0041000000"));
        if (res.endsWith("9000")) {
          let used = parseInt(res.substring(0, 2), 16);
          let total = parseInt(res.substring(2, 4), 16);
          setFlashSpace(`${used} KiB / ${total} KiB`);
        }
      } else {
        enqueueSnackbar('Change PIN failed', {variant: 'error'});
      }
    } catch (err) {
      enqueueSnackbar(err.toString(), {variant: 'error'});
    }
  }, [pin, dispatch, enqueueSnackbar, selectAdminApplet]);

  const onKeyPress = useCallback(async (e) => {
    if (e.key === 'Enter') {
      await doAuthenticate();
    }
  }, [doAuthenticate]);

  const onKeyPressChPin = useCallback(async (e) => {
    if (e.key === 'Enter') {
      await doChangePin();
    }
  }, [doChangePin]);

  const setLedStatus = useCallback(async (e) => {
    let ledOn = e.target.checked;
    if (ledOn) {
      await adminTransceive("00400101", "LED is on", "Set LED status failed");
    } else {
      await adminTransceive("00400100", "LED is off", "Set LED status failed");
    }
    setState(oldState => ({...oldState, led: ledOn}));
  }, [adminTransceive]);

  const setHotpStatus = useCallback(async (e) => {
    let hotpOn = e.target.checked;
    if (hotpOn) {
      await adminTransceive("00400301", "HOTP on touch is on", "Set HOTP status failed");
    } else {
      await adminTransceive("00400300", "HOTP on touch is off", "Set HOTP status failed");
    }
    setState(oldState => ({...oldState, hotp: hotpOn}));
  }, [adminTransceive]);

  const setNDEFReadonly = useCallback(async (e) => {
    let readonly = e.target.checked;
    if (readonly) {
      await adminTransceive("00080100", "NDEF is RO", "Set NDEF status failed");
    } else {
      await adminTransceive("00080000", "NDEF is RW", "Set NDEF status failed");
    }
    setState(oldState => ({...oldState, ndefReadonly: readonly}));
  }, [adminTransceive]);

  const resetOpenPGP = useCallback(async () => {
    await adminTransceive("00030000", "Reset OpenPGP done", "Reset OpenPGP failed");
  }, [adminTransceive]);

  const resetPIV = useCallback(async () => {
    await adminTransceive("00040000", "Reset PIV done", "Reset PIV failed");
  }, [adminTransceive]);

  const resetOATH = useCallback(async () => {
    await adminTransceive("00050000", "Reset OATH done", "Reset OATH failed");
  }, [adminTransceive]);

  const resetNDEF = useCallback(async () => {
    await adminTransceive("00070000", "Reset NDEF done", "Reset NDEF failed");
  }, [adminTransceive]);

  const enterDFU = useCallback(async () => {
    await adminTransceive("00FF2222", "Enter DFU: Unexpected success",
      "Enter DFU: WebUSB disconnected, device should be in DFU now");
  }, [adminTransceive]);

  const setSIGtouchOn = useCallback(async () => {
    await adminTransceive("00090001", "Set SIG touch policy REQUIRED", "Set SIG touch policy failed");
  }, [adminTransceive]);

  const setSIGtouchOff = useCallback(async () => {
    await adminTransceive("00090000", "Set SIG touch policy NO", "Set SIG touch policy failed");
  }, [adminTransceive]);

  const setDECtouchOn = useCallback(async () => {
    await adminTransceive("00090101", "Set DEC touch policy REQUIRED", "Set DEC touch policy failed");
  }, [adminTransceive]);

  const setDECtouchOff = useCallback(async () => {
    await adminTransceive("00090100", "Set DEC touch policy NO", "Set DEC touch policy failed");
  }, [adminTransceive]);

  const setAUTtouchOn = useCallback(async () => {
    await adminTransceive("00090201", "Set AUT touch policy REQUIRED", "Set AUT touch policy failed");
  }, [adminTransceive]);

  const setAUTtouchOff = useCallback(async () => {
    await adminTransceive("00090200", "Set AUT touch policy NO", "Set AUT touch policy failed");
  }, [adminTransceive]);

  return (
    <div className={classes.root}>
      <Card className={classes.card}>
        <CardContent>
          <Typography variant="h3">
            Admin Applet
          </Typography>
          <Typography>
            Authenticated: {authenticated ? 'true' : 'false'}
          </Typography>
          <Typography>
            Storage Usage: {flashSpace}
          </Typography>
        </CardContent>
        <CardActions>
          <Button onClick={onAuthenticate} variant="contained">
            Authenticate
          </Button>
        </CardActions>
      </Card>
      {
        authenticated ?
          <div>
            <Card className={classes.card}>
              <CardContent>
                <Typography variant="h3">
                  Config
                </Typography>
                <Typography variant="h6">
                  LED:
                  <Switch checked={state.led} onChange={setLedStatus}/>
                </Typography>
                <Typography variant="h6">
                  HOTP on touch:
                  <Switch checked={state.hotp} onChange={setHotpStatus}/>
                </Typography>
                <Typography variant="h6">
                  NDEF readonly:
                  <Switch checked={state.ndefReadonly} onChange={setNDEFReadonly}/>
                </Typography>
                <Typography variant="h6">
                  Set OpenPGP SIG touch policy:
                  <ButtonGroup variant="contained" className={classes.buttonGroup}>
                    <Button onClick={setSIGtouchOn}>Required</Button>
                    <Button onClick={setSIGtouchOff}>No</Button>
                  </ButtonGroup>
                </Typography>
                <Typography variant="h6">
                  Set OpenPGP DEC touch policy:
                  <ButtonGroup variant="contained" className={classes.buttonGroup}>
                    <Button onClick={setDECtouchOn}>Required</Button>
                    <Button onClick={setDECtouchOff}>No</Button>
                  </ButtonGroup>
                </Typography>
                <Typography variant="h6">
                  Set OpenPGP AUT touch policy:
                  <ButtonGroup variant="contained" className={classes.buttonGroup}>
                    <Button onClick={setAUTtouchOn}>Required</Button>
                    <Button onClick={setAUTtouchOff}>No</Button>
                  </ButtonGroup>
                </Typography>
              </CardContent>
              <CardActions>
                <Button variant="contained" onClick={onChangePin}> Change PIN </Button>
                <Button variant="contained" onClick={enterDFU}>Enter DFU (development only)</Button>
                <Button variant="contained" onClick={() => window.location = 'https://dfu.canokeys.org/'}>Go to Web DFU
                  util</Button>
              </CardActions>
            </Card>
            <Card className={classes.card}>
              <CardContent>
                <Typography variant="h3">
                  Reset Applet
                </Typography>
              </CardContent>
              <CardActions>
                <Button onClick={resetOpenPGP} variant="contained">Reset OpenPGP</Button>
                <Button onClick={resetPIV} variant="contained">Reset PIV</Button>
                <Button onClick={resetOATH} variant="contained">Reset OATH</Button>
                <Button onClick={resetNDEF} variant="contained">Reset NDEF</Button>
              </CardActions>
            </Card>
          </div>
          : null
      }
      <Dialog open={pinDialogOpen} onClose={() => setPinDialogOpen(false)}>
        <DialogTitle> Enter PIN to Authenticate Admin Applet</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Enter PIN below. Please be aware of PIN retry count. This will not be stored in browser.
          </DialogContentText>
          <TextField
            type="password"
            autoFocus
            fullWidth
            onKeyPress={onKeyPress}
            onChange={(e) => setPin(e.target.value)}/>
        </DialogContent>
        <DialogActions>
          <Button color="primary" onClick={doAuthenticate}>
            Authenticate
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={chPinDialogOpen} onClose={() => setChPinDialogOpen(false)}>
        <DialogTitle> Enter new pin for Admin Applet</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Enter new pin for Admin Applet.
          </DialogContentText>
          <TextField
            type="password"
            autoFocus
            fullWidth
            onKeyPress={onKeyPressChPin}
            onChange={(e) => setPin(e.target.value)}/>
        </DialogContent>
        <DialogActions>
          <Button color="primary" onClick={doChangePin}>
            Change Pin
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
