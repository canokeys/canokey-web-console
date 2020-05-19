import React, {useCallback, useEffect, useState} from 'react';
import {makeStyles} from '@material-ui/core/styles';
import {useDispatch, useSelector} from "react-redux";
import Grid from "@material-ui/core/Grid";
import {useSnackbar} from "notistack";
import {connect, transceive} from "./actions";
import {byteToHexString, hexStringToByte} from "./util";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import Typography from "@material-ui/core/Typography";
import TableContainer from "@material-ui/core/TableContainer";
import Paper from "@material-ui/core/Paper";
import Table from "@material-ui/core/Table";
import TableHead from "@material-ui/core/TableHead";
import TableBody from "@material-ui/core/TableBody";
import TableRow from "@material-ui/core/TableRow";
import TableCell from "@material-ui/core/TableCell";
import CardActions from "@material-ui/core/CardActions";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import TextField from "@material-ui/core/TextField";
import DialogActions from "@material-ui/core/DialogActions";
import Select from "@material-ui/core/Select";
import MenuItem from "@material-ui/core/MenuItem";
import InputLabel from "@material-ui/core/InputLabel";
import FormControl from "@material-ui/core/FormControl";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Checkbox from "@material-ui/core/Checkbox";
import FormGroup from "@material-ui/core/FormGroup";
import IconButton from "@material-ui/core/IconButton";
import Tooltip from "@material-ui/core/Tooltip";
import StarIcon from "@material-ui/icons/Star";
import DeleteForeverIcon from "@material-ui/icons/DeleteForever";
import AddIcon from "@material-ui/icons/Add";
import AvTimerIcon from "@material-ui/icons/AvTimer";
import * as base32 from "hi-base32";

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
  },
  grid: {
    marginTop: '30px',
    marginBottom: '30px',
  }
}));

/* eslint-disable no-throw-literal */
function parseTLV(tlv) {
  let res = [];
  for (let i = 0; i < tlv.length;) {
    if (i + 1 >= tlv.length) {
      throw 'Bad TLV';
    }
    let tag = tlv[i];
    let len = tlv[i + 1];
    if (i + 1 + len >= tlv.length) {
      throw 'Bad TLV Length'
    }
    let value = tlv.slice(i + 2, i + 2 + len);
    i += len + 2;
    res.push({
      tag,
      len,
      value
    })
  }
  return res;
}

export default function Oath() {
  const classes = useStyles();
  const device = useSelector(state => state.device);
  const dispatch = useDispatch();
  const {enqueueSnackbar} = useSnackbar();
  const [entries, setEntries] = useState([]);

  // add
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [keyEncoding, setKeyEncoding] = useState('UTF-8');
  const [algo, setAlgo] = useState('HMAC-SHA1');
  const [type, setType] = useState('HOTP');
  const [onlyIncreasing, setOnlyIncreasing] = useState(false);
  const [requireTouch, setRequireTouch] = useState(false);

  const selectOathApplet = useCallback(async () => {
    if (device === null) {
      if (!await dispatch(connect())) {
        throw 'Cannot connect to Canokey';
      }
    }

    let res = await dispatch(transceive("00A4040007A0000005272101"));
    if (!res.endsWith("9000")) {
      throw 'Selecting oath applet failed';
    }
  }, [device, dispatch]);

  const fetchEntries = useCallback(async () => {
    await selectOathApplet();
    let res = await dispatch(transceive("0003000000"));
    if (!res.endsWith("9000")) {
      throw 'Failed to list OATH credentials';
    }
    let tlv = parseTLV(hexStringToByte(res.substring(0, res.length - 4)));
    if (tlv.length % 2 === 1) {
      throw 'Invalid length of TLV';
    }
    let entries = [];
    for (let i = 0; i < tlv.length; i += 2) {
      if (tlv[i].tag !== 0x71 || tlv[i + 1].tag !== 0x75) {
        throw 'Bad tag in tlv'
      }

      let rawType = tlv[i + 1].value[0] >> 4;
      let type = 'unknown';
      if (rawType === 0x1) {
        type = 'HOTP';
      } else if (rawType === 0x2) {
        type = 'TOTP';
      }

      let rawAlgo = tlv[i + 1].value[0] & 0xF;
      let algo = 'unknown';
      if (rawAlgo === 0x1) {
        algo = 'HMAC-SHA1';
      } else if (rawAlgo === 0x2) {
        algo = 'HMAC-SHA256';
      }

      entries.push({
        name: new TextDecoder("utf-8").decode(tlv[i].value),
        type,
        algo,
      })
    }
    setEntries(entries);
  }, [dispatch, selectOathApplet]);

  const refresh = useCallback(async () => {
    try {
      if (device !== null) {
        await fetchEntries();
      }
    } catch (err) {
      enqueueSnackbar(err.toString(), {variant: 'error'});
    }
  }, [device, fetchEntries, enqueueSnackbar]);

  useEffect(() => {
    (async () => {
      await refresh();
    })();
  }, [refresh]);

  let keyArray = [];
  try {
    if (keyEncoding === 'UTF-8') {
      keyArray = new TextEncoder().encode(key);
    } else if (keyEncoding === 'HEX') {
      keyArray = hexStringToByte(key);
    } else if (keyEncoding === 'Base32') {
      keyArray = base32.decode.asBytes(key);
    } else {
      throw "Unsupported key encoding";
    }
  } catch (err) {
    enqueueSnackbar(err.toString(), {variant: 'error'});
  }


  const doAdd = useCallback(async () => {
    setAddDialogOpen(false);
    try {
      await selectOathApplet();
      let data = [];
      // name
      data.push(0x71);
      let nameArray = new TextEncoder().encode(name);
      data.push(nameArray.length);
      data.push(...nameArray);
      // key
      data.push(0x73);
      data.push(keyArray.length + 2);
      let flag = 0;
      if (type === 'HOTP') {
        flag += 0x10;
      } else if (type === 'TOTP') {
        flag += 0x20;
      } else {
        throw 'invalid type';
      }
      if (algo === 'HMAC-SHA1') {
        flag += 0x01;
      } else if (algo === 'HMAC_SHA256') {
        flag += 0x02;
      } else {
        throw 'invalid algorithm';
      }
      data.push(flag);
      data.push(6); // 6 digits
      data.push(...keyArray);

      // property
      data.push(0x78);
      data.push(1);
      let property = 0;
      if (onlyIncreasing) {
        property += 0x1;
      }
      if (requireTouch) {
        property += 0x2;
      }
      data.push(property);

      // lc
      data.unshift(data.length);

      let res = await dispatch(transceive(`00010000${byteToHexString(data)}`));
      if (res.endsWith("9000")) {
        enqueueSnackbar('Add OATH credential success', {variant: 'success'});
      } else {
        enqueueSnackbar('Add OATH credential failed', {variant: 'error'});
      }
    } catch (err) {
      enqueueSnackbar(err.toString(), {variant: 'error'});
    }
    await refresh();
  }, [refresh, dispatch, name, algo, enqueueSnackbar, onlyIncreasing, requireTouch, selectOathApplet, type, keyArray]);

  const doSetDefault = useCallback(async (name) => {
    try {
      await selectOathApplet();
      let data = [];
      // name
      data.push(0x71);
      let nameArray = new TextEncoder().encode(name);
      data.push(nameArray.length);
      data.push(...nameArray);
      // lc
      data.unshift(data.length);

      let res = await dispatch(transceive(`00550000${byteToHexString(data)}`));
      if (res.endsWith("9000")) {
        enqueueSnackbar('Set OATH credential as default success', {variant: 'success'});
      } else {
        enqueueSnackbar('Set OATH credential as default failed', {variant: 'error'});
      }
    } catch (err) {
      enqueueSnackbar(err.toString(), {variant: 'error'});
    }
  }, [dispatch, enqueueSnackbar, selectOathApplet]);

  const doCalculate = useCallback(async (name) => {
    try {
      await selectOathApplet();
      let data = [];
      // name
      data.push(0x71);
      let nameArray = new TextEncoder().encode(name);
      data.push(nameArray.length);
      data.push(...nameArray);
      // challenge
      data.push(0x74);
      let epoch = Math.round(new Date().getTime() / 1000.0);
      let challenge = Math.floor(epoch / 30.0); // 30s
      // 64bit
      let str = challenge.toString(16).padStart(16, '0');
      let challengeArray = hexStringToByte(str);
      data.push(challengeArray.length);
      data.push(...challengeArray);
      // lc
      data.unshift(data.length);

      let res = await dispatch(transceive(`00040000${byteToHexString(data)}`));
      if (res.endsWith("9000")) {
        // 32bit integer
        let arr = hexStringToByte(res.substr(6, 8));
        let num = new DataView(arr.buffer).getUint32(0, false) % 1000000;
        enqueueSnackbar(`TOTP code is ${num}`, {variant: 'success'});
      } else {
        enqueueSnackbar('Calculate TOTP failed', {variant: 'error'});
      }
    } catch (err) {
      enqueueSnackbar(err.toString(), {variant: 'error'});
    }
  }, [dispatch, enqueueSnackbar, selectOathApplet]);

  const doDelete = useCallback(async (name) => {
    try {
      await selectOathApplet();
      let data = [];
      // name
      data.push(0x71);
      let nameArray = new TextEncoder().encode(name);
      data.push(nameArray.length);
      data.push(...nameArray);
      // lc
      data.unshift(data.length);

      let res = await dispatch(transceive(`00020000${byteToHexString(data)}`));
      if (res.endsWith("9000")) {
        enqueueSnackbar('Delete OATH credential success', {variant: 'success'});
      } else {
        enqueueSnackbar('Delete OATH credential failed', {variant: 'error'});
      }
    } catch (err) {
      enqueueSnackbar(err.toString(), {variant: 'error'});
    }
    await refresh();
  }, [refresh, dispatch, enqueueSnackbar, selectOathApplet]);

  const importFromClipboard = useCallback(async () => {
    try {
      let url = new URL(await navigator.clipboard.readText());
      if (url.protocol !== 'otpauth:') {
        throw 'Clipboard text is not a otpauth link';
      }

      if (url.searchParams.get("algorithm") === 'SHA1') {
        setAlgo("HMAC-SHA1");
      } else if (url.searchParams.get("algorithm") === 'SHA256') {
        setAlgo("HMAC-SHA256");
      } else if (url.searchParams.get("algorithm") !== null) {
        throw 'Unsupported algorithm';
      }

      if (url.pathname.startsWith("//totp")) {
        setType("TOTP");
      } else if (url.pathname.startsWith("hotp")) {
        setType("HOTP");
      } else {
        throw 'Unsupproted type';
      }

      setKey(url.searchParams.get("secret"));
      setKeyEncoding("Base32");
      console.log(url);
    } catch (err) {
      enqueueSnackbar(err.toString(), {variant: 'error'});
    }
  }, [enqueueSnackbar]);

  return (
    <div className={classes.root}>
      <Grid container spacing={1} justify={"center"} className={classes.grid}>
        <Grid item xs={10}>
          <Card>
            <CardContent>
              <Typography variant="h3">
                OATH Applet
              </Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        Name
                      </TableCell>
                      <TableCell>
                        Type
                      </TableCell>
                      <TableCell>
                        Algorithm
                      </TableCell>
                      <TableCell>
                        Action
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {entries.map((entry) => (
                      <TableRow key={entry.name}>
                        <TableCell>
                          {entry.name}
                        </TableCell>
                        <TableCell>
                          {entry.type}
                        </TableCell>
                        <TableCell>
                          {entry.algo}
                        </TableCell>
                        <TableCell>
                          {
                            entry.type === 'HOTP' ?
                              <Tooltip title="Set as default">
                                <IconButton onClick={() => doSetDefault(entry.name)}>
                                  <StarIcon/>
                                </IconButton>
                              </Tooltip>
                              :
                              <Tooltip title="Calculate TOTP">
                                <IconButton onClick={() => doCalculate(entry.name)}>
                                  <AvTimerIcon/>
                                </IconButton>
                              </Tooltip>
                          }
                          <Tooltip title="Delete forever">
                            <IconButton onClick={() => doDelete(entry.name)}>
                              <DeleteForeverIcon/>
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                    {entries.length === 0 ?
                      <TableRow>
                        <TableCell rowSpan={4}>
                          {device !== null ? 'No entries' : 'Please connect to device first'}
                        </TableCell>
                      </TableRow>
                      : null
                    }
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
            <CardActions>
              <Tooltip title="Add a new OATH credential">
                <IconButton onClick={() => setAddDialogOpen(true)}>
                  <AddIcon/>
                </IconButton>
              </Tooltip>
            </CardActions>
          </Card>
        </Grid>
      </Grid>
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)}>
        <DialogTitle>Add credential to OATH Applet</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Set OATH credential info below
          </DialogContentText>
          <FormGroup col>
            <TextField
              fullWidth
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}/>
            <TextField
              fullWidth
              label="Key"
              value={key}
              onChange={(e) => setKey(e.target.value)}>
            </TextField>
            <FormControl>
              <InputLabel id="encoding-label">Key Encoding</InputLabel>
              <Select labelId="encoding-label" value={keyEncoding} onChange={(e) => setKeyEncoding(e.target.value)}>
                <MenuItem value="UTF-8">UTF-8</MenuItem>
                <MenuItem value="HEX">HEX</MenuItem>
                <MenuItem value="Base32">Base32</MenuItem>
              </Select>
            </FormControl>
            <FormControl>
              <InputLabel id="algo-label">Algorithm</InputLabel>
              <Select labelId="algo-label" value={algo} onChange={(e) => setAlgo(e.target.value)}>
                <MenuItem value={"HMAC-SHA1"}>HMAC-SHA1</MenuItem>
                <MenuItem value={"HMAC-SHA256"}>HMAC-SHA256</MenuItem>
              </Select>
            </FormControl>
            <FormControl>
              <InputLabel id="type-label">Type</InputLabel>
              <Select labelId="type-label" value={type} onChange={(e) => setType(e.target.value)}>
                <MenuItem value={"HOTP"}>HOTP</MenuItem>
                <MenuItem value={"TOTP"}>TOTP</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Checkbox
                  checked={onlyIncreasing}
                  onChange={(e) => setOnlyIncreasing(e.target.checked)}
                />
              }
              label="Only increasing"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={requireTouch}
                  onChange={(e) => setRequireTouch(e.target.checked)}
                />
              }
              label="Require touch"
            />
          </FormGroup>
          <Typography>
            Key in hex: {byteToHexString(keyArray)}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" color="secondary" onClick={importFromClipboard}>
            Import Otpauth from Clipboard
          </Button>
          <Button variant="contained" color="primary" onClick={doAdd}>
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
