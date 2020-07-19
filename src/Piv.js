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
import CardActions from "@material-ui/core/CardActions";
import Button from "@material-ui/core/Button";
import ButtonGroup from "@material-ui/core/ButtonGroup";
import Dialog from "@material-ui/core/Dialog";
import AppBar from '@material-ui/core/AppBar';
import PropTypes from 'prop-types';
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import TextField from "@material-ui/core/TextField";
import DialogActions from "@material-ui/core/DialogActions";
import Select from "@material-ui/core/Select";
import MenuItem from "@material-ui/core/MenuItem";
import InputLabel from "@material-ui/core/InputLabel";
import FormControl from "@material-ui/core/FormControl";
import FormGroup from "@material-ui/core/FormGroup";
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import base64url from "base64url";
import Box from '@material-ui/core/Box';
import x509 from 'js-x509-utils'
import keyutil from 'js-crypto-key-utils';
import jseu from 'js-encoding-utils';


const useStyles = makeStyles((theme) => ({
    root: {
        flexGrow: 1,
        paddingLeft: "10%",
        paddingRight: "10%",
        paddingTop: "50px",
    },
    card: {
        marginLeft: "5%",
        marginRight: "5%",
        marginTop: "30px",
    },
    buttonGroup:{
        margin:'10px',
    },
    button:{
        margin:'10px',
    },
    grid: {
        marginTop: '30px',
        marginBottom: '30px',
    }
}));

function TabPanel(props) {
    const { children, value, index, ...other } = props;

    return (
        <span
            role="tabpanel"
            hidden={value !== index}
            id={`scrollable-force-tabpanel-${index}`}
            aria-labelledby={`scrollable-force-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box p={3}>
                    <Typography>{children}</Typography>
                </Box>
            )}
        </span>
    );
}

TabPanel.propTypes = {
    children: PropTypes.node,
    index: PropTypes.any.isRequired,
    value: PropTypes.any.isRequired,
};

function a11yProps(index) {
    return {
        id: `scrollable-force-tab-${index}`,
        'aria-controls': `scrollable-force-tabpanel-${index}`,
    };
}



export default function Piv() {
    const classes = useStyles();
    const device = useSelector(state => state.device);
    const dispatch = useDispatch();
    const {enqueueSnackbar} = useSnackbar();
    const [tabValue, setTabValue] = React.useState(0);
    const [chPinDialogOpen, setChPinDialogOpen] = useState(false);
    const [chMKDialogOpen, setChMKDialogOpen] = useState(false);
    const [oldPin, setOldPin] = useState("");
    const [newPin, setNewPin] = useState("");
    const [nowMK, setnowMK] = useState("");
    const [newMK, setNewMK] = useState("");
    const [MKValid, setMKValid] = useState(true);  //set to false after test
    const [MKAuthenDialogOpen,setMKAuthenDialogOpen] = useState(false);
    const [importCrtDialogOpen, setImportCrtDialogOpen] = useState(false);
    const [creatCrtDialogOpen, setCreatCrtDialogOpen] = useState(false);
    const [importKeyDialogOpen, setImportKeyDialogOpen] = useState(false);
    const [algo, setAlgo] = useState('ECC-P-256');
    const [country, setCountry] = useState('CN');
    const [province, setProvince] = useState('Beijing');
    const [locality, setLocality] = useState('Chiyoda');
    const [organization, setOrganization] = useState('example');
    const [organizationUnit, setOrganizationUnit] = useState('Research');
    const [common, setCommon] = useState('example.com');
    const [keyPem, setKeyPem] = useState('')
    const [ownCrt, setOwnCrt] = useState(false)
    const [keyAlgo, setKeyAlgo] = useState('RSA')

    let slotPosition = '9a';
    switch(tabValue) {
        case 0:
            slotPosition = '9a';
            break;
        case 1:
            slotPosition = '9c';
            break;
        case 2:
            slotPosition = '9d';
            break;
        case 3:
            slotPosition = '9e';
            break;
        default:
            slotPosition = '9a';
            break;
    }
    const slotMap = {'9a':'5fc105', '9c':'5fc101', '9d':'5fc10a', '9e':'5fc10b'}

    const selectPivApplet = useCallback(async () => {
        if (device === null) {
            if (!await dispatch(connect())) {
                throw new Error('Cannot connect to Canokey');
            }
        }
        let res = await dispatch(transceive("00A4040009A00000030800001000"));
        if (!res.endsWith("9000")) {
            throw new Error('Selecting piv applet failed');
        }
    }, [device, dispatch]);

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };
    const onImportKey = useCallback(() => {
        setImportKeyDialogOpen(true);
    }, []);



    const doImportKey = useCallback(async()=>{
        setImportKeyDialogOpen(false);
        try{
            if(keyAlgo==='RSA'){
                const keyObj = new keyutil.Key('pem',keyPem);
                let jwk = await keyObj.export('jwk');

                let dataString = ''
                const rsaP = base64url.toBuffer(jwk['p']).toString('hex');
                dataString = dataString + '018180' + rsaP

                const rsaQ = base64url.toBuffer(jwk['q']).toString('hex');
                dataString = dataString + '028180' + rsaQ


                const rsaDp = base64url.toBuffer(jwk['dp']).toString('hex');
                dataString = dataString + '038180' + rsaDp

                const rsaDq = base64url.toBuffer(jwk['dq']).toString('hex');
                dataString = dataString + '048180'+ rsaDq


                const rsaQinv = base64url.toBuffer(jwk['qi']).toString('hex');
                dataString = dataString + '058180'+ rsaQinv

                let res = await dispatch(transceive(`00fe07${slotPosition}00028f${dataString}`));
                if (res.endsWith("9000")) {
                    enqueueSnackbar(slotPosition+':RSA key import succeed', {variant: 'success'});
                } else {
                    enqueueSnackbar(slotPosition+':RSA key import failed', {variant: 'error'});
                }
            }else{
                const ECKey = require('ec-key');
                let key = new ECKey(keyPem, 'pem');
                let algoFlag = key.toJSON()['crv'];
                let priKey = base64url.toBuffer(key.toJSON()['d']).toString('hex');
                let res = ''
                if(algoFlag.startsWith('P-256')){
                    res = await dispatch(transceive(`00fe11${slotPosition}220620${priKey}`));
                }
                else if(algoFlag.startsWith('P-384')){
                    res = await dispatch(transceive(`00fe14${slotPosition}320630${priKey}`));
                }
                if (res.endsWith("9000")) {
                    enqueueSnackbar(slotPosition+':ECC key import succeed', {variant: 'success'});
                } else {
                    enqueueSnackbar(slotPosition+':ECC key import failed', {variant: 'error'});
                }
            }
        }catch (err) {
            enqueueSnackbar(err.toString(), {variant: 'error'});
        }
    },[keyPem, slotPosition, enqueueSnackbar, dispatch, keyAlgo]);

    const onKeyPressImportKey = useCallback(async (e) => {
        if (e.key === 'Enter') {
            await doImportKey();
        }
    },[doImportKey]);

    const refresh = useCallback(async () => {
        try {
            if (device !== null && MKValid) {
                let res = await dispatch(transceive(`00cb3fff0000055c03${slotMap[slotPosition]}`));

                if (res.endsWith("9000")) {
                    setOwnCrt(true);
                } else {
                    setOwnCrt(false);
                }

            }
        } catch (err) {
            enqueueSnackbar(err.toString(), {variant: 'error'});
        }
    }, [device, enqueueSnackbar, MKValid, dispatch, slotMap, slotPosition]);

    useEffect(() => {
        (async () => {
            await refresh();
        })();
    }, [refresh]);

    const doExportCrt = useCallback(async()=>{
        try{
            let res = await dispatch(transceive(`00cb3fff0000055c03${slotMap[slotPosition]}`));

            if (res.endsWith("9000")) {
                enqueueSnackbar(slotPosition+':Certificate export succeed', {variant: 'success'});
            } else {
                enqueueSnackbar(slotPosition+':Certificate export failed', {variant: 'error'});
            }
            res = res.substr(8,res.length - 12);
            const pemCrt = jseu.formatter.binToPem(hexStringToByte(res),'certificate')
            let FileSaver = require('file-saver');
            let blob = new Blob([pemCrt], {type: "text/plain;charset=utf-8"});
            FileSaver.saveAs(blob, "newCertificate.crt");
        }catch (err) {
            enqueueSnackbar(err.toString(), {variant: 'error'});
        }

    },[slotPosition, enqueueSnackbar, dispatch, slotMap]);


    const doDeleteCrt = useCallback(async()=>{
        try{
            let res = await dispatch(transceive(`00db3fff055c03${slotMap[slotPosition]}`));
            if (res.endsWith("9000")) {
                enqueueSnackbar(slotPosition+':Certificate delete succeed', {variant: 'success'});
                setOwnCrt(false);
            } else {
                enqueueSnackbar(slotPosition+':Certificate delete failed', {variant: 'error'});
            }


        }catch (err) {
            enqueueSnackbar(err.toString(), {variant: 'error'});
        }


    },[slotPosition, enqueueSnackbar, dispatch, slotMap]);



    const doCreateCrt = useCallback(async () => {
        setCreatCrtDialogOpen(false);
        try{
            //creat key

            let keyRes = '';
            let publicJwk = {}

            if(algo==='RSA-2048'){
                keyRes = await dispatch(transceive(`004700${slotPosition}000005AC03800107`));
                if (keyRes.endsWith("9000")) {
                    enqueueSnackbar('Creat key success', {variant: 'success'});
                } else {
                    enqueueSnackbar('Creat key failed', {variant: 'error'});
                    return;
                }
                let modulus = base64url(Buffer.from(hexStringToByte(keyRes.substr(18,512))));
                let exponent = base64url(Buffer.from(hexStringToByte(keyRes.substr(534,8))));
                publicJwk = {kty: 'RSA', n: modulus, e: exponent};

            }else {
                keyRes = await dispatch(transceive(`004700${slotPosition}05AC038001${algo==='ECC-P-256'? '11':'14'}`));
                if (keyRes.endsWith("9000")) {
                    enqueueSnackbar(slotPosition+':Creat key success', {variant: 'success'});
                } else {
                    enqueueSnackbar(slotPosition+':Creat key failed', {variant: 'error'});
                    return;
                }
                if(algo==='ECC-P-256')
                {
                    keyRes = keyRes.substr(12,128);
                    let xByte = hexStringToByte(keyRes.substr(0,64));
                    let yByte = hexStringToByte(keyRes.substr(64,64));
                    const xBuf = Buffer.from(xByte);
                    const yBuf = Buffer.from(yByte);
                    let xBase64 = base64url(xBuf)
                    let yBase64 = base64url(yBuf)
                    publicJwk ={"kty":"EC", "crv":"P-256", "x":xBase64, "y":yBase64};
                }
                else{
                    keyRes = keyRes.substr(12,192);
                    let xByte = hexStringToByte(keyRes.substr(0,96));
                    let yByte = hexStringToByte(keyRes.substr(96,96));
                    const xBuf = Buffer.from(xByte);
                    const yBuf = Buffer.from(yByte);
                    let xBase64 = base64url(xBuf)
                    let yBase64 = base64url(yBuf)
                    publicJwk ={"kty":"EC", "crv":"P-384", "x":xBase64, "y":yBase64};
                }

            }


            const privateJwk = {"kty":"EC",
                "crv":"P-256",
                "x":"MKBCTNIcKUSDii11ySs3526iDZ8AiTo7Tu6KPAqv7D4",
                "y":"4Etl6SRW2YiLUrN5vfvVHuhp7x8PxltmWWlbbM4IFyM",
                "d":"870MB6gfuTJ4HtUnUvYMyJpr5eUZNP4Bk43bVdj3eAE"};

            const name = {
                countryName: country,
                stateOrProvinceName: province,
                organizationName: organization,
                organizationalUnitName: organizationUnit,
                commonName: common
            };

            x509.fromJwk(
                publicJwk,
                privateJwk,
                'der',
                {
                    signature: 'ecdsa-with-sha256',   // 'sha256WithRSAEncryption',
                    days: 365,
                    issuer: name,
                    subject: name
                }
            ).then(async (crt) => {
                // now you get a certificate
                const derCrt = byteToHexString(crt);
                const outerLength = (derCrt.length/2+9).toString(16).padStart(6,'0');
                const innerLength = (derCrt.length/2).toString(16).padStart(4,'0');
                let res = await dispatch(transceive(`00db3fff${outerLength}5c03${slotMap[slotPosition]}5382${innerLength}${derCrt}`));
                if (res.endsWith("9000")) {
                    enqueueSnackbar(slotPosition+':Certificate creat succeed', {variant: 'success'});
                    setOwnCrt(true);

                } else {
                    enqueueSnackbar(slotPosition+':Certificate creat failed', {variant: 'error'});
                }

            });

        }catch (err) {
            enqueueSnackbar(err.toString(), {variant: 'error'});
        }
        }, [slotPosition, country, province, organization, organizationUnit, common,algo, enqueueSnackbar, dispatch, slotMap]
    );
    const onImportCrt = useCallback(() => {
        setImportCrtDialogOpen(true);
    }, []);

    const doImportCrt = useCallback(async () => {
        setImportCrtDialogOpen(false);
        let file = document.getElementById("file").files[0];
        let reader = new FileReader();
        try {
            reader.readAsText(file);
            reader.onload=async function(e){
                const binCrt = jseu.formatter.pemToBin(e.target.result);
                const derCrt = byteToHexString(binCrt);
                const outerLength = (derCrt.length/2+9).toString(16).padStart(6,'0');
                const innerLength = (derCrt.length/2).toString(16).padStart(4,'0');
                let res = await dispatch(transceive(`00db3fff${outerLength}5c03${slotMap[slotPosition]}5382${innerLength}${derCrt}`));
                if (res.endsWith("9000")) {
                    enqueueSnackbar(slotPosition+':Certificate import succeed', {variant: 'success'});
                    setOwnCrt(true);
                } else {
                    enqueueSnackbar(slotPosition+':Certificate import failed', {variant: 'error'});
                }

            };

        } catch (err) {
            enqueueSnackbar(err.toString(), {variant: 'error'});
        }
    }, [slotPosition, dispatch, enqueueSnackbar, slotMap]);

    const onChangePin = useCallback(() => {
        setChPinDialogOpen(true);
    }, []);

    const doChangePin = useCallback(async () => {
        setChPinDialogOpen(false);
        try {
            let oldArray = new TextEncoder().encode(oldPin);
            let oldHexString = byteToHexString(oldArray).padEnd(16,"f")
            let newArray = new TextEncoder().encode(newPin);
            let newHexString = byteToHexString(newArray).padEnd(16,"f")
            await selectPivApplet();
            let res = await dispatch(transceive(`0024008010${oldHexString}${newHexString}`, true));
            if (res.endsWith("9000")) {
                enqueueSnackbar('PIN changed', {variant: 'success'});
            } else {
                enqueueSnackbar('Change PIN failed', {variant: 'error'});
            }
        } catch (err) {
            enqueueSnackbar(err.toString(), {variant: 'error'});
        }
    }, [newPin,oldPin, dispatch, enqueueSnackbar, selectPivApplet]);

    const onKeyPressChPin = useCallback(async (e) => {
        if (e.key === 'Enter') {
            await doChangePin();
        }
    }, [doChangePin]);

    const onChangeMK = useCallback(() => {
        setChMKDialogOpen(true);
    }, []);

    const doChangeMK = useCallback(async () => {
        setChMKDialogOpen(false);
        try {
            await selectPivApplet();
            let res = await dispatch(transceive(`00ffffff1b039b18${newMK}`, true));
            if (res.endsWith("9000")) {
                enqueueSnackbar('MK changed', {variant: 'success'});
            } else {
                enqueueSnackbar('Change MK failed', {variant: 'error'});
            }
        } catch (err) {
            enqueueSnackbar(err.toString(), {variant: 'error'});
        }
    }, [newMK, dispatch, enqueueSnackbar, selectPivApplet]);

    const onKeyPressChMK = useCallback(async (e) => {
        if (e.key === 'Enter') {
            await doChangeMK();
        }
    }, [doChangeMK]);

    const onMKAuthen = useCallback(() => {
        setMKAuthenDialogOpen(true);
    }, []);

    const doMKAuthen = useCallback(async () => {
        setMKAuthenDialogOpen(false);
        try {
            let Array = await new TextEncoder().encode(oldPin);
            let HexString = await byteToHexString(Array).padEnd(16,"f")
            let pinVarify = false;
            let MKVarify = false;
            await selectPivApplet();
            let pinRes = await dispatch(transceive(`0020008008${HexString}`,true));
            if (pinRes.endsWith("9000")) {
                enqueueSnackbar('PIN verified', {variant: 'success'});
                pinVarify = true;
            } else {
                enqueueSnackbar('Verify PIN failed', {variant: 'error'});
                pinVarify = false;
            }

            let challengeRes = await dispatch(transceive(`0087009b047c02810000`));
            let challenge = challengeRes.substr(8,16);

            let CryptoJS = require("crypto-js");
            let encrypted = CryptoJS.TripleDES.encrypt(CryptoJS.enc.Hex.parse(challenge),
                CryptoJS.enc.Hex.parse(nowMK),
                { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.NoPadding }).ciphertext.toString();

            let res = await dispatch(transceive(`0087009b0c7c0a8208${encrypted}`));
            if (res.endsWith("9000")) {
                enqueueSnackbar('MK verification success', {variant: 'success'});
                MKVarify = true;
            } else {
                enqueueSnackbar('MK verification failed', {variant: 'error'});
                MKVarify = false;
            }
            if(pinVarify&&MKVarify)
                setMKValid(true);
            else setMKValid(false);
        } catch (err) {
            enqueueSnackbar(err.toString(), {variant: 'error'});
        }
    }, [oldPin, nowMK, dispatch, enqueueSnackbar, selectPivApplet]);

    const onKeyPressMKAuthen = useCallback(async (e) => {
        if (e.key === 'Enter') {
            await doMKAuthen();
        }
    }, [doMKAuthen]);





    return (
        <div className={classes.root}>
            <Typography variant="h3">
                PIV
            </Typography>
            <Grid container justify={"center"} spacing={3}>
                {
                    MKValid ?
                        <Grid item xs={12} md={12}>
                            <Card className={classes.card}>
                                <CardContent>
                                    <Typography variant="h4">
                                    Certificates
                                    </Typography>
                                    <Typography>
                                        Dealing with certificates
                                    </Typography>
                                </CardContent>
                                <AppBar position="static" color="default">
                                    <Tabs
                                        value={tabValue}
                                        onChange={handleTabChange}
                                        indicatorColor="primary"
                                        textColor="primary"
                                        centered
                                    >
                                        <Tab label="Authentication" {...a11yProps(0)} />
                                        <Tab label="Digital Signature" {...a11yProps(1)} />
                                        <Tab label="Key Management" {...a11yProps(2)} />
                                        <Tab label="Card Authentication" {...a11yProps(3)} />
                                    </Tabs>
                                </AppBar>
                                <TabPanel value={tabValue} index={0} >
                                    <Typography variant="h5">
                                        {
                                            ownCrt? 'You have a certificate in this slot.'
                                                :"You don't have a certificate in this slot."
                                        }
                                    </Typography>
                                    <ButtonGroup variant="contained" className={classes.buttonGroup}>
                                        <Button variant="contained" onClick={onImportCrt}>import-crt</Button>

                                        <Button variant="contained" onClick={doExportCrt}>export-crt</Button>

                                        <Button variant="contained" onClick={doDeleteCrt}>delete-crt</Button>
                                    </ButtonGroup>
                                    <ButtonGroup variant="contained" className={classes.buttonGroup}>
                                            <Button variant="contained" onClick={onImportKey}>import-key</Button>
                                            <Button variant="contained" onClick={() => setCreatCrtDialogOpen(true)}>
                                            creat-key</Button>
                                    </ButtonGroup>
                                </TabPanel>
                                <TabPanel value={tabValue} index={1}>
                                    <Typography variant="h5">
                                        {
                                            ownCrt? 'You have a certificate in this slot.'
                                                :"You don't have a certificate in this slot."
                                        }
                                    </Typography>
                                    <ButtonGroup variant="contained" className={classes.buttonGroup}>
                                        <Button variant="contained" onClick={onImportCrt}>import-crt</Button>

                                        <Button variant="contained" onClick={doExportCrt}>export-crt</Button>

                                        <Button variant="contained" onClick={doDeleteCrt}>delete-crt</Button>
                                    </ButtonGroup>
                                    <ButtonGroup variant="contained" className={classes.buttonGroup}>
                                        <Button variant="contained" onClick={onImportKey}>import-key</Button>
                                        <Button variant="contained" onClick={() => setCreatCrtDialogOpen(true)}>
                                            creat-key</Button>
                                    </ButtonGroup>
                                </TabPanel>
                                <TabPanel value={tabValue} index={2}>
                                    <Typography variant="h5">
                                        {
                                            ownCrt? 'You have a certificate in this slot.'
                                                :"You don't have a certificate in this slot."
                                        }
                                    </Typography>
                                    <ButtonGroup variant="contained" className={classes.buttonGroup}>
                                        <Button variant="contained" onClick={onImportCrt}>import-crt</Button>

                                        <Button variant="contained" onClick={doExportCrt}>export-crt</Button>

                                        <Button variant="contained" onClick={doDeleteCrt}>delete-crt</Button>
                                    </ButtonGroup>
                                    <ButtonGroup variant="contained" className={classes.buttonGroup}>
                                        <Button variant="contained" onClick={onImportKey}>import-key</Button>
                                        <Button variant="contained" onClick={() => setCreatCrtDialogOpen(true)}>
                                            creat-key</Button>
                                    </ButtonGroup>
                                </TabPanel>
                                <TabPanel value={tabValue} index={3}>
                                    <Typography variant="h5">
                                        {
                                            ownCrt? 'You have a certificate in this slot.'
                                                :"You don't have a certificate in this slot."
                                        }
                                    </Typography>
                                    <ButtonGroup variant="contained" className={classes.buttonGroup}>
                                        <Button variant="contained" onClick={onImportCrt}>import-crt</Button>

                                        <Button variant="contained" onClick={doExportCrt}>export-crt</Button>

                                        <Button variant="contained" onClick={doDeleteCrt}>delete-crt</Button>
                                    </ButtonGroup>
                                    <ButtonGroup variant="contained" className={classes.buttonGroup}>
                                        <Button variant="contained" onClick={onImportKey}>import-key</Button>
                                        <Button variant="contained" onClick={() => setCreatCrtDialogOpen(true)}>
                                            creat-key</Button>
                                    </ButtonGroup>
                                </TabPanel>
                            </Card>
                        </Grid>
                        : null
                }
                <Grid item xs={12} md={12}>
                    <Card className={classes.card}>
                        <Typography variant="h4">
                            Password Management
                        </Typography>
                        <Typography >
                            Manage PIV PIN and ManagementKey.
                        </Typography>
                        <CardActions>
                            <Button variant="contained" onClick={onMKAuthen} className={classes.button}>Authenticate</Button>

                            { MKValid ?
                                <span>
                                    <Button variant="contained" onClick={onChangePin} className={classes.button}>change-pin</Button>
                                    <Button variant="contained" onClick={onChangeMK} className={classes.button}>change-managementkey</Button>
                                </span>
                                : null
                            }
                        </CardActions>
                    </Card>
                </Grid>
            </Grid>
            <Dialog open={MKAuthenDialogOpen} onClose={() => setMKAuthenDialogOpen(false)}>
                <DialogTitle> Enter MK to Authenticate</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Enter PIN and ManagementKey below.
                    </DialogContentText>
                    <TextField
                        label="PIN"
                        type="password"
                        autoFocus
                        fullWidth
                        onKeyPress={onKeyPressMKAuthen}
                        onChange={(e) => setOldPin(e.target.value)}/>
                    <TextField
                        label="ManagementKey"
                        type="password"
                        autoFocus
                        fullWidth
                        onKeyPress={onKeyPressMKAuthen}
                        onChange={(e) => setnowMK(e.target.value)}/>
                </DialogContent>
                <DialogActions>
                    <Button color="primary" onClick={doMKAuthen}>
                        Authenticate
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog open={chPinDialogOpen} onClose={() => setChPinDialogOpen(false)}>
                <DialogTitle> Enter old and new pins for PIV Applet</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Enter old and new pins for PIV Applet.
                    </DialogContentText>
                    <form className={classes.root} noValidate autoComplete="off">
                        <TextField
                            label="oldPassword"
                            type="password"
                            autoFocus
                            fullWidth
                            onKeyPress={onKeyPressChPin}
                            onChange={(e) => setOldPin(e.target.value)}/>
                        <TextField
                            label="newPassword"
                            type="password"
                            autoFocus
                            fullWidth
                            onKeyPress={onKeyPressChPin}
                            onChange={(e) => setNewPin(e.target.value)}/>
                    </form>

                </DialogContent>
                <DialogActions>
                    <Button color="primary" onClick={doChangePin}>
                        Change Pin
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog open={chMKDialogOpen} onClose={() => setChMKDialogOpen(false)}>
                <DialogTitle> Enter old and new MKs for PIV Applet</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Enter old and new MKs for PIV Applet.
                    </DialogContentText>
                    <TextField
                        label="newMK"
                        type="password"
                        autoFocus
                        fullWidth
                        onKeyPress={onKeyPressChMK}
                        onChange={(e) => setNewMK(e.target.value)}/>
                </DialogContent>
                <DialogActions>
                    <Button color="primary" onClick={doChangeMK}>
                        Change MK
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog open={importCrtDialogOpen} onClose={() => setImportCrtDialogOpen(false)}>
                <DialogTitle> Choose Crt to Import</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Choose Crt below.
                    </DialogContentText>
                    <input type="file" id="file"/>
                </DialogContent>
                <DialogActions>
                    <Button color="primary" onClick={doImportCrt}>
                        Import
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog open={creatCrtDialogOpen} onClose={() => setCreatCrtDialogOpen(false)}>
                <DialogTitle>Creat crt to PIV Applet</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Set  key and crt info below
                    </DialogContentText>
                    <FormGroup col>
                        <TextField
                            fullWidth
                            label="Country Name (2 letter code)"
                            value={country}
                            error={country.length !== 2}
                            helperText={country.length > 0 ? '' : 'country name should be 2 letter code'}
                            onChange={(e) => setCountry(e.target.value)}/>
                        <TextField
                            fullWidth
                            label="State or Province Name"
                            value={province}
                            onChange={(e) => setProvince(e.target.value)}>
                        </TextField>
                        <TextField
                            fullWidth
                            label="Locality Name (eg, city)"
                            value={locality}
                            onChange={(e) => setLocality(e.target.value)}>
                        </TextField>
                        <TextField
                            fullWidth
                            label="Organization Name"
                            value={organization}
                            onChange={(e) => setOrganization(e.target.value)}>
                        </TextField>
                        <TextField
                            fullWidth
                            label="Organizational Unit Name"
                            value={organizationUnit}
                            onChange={(e) => setOrganizationUnit(e.target.value)}>
                        </TextField>
                        <TextField
                            fullWidth
                            label="Common Name"
                            value={common}
                            onChange={(e) => setCommon(e.target.value)}>
                        </TextField>
                        <FormControl>
                            <InputLabel id="algo-label">Algorithm</InputLabel>
                            <Select labelId="algo-label" value={algo} onChange={(e) => setAlgo(e.target.value)}>
                                <MenuItem value={"ECC-P-256"}>ECC-P-256</MenuItem>
                                <MenuItem value={"ECC-P-384"}>ECC-P-384</MenuItem>
                                <MenuItem value={"RSA-2048"}>RSA-2048</MenuItem>
                            </Select>
                        </FormControl>
                    </FormGroup>
                </DialogContent>
                <DialogActions>
                    <Button variant="contained" color="primary" onClick={doCreateCrt}>
                        Creat
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog open={importKeyDialogOpen} onClose={() => setImportKeyDialogOpen(false)}>
                <DialogTitle> Import your private key</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Enter your private key in pem format below.
                    </DialogContentText>
                    <InputLabel id="keyalgo-label">Algorithm</InputLabel>
                    <Select labelId="keyalgo-label" value={keyAlgo} onChange={(e) => setKeyAlgo(e.target.value)}>
                        <MenuItem value={"ECC"}>ECC</MenuItem>
                        <MenuItem value={"RSA"}>RSA</MenuItem>
                    </Select>
                    <TextField
                        label="Private Key"
                        autoFocus
                        fullWidth
                        multiline
                        onKeyPress={onKeyPressImportKey}
                        value={keyPem}
                        onChange={(e) => setKeyPem(e.target.value)}/>
                </DialogContent>
                <DialogActions>
                    <Button color="primary" onClick={doImportKey}>
                        Import
                    </Button>
                </DialogActions>
            </Dialog>
        </div>

    );

}
