import React, {useCallback, useState} from 'react';
import {makeStyles} from '@material-ui/core/styles';
import {useDispatch, useSelector} from "react-redux";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import Typography from "@material-ui/core/Typography";
import TextField from "@material-ui/core/TextField";
import Grid from "@material-ui/core/Grid";
import CardActions from "@material-ui/core/CardActions";
import Button from "@material-ui/core/Button";
import {transceive} from "./actions";

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
        apduArray.push((halfByte * 4) + num);
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

export default function Apdu() {
  const classes = useStyles();
  const device = useSelector(state => state.device);
  const dispatch = useDispatch();
  const [apdu, setApdu] = useState('');
  const [resp, setResp] = useState('');

  let {parsedApdu, error, errorMsg} = verifyApdu(apdu);

  const sendApdu = useCallback(async () => {
    let capdu = apdu.replace(/\s/g, '');
    setResp(await dispatch(transceive(capdu)));
  }, [device, apdu]);

  return (
    <div className={classes.root}>
      <Grid container className={classes.grid} spacing={1}>
        <Grid item xs={6}>
          <Card>
            <CardContent>
              <Typography variant="h3">
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
                      CLA: {parsedApdu.cla.toString(16)}
                    </Typography>
                    <Typography>
                      INS: {parsedApdu.ins.toString(16)}
                    </Typography>
                    <Typography>
                      P1: {parsedApdu.p1.toString(16)}
                    </Typography>
                    <Typography>
                      P2: {parsedApdu.p2.toString(16)}
                    </Typography>
                    {
                      parsedApdu.data ?
                        <Typography>
                          Command Data: {parsedApdu.data.toString(16)}
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
              <Button onClick={sendApdu}>
                Send
              </Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>
    </div>
  );
}
