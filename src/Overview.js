import React, {useEffect, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {makeStyles} from '@material-ui/core/styles';
import {setModel, transceive} from './actions';
import {useHistory} from 'react-router-dom';
import Typography from "@material-ui/core/Typography";
import {hexStringToString} from "./util";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import CardActions from "@material-ui/core/CardActions";
import Button from "@material-ui/core/Button";
import {useSnackbar} from "notistack";
import Grid from "@material-ui/core/Grid";

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
    paddingLeft: "10%",
    paddingRight: "10%",
    paddingTop: "50px",
  },
  card: {
    height: 150,
  }
}));

export default function Overview() {
  const classes = useStyles();
  const device = useSelector(state => state.device);
  const model = useSelector(state => state.model);
  const dispatch = useDispatch();
  const [sn, setSn] = useState("Unknown");
  const [id, setId] = useState("Unknown");
  const [firmwareVersion, setFirmwareVersion] = useState("Unknown");
  const history = useHistory();
  const {enqueueSnackbar} = useSnackbar();

  useEffect(() => {
    (async () => {
      if (device !== null) {
        try {
          let res = await dispatch(transceive("00A4040005F000000000"));
          if (!res.endsWith("9000")) {
            return;
          }
          res = await dispatch(transceive("0031000000"));
          if (res.endsWith("9000")) {
            let version = hexStringToString(res.substring(0, res.length - 4));
            setFirmwareVersion(version);
          }
          res = await dispatch(transceive("0031010000"));
          if (res.endsWith("9000")) {
            let model = hexStringToString(res.substring(0, res.length - 4));
            dispatch(setModel(model));
          }
          res = await dispatch(transceive("0032000000"));
          if (res.endsWith("9000")) {
            let sn = res.substring(0, res.length - 4);
            setSn(sn);
          }
          res = await dispatch(transceive("0032010000"));
          if (res.endsWith("9000")) {
            let id = res.substring(0, res.length - 4);
            setId(id);
          }
        } catch (err) {
          enqueueSnackbar(`Failed to get CanoKey version: ${err}`, {variant: "error"});
        }
      }
    })();
  }, [enqueueSnackbar, device, dispatch]);

  return (
    <div className={classes.root}>
      <Grid container justify={"center"} spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h2">
                CanoKey Info
              </Typography>
              <Typography>
                Connected: {device !== null ? 'true' : 'false'}
              </Typography>
              <Typography>
                {device !== null ? `Model: ${model}` : null}
              </Typography>
              <Typography>
                {device !== null ? `Serial Number: ${sn}` : null}
              </Typography>
              <Typography>
                {device !== null ? `Chip ID: ${id}` : null}
              </Typography>
              <Typography>
                {device !== null ? `Firmware Version: ${firmwareVersion}` : null}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent className={classes.card}>
              <Typography variant="h4">
                Admin
              </Typography>
              <Typography>
                Admin applet manages your CanoKey.
              </Typography>
            </CardContent>
            <CardActions>
              <Button onClick={() => history.push('/admin')}>Go</Button>
            </CardActions>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent className={classes.card}>
              <Typography variant="h4">
                OATH
              </Typography>
              <Typography>
                CanoKey implements a custom OATH (Open AuTHentication) applet.
              </Typography>
            </CardContent>
            <CardActions>
              <Button onClick={() => history.push('/oath')}>Go</Button>
            </CardActions>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent className={classes.card}>
              <Typography variant="h4">
                OpenPGP
              </Typography>
              <Typography>
                CanoKey implements OpenPGP standard.
              </Typography>
            </CardContent>
            <CardActions>
              <Button onClick={() => history.push('/openpgp')}>Go</Button>
            </CardActions>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent className={classes.card}>
              <Typography variant="h4">
                PIV
              </Typography>
              <Typography>
                CanoKey implements PIV standard.
              </Typography>
            </CardContent>
            <CardActions>
              <Button onClick={() => history.push('/piv')}>Go</Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>
    </div>
  );
}
