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
import {transceive} from "./actions";
import {byteToHexString} from "./util";

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
  },
  card: {
    marginLeft: "10%",
    marginRight: "10%",
    marginTop: "30px",
  }
}));

export default function Overview() {
  const classes = useStyles();
  const device = useSelector(state => state.device);
  const dispatch = useDispatch();
  const [authenticated, setAuthenticated] = useState(false);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pin, setPin] = useState('');

  const onAuthenticate = useCallback(() => {
    setPinDialogOpen(true);
  }, []);

  const doAuthenticate = useCallback(async () => {
    setPinDialogOpen(false);
    if (device !== null) {
      let res = await dispatch(transceive("00A4040005F000000000"));
      if (!res.endsWith("9000")) {
        return;
      }
      let array = new TextEncoder().encode(pin);
      let len = new Uint8Array([array.length]);
      res = await dispatch(transceive(`00200000${byteToHexString(len)}${byteToHexString(array)}`, true));
      if (res.endsWith("9000")) {
        setAuthenticated(true);
      }
    } else {
      console.log('device is not open');
    }
  }, [device, pin]);

  const setLedOn = useCallback(async () => {
    if (device !== null) {
      let res = await dispatch(transceive("00400101"));
      if (res.endsWith("9000")) {
        console.log('set led to on');
      }
    } else {
      console.log('device is not open');
    }
  }, [device]);

  const setLedOff = useCallback(async () => {
    if (device !== null) {
      let res = await dispatch(transceive("00400100"));
      if (res.endsWith("9000")) {
        console.log('set led to on');
      }
    } else {
      console.log('device is not open');
    }
  }, [device]);

  return (
    <div className={classes.root}>
      <Card className={classes.card}>
        <CardContent>
          <Typography variant="h2">
            Admin Applet
          </Typography>
          <Typography>
            Authenticated: {authenticated ? 'true' : 'false'}
          </Typography>
        </CardContent>
        <CardActions>
          <Button onClick={onAuthenticate}>
            Authenticate
          </Button>
        </CardActions>
      </Card>
      {
        authenticated ?
          <Card className={classes.card}>
            <CardContent>
              <Typography variant="h2">
                Config
              </Typography>
              <Typography>
                LED:
                <Button onClick={setLedOn}>ON</Button>
                <Button onClick={setLedOff}>OFF</Button>
              </Typography>
            </CardContent>
          </Card> : null
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
            onChange={(e) => setPin(e.target.value)}/>
        </DialogContent>
        <DialogActions>
          <Button color="primary" onClick={doAuthenticate}>
            Authenticate
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
