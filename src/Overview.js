import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { makeStyles } from '@material-ui/core/styles';
import { transceive } from './actions';

const useStyles = makeStyles((theme) => ({
    root: {
        flexGrow: 1,
    },
}));

export default function Overview() {
    const classes = useStyles();
    const device = useSelector(state => state.device);
    const dispatch = useDispatch();

    useEffect(() => {
        (async () => {
            if (device !== null) {
                let res = dispatch(transceive("00A4040005F000000000"));
            } else {
                console.log('device is not open');
            }
        })();
    }, [device, dispatch]);

    return (
        <div className={classes.root}>
            {device ? 'connected' : 'disconnected'}
        </div>
    );
}