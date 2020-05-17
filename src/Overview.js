import React, {useEffect, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {makeStyles} from '@material-ui/core/styles';
import {transceive} from './actions';
import Typography from "@material-ui/core/Typography";
import {hexStringToString} from "./util";

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
  },
}));

export default function Overview() {
  const classes = useStyles();
  const device = useSelector(state => state.device);
  const dispatch = useDispatch();
  const [version, setVersion] = useState("unknown");

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
      <Typography>
        Version: {version}
      </Typography>
    </div>
  );
}
