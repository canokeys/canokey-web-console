import React, {useEffect, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {makeStyles} from '@material-ui/core/styles';
import {transceive} from './actions';
import {useHistory} from 'react-router-dom';
import Typography from "@material-ui/core/Typography";
import {hexStringToString} from "./util";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import CardActions from "@material-ui/core/CardActions";
import Button from "@material-ui/core/Button";

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
    paddingLeft: "10%",
    paddingRight: "10%",
    paddingTop: "50px",
  },
}));

export default function Overview() {
  const classes = useStyles();
  const device = useSelector(state => state.device);
  const dispatch = useDispatch();
  const [version, setVersion] = useState("Unknown");
  const history = useHistory();

  useEffect(() => {
    (async () => {
      if (device !== null) {
        let res = await dispatch(transceive("00A4040005F000000000"));
        if (!res.endsWith("9000")) {
          return;
        }
        res = await dispatch(transceive("0031000000"));
        if (res.endsWith("9000")) {
          let version = hexStringToString(res.substring(0, res.length - 4));
          setVersion(version);
        }
      } else {
        console.log('device is not open');
      }
    })();
  }, [device, dispatch]);

  return (
    <div className={classes.root}>
      <Card>
        <CardContent>
          <Typography variant="h2">
            Canokey Info
          </Typography>
          <Typography>
            Connected: {device !== null ? 'true' : 'false'}
          </Typography>
          <Typography>
            Firmware Version: {version}
          </Typography>
          <Typography>
            Manufacturer: {device !== null ? device.manufacturerName : 'Unknown'}
          </Typography>
          <Typography>
            Product: {device !== null ? device.productName : 'Unknown'}
          </Typography>
          <Typography>
            Serial Number: {device !== null ? device.serialNumber : 'Unknown'}
          </Typography>
          <Typography>
            USB Version: {device !== null ? `${device.usbVersionMajor}:${device.usbVersionMinor}` : 'Unknown'}
          </Typography>
        </CardContent>
        <CardActions>
          <Button onClick={() => history.push('/admin')}>Admin</Button>
          <Button>Webauthn (FIDO2)</Button>
          <Button onClick={() => history.push('/oath')}>OATH</Button>
          <Button>OpenPGP</Button>
          <Button>PIV</Button>
        </CardActions>
      </Card>
    </div>
  );
}
