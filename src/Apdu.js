import React, {useCallback, useState} from 'react';
import {makeStyles} from '@material-ui/core/styles';
import {useDispatch, useSelector} from "react-redux";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import Typography from "@material-ui/core/Typography";
import TextField from "@material-ui/core/TextField";
import Grid from "@material-ui/core/Grid";
import CardActions from "@material-ui/core/CardActions";
import {connect, transceive} from "./actions";
import {useSnackbar} from "notistack";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import SyncAltIcon from '@material-ui/icons/SyncAlt';
import SendIcon from "@material-ui/icons/Send";
import {byteToHexString} from "./util";
import Tooltip from "@material-ui/core/Tooltip";
import IconButton from "@material-ui/core/IconButton";

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
  },
  grid: {
    marginLeft: '10%',
    marginRight: '10%',
  }
}));

function verifyApdu(capdu) {
  let apduArray = [];
  let half = false;
  let halfByte = 0;
  for (let i = 0; i < capdu.length; i += 1) {
    // skip spaces
    if (capdu.substr(i, 1) === ' ') {
      continue;
    }
    let num = parseInt(capdu.substr(i, 1), 16);
    if (0 <= num && num < 16) {
      if (half) {
        apduArray.push((halfByte * 16) + num);
        half = false;
      } else {
        halfByte = num;
        half = true
      }
    } else {
      return {
        error: true,
        errorMsg: `invalid hex: ${capdu.substr(i, 1)}`
      }
    }
  }
  if (half) {
    return {
      error: true,
      errorMsg: 'invalid hex string'
    }
  }

  if (apduArray.length < 4) {
    return {
      error: true,
      errorMsg: 'apdu should have at least four bytes long'
    }
  }

  let cla = apduArray[0];
  let ins = apduArray[1];
  let p1 = apduArray[2];
  let p2 = apduArray[3];
  let nc = 0;
  let ne = 0;
  let data = null;

  if (apduArray.length === 4) {
    // no lc or le
  } else if (apduArray.length === 5) {
    // case 2s
    // only one byte le
    ne = apduArray[4];
    if (ne === 0) {
      ne = 255;
    }
  } else if (apduArray[4] > 0 && apduArray.length === 5 + apduArray[4]) {
    // case 3s
    // only one byte lc
    nc = apduArray[4];
    data = apduArray.slice(5);
    ne = 0;
  } else if (apduArray[4] > 0 && apduArray.length === 6 + apduArray[4]) {
    // case 4s
    // one byte lc + one byte le
    nc = apduArray[4];
    data = apduArray.slice(5, 5 + nc);
    ne = apduArray[5 + nc];
    if (ne === 0) {
      ne = 255;
    }
  } else if (apduArray.length === 7) {
    // case 2e
    // only three bytes of le, first of which is zero
    if (apduArray[4] !== 0) {
      return {
        error: true,
        errorMsg: 'the first byte of three-byte le field cannot be non-zero'
      };
    }
    ne = apduArray[5] * 256 + apduArray[6];
  } else {
    // case 3e & r3
    // three bytes of lc
    if (apduArray[4] !== 0) {
      return {
        error: true,
        errorMsg: 'the first byte of three-byte lc field cannot be non-zero'
      };
    }
    nc = apduArray[5] * 256 + apduArray[6];
    if (nc === 0) {
      return {
        error: true,
        errorMsg: 'three-byte lc field cannot be zero'
      };
    }

    if (apduArray.length === 7 + nc) {
      // case 3e
      // only three bytes of lc
      data = apduArray.slice(7);
      ne = 0;
    } else if (apduArray.length === 9 + nc) {
      // case 4e
      // three bytes of lc and two bytes of le
      data = apduArray.slice(7, 7 + nc);
      ne = apduArray[7 + nc] * 256 + apduArray[8 + nc];
      if (ne === 0) {
        ne = 0x10000;
      }
    } else {
      return {
        error: true,
        errorMsg: 'not in any possible case of apdu'
      };
    }
  }

  return {
    parsedApdu: {
      cla,
      ins,
      p1,
      p2,
      nc,
      ne,
      data
    },
  }

}

/* eslint-disable no-throw-literal */
export default function Apdu() {
  const classes = useStyles();
  const device = useSelector(state => state.device);
  const dispatch = useDispatch();
  const [apdu, setApdu] = useState('');
  const [resp, setResp] = useState('');
  const {enqueueSnackbar} = useSnackbar();
  const apduHistory = useSelector(state => state.apduLog);

  let {parsedApdu, error, errorMsg} = verifyApdu(apdu);

  const sendApdu = useCallback(async () => {
    try {
      if (device === null) {
        if (!await dispatch(connect())) {
          throw 'Cannot connect to CanoKey';
        }
      }

      let capdu = apdu.replace(/\s/g, '');
      setResp(await dispatch(transceive(capdu)));
      enqueueSnackbar('Command APDU sent', {variant: 'success'});
    } catch (err) {
      enqueueSnackbar(err.toString(), {variant: 'error'});
    }
  }, [device, apdu, dispatch, enqueueSnackbar]);

  return (
    <div className={classes.root}>
      <Grid container spacing={1} justify={"center"}>
        <Grid item xs={5}>
          <Card>
            <CardContent>
              <Typography variant="h4">
                Send Command APDU
              </Typography>
              <TextField
                autoFocus
                fullWidth
                placeholder="Input APDU here"
                error={error}
                helperText={errorMsg}
                onChange={(e) => setApdu(e.target.value)}/>
              {
                parsedApdu ?
                  <div>
                    <Typography>
                      CLA: {byteToHexString([parsedApdu.cla])}
                    </Typography>
                    <Typography>
                      INS: {byteToHexString([parsedApdu.ins])}
                    </Typography>
                    <Typography>
                      P1: {byteToHexString([parsedApdu.p1])}
                    </Typography>
                    <Typography>
                      P2: {byteToHexString([parsedApdu.p2])}
                    </Typography>
                    {
                      parsedApdu.data ?
                        <Typography>
                          Command Data: {byteToHexString(parsedApdu.data)}
                        </Typography> : null
                    }
                    <Typography>
                      N<sub>e</sub> (Maximum response bytes): {parsedApdu.ne.toString(16)}
                    </Typography>
                  </div> : null
              }
              {
                resp ?
                  <Typography>
                    Resp: {resp}
                  </Typography> : null
              }
            </CardContent>
            <CardActions>
              <Tooltip title="Send APDU">
                <IconButton onClick={sendApdu}>
                  <SendIcon/>
                </IconButton>
              </Tooltip>
            </CardActions>
          </Card>
        </Grid>
        <Grid item xs={5}>
          <Card>
            <CardContent>
              <Typography variant="h4">
                APDU History
              </Typography>
              <Typography>
                From earliest to latest
              </Typography>
              <List>
                {
                  apduHistory.map((entry) => {
                    return <ListItem key={entry}>
                      <ListItemAvatar>
                        <SyncAltIcon/>
                      </ListItemAvatar>
                      <ListItemText primary={`Command: ${entry.capdu}`} secondary={`Response: ${entry.rapdu}`}/>
                    </ListItem>;
                  })
                }
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </div>
  );
}
