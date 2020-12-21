import React, { useCallback, useEffect, useState } from 'react'
import { makeStyles } from '@material-ui/core/styles'
import { useDispatch, useSelector } from 'react-redux'
import Grid from '@material-ui/core/Grid'
import { useSnackbar } from 'notistack'
import { connect, transceive } from './actions'
import { byteToHexString, hexStringToByte, sleep } from './util'
import Card from '@material-ui/core/Card'
import CardContent from '@material-ui/core/CardContent'
import Typography from '@material-ui/core/Typography'
import CardActions from '@material-ui/core/CardActions'
import Button from '@material-ui/core/Button'
import ButtonGroup from '@material-ui/core/ButtonGroup'
import Dialog from '@material-ui/core/Dialog'
import AppBar from '@material-ui/core/AppBar'
import PropTypes from 'prop-types'
import DialogTitle from '@material-ui/core/DialogTitle'
import DialogContent from '@material-ui/core/DialogContent'
import DialogContentText from '@material-ui/core/DialogContentText'
import TextField from '@material-ui/core/TextField'
import DialogActions from '@material-ui/core/DialogActions'
import Select from '@material-ui/core/Select'
import MenuItem from '@material-ui/core/MenuItem'
import InputLabel from '@material-ui/core/InputLabel'
import FormControl from '@material-ui/core/FormControl'
import FormGroup from '@material-ui/core/FormGroup'
import Tabs from '@material-ui/core/Tabs'
import Tab from '@material-ui/core/Tab'
import base64url from 'base64url'
import Box from '@material-ui/core/Box'
import sha1 from 'crypto-js/sha1'
import keyutil from 'js-crypto-key-utils'
import jseu from 'js-encoding-utils'

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
    paddingLeft: '10%',
    paddingRight: '10%',
    paddingTop: '50px',
  },
  card: {
    marginLeft: '5%',
    marginRight: '5%',
    marginTop: '30px',
  },
  buttonGroup: {
    margin: '10px',
  },
  button: {
    margin: '10px',
  },
  grid: {
    marginTop: '30px',
    marginBottom: '30px',
  },
}))

function TabPanel(props) {
  const { children, value, index, ...other } = props

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
  )
}

TabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.any.isRequired,
  value: PropTypes.any.isRequired,
}

function a11yProps(index) {
  return {
    id: `scrollable-force-tab-${index}`,
    'aria-controls': `scrollable-force-tabpanel-${index}`,
  }
}

function calMPIsLen(MPIs) {
  let cleanMPIs = MPIs.replace(/^0+/, '')
  let start = parseInt(cleanMPIs.slice(0, 1), 16)
  let len
  if (start < 2) len = 1
  else if (start < 4) len = 2
  else if (start < 8) len = 3
  else if (start < 16) len = 4
  len += (cleanMPIs.length - 1) * 4
  return len.toString(16).padStart(4, '0')
}

export default function OpenPGP() {
  const classes = useStyles()
  const device = useSelector((state) => state.device)
  const dispatch = useDispatch()
  const { enqueueSnackbar } = useSnackbar()
  const [tabValue, setTabValue] = React.useState(0)
  const [chPinDialogOpen, setChPinDialogOpen] = useState(false)
  const [chMKDialogOpen, setChMKDialogOpen] = useState(false)
  const [chUrlDialogOpen, setChUrlDialogOpen] = useState(false)
  const [oldPin, setOldPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [nowMK, setNowMK] = useState('')
  const [newMK, setNewMK] = useState('')
  const [MKValid, setMKValid] = useState(false) //set to false after test
  const [MKAuthenDialogOpen, setMKAuthenDialogOpen] = useState(false)
  const [importCrtDialogOpen, setImportCrtDialogOpen] = useState(false)
  const [creatKeyDialogOpen, setCreatKeyDialogOpen] = useState(false)
  const [importKeyDialogOpen, setImportKeyDialogOpen] = useState(false)
  const [algo, setAlgo] = useState('NIST-P-256')
  const [country, setCountry] = useState('CN')
  const [province, setProvince] = useState('Beijing')
  const [locality, setLocality] = useState('Chiyoda')
  const [organization, setOrganization] = useState('example')
  const [organizationUnit, setOrganizationUnit] = useState('Research')
  const [common, setCommon] = useState('example.com')
  const [url, setUrl] = useState('')
  const [keyPem, setKeyPem] = useState('')
  const [keyAlgo, setKeyAlgo] = useState('NIST-P-256')
  const [priKeyHex, setPriKeyHex] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [oldPinValid, setOldPinValid] = useState(false)
  const [newPinValid, setNewPinValid] = useState(false)
  const [nowMKValid, setNowMKValid] = useState(false)
  const [newMKValid, setNewMKValid] = useState(false)
  const [keyState0, setKeyState0] = useState('00')
  const [keyState1, setKeyState1] = useState('00')
  const [keyState2, setKeyState2] = useState('00')
  const [ownCrt, setOwnCrt] = useState(false)
  const [initRefresh, setInitRefresh] = useState(false)
  let slotPosition
  let algoSlot
  let keySlot
  let dateSlot
  let fingerprintSlot
  switch (tabValue) {
    case 0:
      slotPosition = 'SIGnature'
      algoSlot = 'c1'
      keySlot = 'b6'
      fingerprintSlot = 'c7'
      dateSlot = 'ce'
      break
    case 1:
      slotPosition = 'DECipher'
      algoSlot = 'c2'
      keySlot = 'b8'
      fingerprintSlot = 'c8'
      dateSlot = 'cf'
      break
    case 2:
      slotPosition = 'AUThentication'
      algoSlot = 'c3'
      keySlot = 'a4'
      fingerprintSlot = 'c9'
      dateSlot = 'd0'
      break
    default:
      slotPosition = 'SIGnature'
      algoSlot = 'c1'
      keySlot = 'b6'
      fingerprintSlot = 'c7'
      dateSlot = 'ce'
      break
  }

  const selectOpenPGPApplet = useCallback(async () => {
    if (device === null) {
      if (!(await dispatch(connect()))) {
        throw new Error('Cannot connect to CanoKey')
      }
    }
    let res = await dispatch(transceive('00A4040006d2760001240100'))
    if (!res.endsWith('9000')) {
      throw new Error('Selecting OpenPGP applet failed')
    }
  }, [device, dispatch])

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue)
  }

  const refresh = useCallback(async () => {
    try {
      if (device === null) setMKValid(false)
      if (device !== null && MKValid) {
        let keyRes = await dispatch(transceive(`00ca00de00`))
        setKeyState0(keyRes.substr(2, 2))
        setKeyState1(keyRes.substr(6, 2))
        setKeyState2(keyRes.substr(10, 2))

        let urlRes = await dispatch(transceive(`00ca5f5000`))
        if (urlRes === '9000') setUrl('Unknown')
        else
          setUrl(
            new TextDecoder().decode(
              hexStringToByte(urlRes.substr(0, urlRes.length - 4))
            )
          )

        let selectRes = await dispatch(
          transceive(`00a50${(2 - tabValue).toString(10)}040660045c027f2100`)
        )
        if (!selectRes.endsWith('9000')) {
          return
        }
        let crtRes = await dispatch(transceive(`00CA7F21000000`))

        if (crtRes.endsWith('9000') && crtRes !== '9000') setOwnCrt(true)
        else setOwnCrt(false)
        if (!initRefresh) setInitRefresh(true)
      }
    } catch (err) {
      enqueueSnackbar(err.toString(), { variant: 'error' })
    }
  }, [MKValid, device, dispatch, enqueueSnackbar, initRefresh, tabValue])

  useEffect(() => {
    ;(async () => {
      if (!initRefresh) await refresh()
      if (device === null) setMKValid(false)
    })()
  }, [device, initRefresh, refresh])

  const onImportKey = useCallback(() => {
    setImportKeyDialogOpen(true)
  }, [])

  const doImportKey = useCallback(async () => {
    setImportKeyDialogOpen(false)
    try {
      let fingerprint

      let date = new Date()
      let timeStamp = Math.round(date.getTime() / 1000)
        .toString(16)
        .padStart(8, '0')
      let data = []
      data = [0x04, ...hexStringToByte(timeStamp)]

      if (keyAlgo === 'RSA-2048') {
        const keyObj = new keyutil.Key('pem', keyPem)
        let jwk = await keyObj.export('jwk')

        let algoRes = await dispatch(
          transceive(`00da00${algoSlot}06010800002000`)
        )

        const rsaP = base64url
          .toBuffer(jwk['p'])
          .toString('hex')
          .padStart(256, '0')
        const rsaQ = base64url
          .toBuffer(jwk['q'])
          .toString('hex')
          .padStart(256, '0')
        const rsaQinv = base64url
          .toBuffer(jwk['qi'])
          .toString('hex')
          .padStart(256, '0')
        const rsaDp = base64url
          .toBuffer(jwk['dp'])
          .toString('hex')
          .padStart(256, '0')
        const rsaDq = base64url
          .toBuffer(jwk['dq'])
          .toString('hex')
          .padStart(256, '0')

        let importRes = await dispatch(
          transceive(
            `00DB3FFF0002A34D82029F${keySlot}007F481191049281809381809481809581809681805F4882028400010001${rsaP}${rsaQ}${rsaQinv}${rsaDp}${rsaDq}`
          )
        )

        if (algoRes.endsWith('9000') && importRes.endsWith('9000')) {
          enqueueSnackbar(slotPosition + ':RSA-2048 key import succeed', {
            variant: 'success',
          })
        } else {
          enqueueSnackbar(slotPosition + ':RSA-2048 key import failed', {
            variant: 'error',
          })
        }

        let keyRes = await dispatch(
          transceive(`00478100000002${keySlot}000000`)
        )
        let modulusHex = keyRes.substr(18, 512)
        let exponentHex = keyRes.substr(534, 8)

        data.push(1)

        modulusHex = modulusHex.replace(/^(00)+/, '')
        exponentHex = exponentHex.replace(/^(00)+/, '')

        data = data.concat(Array.from(hexStringToByte(calMPIsLen(modulusHex))))
        data = data.concat(Array.from(hexStringToByte(modulusHex)))
        data = data.concat(Array.from(hexStringToByte(calMPIsLen(exponentHex))))
        data = data.concat(Array.from(hexStringToByte(exponentHex)))
      } else if (keyAlgo === 'RSA-4096') {
        const keyObj = new keyutil.Key('pem', keyPem)
        let jwk = await keyObj.export('jwk')

        let algoRes = await dispatch(
          transceive(`00da00${algoSlot}06011000002000`)
        )

        const rsaP = base64url
          .toBuffer(jwk['p'])
          .toString('hex')
          .padStart(512, '0')
        const rsaQ = base64url
          .toBuffer(jwk['q'])
          .toString('hex')
          .padStart(512, '0')
        const rsaQinv = base64url
          .toBuffer(jwk['qi'])
          .toString('hex')
          .padStart(512, '0')
        const rsaDp = base64url
          .toBuffer(jwk['dp'])
          .toString('hex')
          .padStart(512, '0')
        const rsaDq = base64url
          .toBuffer(jwk['dq'])
          .toString('hex')
          .padStart(512, '0')

        let importRes = await dispatch(
          transceive(
            `00DB3FFF0005284D820524${keySlot}007F4816910492820100938201009482010095820100968201005F4882050400010001${rsaP}${rsaQ}${rsaQinv}${rsaDp}${rsaDq}`
          )
        )

        if (algoRes.endsWith('9000') && importRes.endsWith('9000')) {
          enqueueSnackbar(slotPosition + ':RSA-4096 key import succeed', {
            variant: 'success',
          })
        } else {
          enqueueSnackbar(slotPosition + ':RSA-4096 key import failed', {
            variant: 'error',
          })
        }
        let keyRes = await dispatch(
          transceive(`00478100000002${keySlot}000000`)
        )
        let modulusHex = keyRes.substr(18, 1024)
        let exponentHex = keyRes.substr(1046, 8)

        data.push(1)

        modulusHex = modulusHex.replace(/^(00)+/, '')
        exponentHex = exponentHex.replace(/^(00)+/, '')

        data = data.concat(Array.from(hexStringToByte(calMPIsLen(modulusHex))))
        data = data.concat(Array.from(hexStringToByte(modulusHex)))
        data = data.concat(Array.from(hexStringToByte(calMPIsLen(exponentHex))))
        data = data.concat(Array.from(hexStringToByte(exponentHex)))
      } else if (keyAlgo === 'Curve-25519') {
        let algoRes = await dispatch(
          transceive(
            `00da00${algoSlot}${
              tabValue === 1
                ? '0B122B060104019755010501'
                : '0A162B06010401DA470F01'
            }`
          )
        )
        let importRes = await dispatch(
          transceive(`00DB3FFF2C4D2A${keySlot}007F480292205F4820${priKeyHex}`)
        )
        if (algoRes.endsWith('9000') && importRes.endsWith('9000')) {
          enqueueSnackbar(slotPosition + ':Curve-25519 key import succeed', {
            variant: 'success',
          })
        } else {
          enqueueSnackbar(slotPosition + ':Curve-25519 key import failed', {
            variant: 'error',
          })
        }
        let keyRes = await dispatch(
          transceive(`00478100000002${keySlot}000000`)
        )
        keyRes = keyRes.substr(12, 128)

        if (tabValue === 1) {
          data.push(18)

          let oidField = [0x05, 0x2b, 0x81, 0x04, 0x00, 0x0a]
          oidField.push(0x02, 0x03, 0x04)
          oidField = oidField.concat(Array.from(hexStringToByte(keyRes)))
          oidField.unshift(oidField.length)
          data = data.concat(Array.from(oidField))

          data.push(0x03, 0x01, 0x08, 0x02)
        } else {
          data.push(19)

          data.push(0x05, 0x2b, 0x81, 0x04, 0x00, 0x0a)

          let keyField = [0x02, 0x03, 0x04]
          keyField = keyField.concat(Array.from(hexStringToByte(keyRes)))
          keyField.unshift(keyField.length)
          data = data.concat(Array.from(keyField))
        }
      } else {
        const ECKey = require('ec-key')
        let key = new ECKey(keyPem, 'pem')
        let algoFlag = key.toJSON()['crv']
        let priKey = base64url.toBuffer(key.toJSON()['d']).toString('hex')

        if (algoFlag === 'P-256') {
          let algoRes = await dispatch(
            transceive(
              `00da00${algoSlot}09${
                tabValue === 1 ? '12' : '13'
              }2A8648CE3D030107`
            )
          )
          let importRes = await dispatch(
            transceive(`00DB3FFF2C4D2A${keySlot}007F480292205F4820${priKey}`)
          )
          if (algoRes.endsWith('9000') && importRes.endsWith('9000')) {
            enqueueSnackbar(slotPosition + ':P-256 key import succeed', {
              variant: 'success',
            })
          } else {
            enqueueSnackbar(slotPosition + ':P-256 key import failed', {
              variant: 'error',
            })
          }
          let keyRes = await dispatch(
            transceive(`00478100000002${keySlot}000000`)
          )
          if (algoRes.endsWith('9000') && keyRes.endsWith('9000')) {
            enqueueSnackbar(slotPosition + ':Creat key success', {
              variant: 'success',
            })
          } else {
            enqueueSnackbar(slotPosition + ':Creat key failed', {
              variant: 'error',
            })
            return
          }
          keyRes = keyRes.substr(12, 128)
          if (tabValue === 1) {
            data.push(18)

            let oidField = [
              0x08,
              0x2a,
              0x86,
              0x48,
              0xce,
              0x3d,
              0x03,
              0x01,
              0x07,
            ]
            oidField.push(0x02, 0x03, 0x04)
            oidField = oidField.concat(Array.from(hexStringToByte(keyRes)))
            oidField.unshift(oidField.length)
            data = data.concat(Array.from(oidField))

            data.push(0x03, 0x01, 0x08, 0x02)
          } else {
            data.push(19)

            data.push(0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07)

            let keyField = [0x02, 0x03, 0x04]
            keyField = keyField.concat(Array.from(hexStringToByte(keyRes)))
            keyField.unshift(keyField.length)
            data = data.concat(Array.from(keyField))
          }
        } else if (algoFlag === 'P-384') {
          let algoRes = await dispatch(
            transceive(
              `00da00${algoSlot}06${tabValue === 1 ? '12' : '13'}2B81040022`
            )
          )
          let importRes = await dispatch(
            transceive(`00DB3FFF3C4D3A${keySlot}007F480292305F4830${priKey}`)
          )
          if (algoRes.endsWith('9000') && importRes.endsWith('9000')) {
            enqueueSnackbar(slotPosition + ':P-384 key import succeed', {
              variant: 'success',
            })
          } else {
            enqueueSnackbar(slotPosition + ':P-384 key import failed', {
              variant: 'error',
            })
          }
          let keyRes = await dispatch(
            transceive(`00478100000002${keySlot}000000`)
          )

          keyRes = keyRes.substr(12, 192)

          if (tabValue === 1) {
            data.push(18)

            let oidField = [0x05, 0x2b, 0x81, 0x04, 0x00, 0x22]
            oidField.push(0x03, 0x03, 0x04)
            oidField = oidField.concat(Array.from(hexStringToByte(keyRes)))
            oidField.unshift(oidField.length)
            data = data.concat(Array.from(oidField))

            data.push(0x03, 0x01, 0x08, 0x02)
          } else {
            data.push(19)

            data.push(0x05, 0x2b, 0x81, 0x04, 0x00, 0x22)

            let keyField = [0x03, 0x03, 0x04]
            keyField = keyField.concat(Array.from(hexStringToByte(keyRes)))
            keyField.unshift(keyField.length)
            data = data.concat(Array.from(keyField))
          }
        } else if (algoFlag === 'P-256K') {
          let algoRes = await dispatch(
            transceive(
              `00da00${algoSlot}06${tabValue === 1 ? '12' : '13'}2B8104000A`
            )
          )
          let importRes = await dispatch(
            transceive(`00DB3FFF2C4D2A${keySlot}007F480292205F4820${priKey}`)
          )
          if (algoRes.endsWith('9000') && importRes.endsWith('9000')) {
            enqueueSnackbar(slotPosition + ':secp256k1 key import succeed', {
              variant: 'success',
            })
          } else {
            enqueueSnackbar(slotPosition + ':secp256k1 key import failed', {
              variant: 'error',
            })
          }

          let keyRes = await dispatch(
            transceive(`00478100000002${keySlot}000000`)
          )

          keyRes = keyRes.substr(12, 128)

          if (tabValue === 1) {
            data.push(18)

            let oidField = [0x05, 0x2b, 0x81, 0x04, 0x00, 0x0a]
            oidField.push(0x02, 0x03, 0x04)
            oidField = oidField.concat(Array.from(hexStringToByte(keyRes)))
            oidField.unshift(oidField.length)
            data = data.concat(Array.from(oidField))

            data.push(0x03, 0x01, 0x08, 0x02)
          } else {
            data.push(19)

            data.push(0x05, 0x2b, 0x81, 0x04, 0x00, 0x0a)

            let keyField = [0x02, 0x03, 0x04]
            keyField = keyField.concat(Array.from(hexStringToByte(keyRes)))
            keyField.unshift(keyField.length)
            data = data.concat(Array.from(keyField))
          }
        }
      }
      data = Array.from(
        hexStringToByte(data.length.toString(16).padStart(4, '0'))
      ).concat(data)
      data.unshift(0x99)
      fingerprint = sha1(
        new TextDecoder('utf-8').decode(new Uint8Array(data))
      ).toString()

      //put generation time
      await dispatch(transceive(`00da00${dateSlot}04${timeStamp}`))

      //put fingerprint
      await dispatch(transceive(`00da00${fingerprintSlot}14${fingerprint}`))
    } catch (err) {
      enqueueSnackbar(err.toString(), { variant: 'error' })
    }

    sleep(500).then(() => {
      refresh()
    })
  }, [
    refresh,
    keyAlgo,
    dispatch,
    dateSlot,
    fingerprintSlot,
    keyPem,
    algoSlot,
    keySlot,
    enqueueSnackbar,
    slotPosition,
    tabValue,
    priKeyHex,
  ])

  const onKeyPressImportKey = useCallback(
    async (e) => {
      if (e.key === 'Enter') {
        await doImportKey()
      }
    },
    [doImportKey]
  )

  const doExportCrt = useCallback(async () => {
    try {
      let selectRes = await dispatch(
        transceive(`00a50${(2 - tabValue).toString(10)}040660045c027f2100`)
      )
      if (!selectRes.endsWith('9000')) {
        enqueueSnackbar(slotPosition + ':Certificate export failed', {
          variant: 'error',
        })
        return
      }
      let res = await dispatch(transceive(`00CA7F21000000`))

      if (res.endsWith('9000')) {
        enqueueSnackbar(slotPosition + ':Certificate export succeed', {
          variant: 'success',
        })
        res = res.substr(0, res.length - 4)
        const pemCrt = jseu.formatter.binToPem(
          hexStringToByte(res),
          'certificate'
        )
        let FileSaver = require('file-saver')
        let blob = new Blob([pemCrt], { type: 'text/plain;charset=utf-8' })
        FileSaver.saveAs(blob, 'newCertificate.crt')
      } else {
        enqueueSnackbar(slotPosition + ':Certificate export failed', {
          variant: 'error',
        })
      }
    } catch (err) {
      enqueueSnackbar(err.toString(), { variant: 'error' })
    }
  }, [tabValue, dispatch, enqueueSnackbar, slotPosition])

  const doDeleteCrt = useCallback(async () => {
    try {
      let selectRes = await dispatch(
        transceive(`00a50${(2 - tabValue).toString(10)}040660045c027f2100`)
      )
      if (!selectRes.endsWith('9000')) {
        enqueueSnackbar(slotPosition + ':Certificate delete failed', {
          variant: 'error',
        })
        return
      }
      let res = await dispatch(transceive(`00dA7F21`))
      if (res.endsWith('9000')) {
        enqueueSnackbar(slotPosition + ':Certificate delete succeed', {
          variant: 'success',
        })
      } else {
        enqueueSnackbar(slotPosition + ':Certificate delete failed', {
          variant: 'error',
        })
      }
    } catch (err) {
      enqueueSnackbar(err.toString(), { variant: 'error' })
    }
    sleep(500).then(() => {
      refresh()
    })
  }, [dispatch, tabValue, enqueueSnackbar, slotPosition, refresh])

  const onImportCrt = useCallback(() => {
    setImportCrtDialogOpen(true)
  }, [])

  const doImportCrt = useCallback(async () => {
    setImportCrtDialogOpen(false)
    let file = document.getElementById('file').files[0]
    let reader = new FileReader()
    try {
      reader.readAsText(file)
      reader.onload = async function (e) {
        const binCrt = jseu.formatter.pemToBin(e.target.result)
        const derCrt = byteToHexString(binCrt)
        const Length = (derCrt.length / 2).toString(16).padStart(6, '0')
        let selectRes = await dispatch(
          transceive(`00a50${(2 - tabValue).toString(10)}040660045c027f2100`)
        )
        if (!selectRes.endsWith('9000')) {
          enqueueSnackbar(slotPosition + ':Certificate import failed', {
            variant: 'error',
          })
          return
        }
        let res = await dispatch(transceive(`00da7f21${Length}${derCrt}`))
        if (res.endsWith('9000')) {
          enqueueSnackbar(slotPosition + ':Certificate import succeed', {
            variant: 'success',
          })
        } else {
          enqueueSnackbar(slotPosition + ':Certificate import failed', {
            variant: 'error',
          })
        }
      }
    } catch (err) {
      enqueueSnackbar(err.toString(), { variant: 'error' })
    }
    sleep(500).then(() => {
      refresh()
    })
  }, [dispatch, tabValue, enqueueSnackbar, slotPosition, refresh])

  const doCreatKey = useCallback(async () => {
    setCreatKeyDialogOpen(false)
    try {
      //creat key
      let keyRes
      let fingerprint
      let date = new Date()
      let timeStamp = Math.round(date.getTime() / 1000)
        .toString(16)
        .padStart(8, '0')
      let data = []
      data = [0x04, ...hexStringToByte(timeStamp)]

      if (algo === 'RSA-2048') {
        let algoRes = await dispatch(
          transceive(`00da00${algoSlot}06010800002000`)
        )
        keyRes = await dispatch(transceive(`00478000000002${keySlot}000000`))
        if (algoRes.endsWith('9000') && keyRes.endsWith('9000')) {
          enqueueSnackbar(slotPosition + ':Creat key success', {
            variant: 'success',
          })
        } else {
          enqueueSnackbar(slotPosition + ':Creat key failed', {
            variant: 'error',
          })
          return
        }
        let modulusHex = keyRes.substr(18, 512)
        let exponentHex = keyRes.substr(534, 8)

        data.push(1)

        modulusHex = modulusHex.replace(/^(00)+/, '')
        exponentHex = exponentHex.replace(/^(00)+/, '')

        data = data.concat(Array.from(hexStringToByte(calMPIsLen(modulusHex))))
        data = data.concat(Array.from(hexStringToByte(modulusHex)))
        data = data.concat(Array.from(hexStringToByte(calMPIsLen(exponentHex))))
        data = data.concat(Array.from(hexStringToByte(exponentHex)))
      } else if (algo === 'NIST-P-256') {
        let algoRes = await dispatch(
          transceive(
            `00da00${algoSlot}09${tabValue === 1 ? '12' : '13'}2A8648CE3D030107`
          )
        )
        keyRes = await dispatch(transceive(`00478000000002${keySlot}000000`))
        if (algoRes.endsWith('9000') && keyRes.endsWith('9000')) {
          enqueueSnackbar(slotPosition + ':Creat key success', {
            variant: 'success',
          })
        } else {
          enqueueSnackbar(slotPosition + ':Creat key failed', {
            variant: 'error',
          })
          return
        }
        keyRes = keyRes.substr(12, 128)

        if (tabValue === 1) {
          data.push(18)

          let oidField = [0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07]
          oidField.push(0x02, 0x03, 0x04)
          oidField = oidField.concat(Array.from(hexStringToByte(keyRes)))
          oidField.unshift(oidField.length)
          data = data.concat(Array.from(oidField))

          data.push(0x03, 0x01, 0x08, 0x02)
        } else {
          data.push(19)

          data.push(0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07)

          let keyField = [0x02, 0x03, 0x04]
          keyField = keyField.concat(Array.from(hexStringToByte(keyRes)))
          keyField.unshift(keyField.length)
          data = data.concat(Array.from(keyField))
        }
      } else if (algo === 'NIST-P-384') {
        let algoRes = await dispatch(
          transceive(
            `00da00${algoSlot}06${tabValue === 1 ? '12' : '13'}2B81040022`
          )
        )
        keyRes = await dispatch(transceive(`00478000000002${keySlot}000000`))
        if (algoRes.endsWith('9000') && keyRes.endsWith('9000')) {
          enqueueSnackbar(slotPosition + ':Creat key success', {
            variant: 'success',
          })
        } else {
          enqueueSnackbar(slotPosition + ':Creat key failed', {
            variant: 'error',
          })
          return
        }
        keyRes = keyRes.substr(12, 192)

        if (tabValue === 1) {
          data.push(18)

          let oidField = [0x05, 0x2b, 0x81, 0x04, 0x00, 0x22]
          oidField.push(0x03, 0x03, 0x04)
          oidField = oidField.concat(Array.from(hexStringToByte(keyRes)))
          oidField.unshift(oidField.length)
          data = data.concat(Array.from(oidField))

          data.push(0x03, 0x01, 0x08, 0x02)
        } else {
          data.push(19)

          data.push(0x05, 0x2b, 0x81, 0x04, 0x00, 0x22)

          let keyField = [0x03, 0x03, 0x04]
          keyField = keyField.concat(Array.from(hexStringToByte(keyRes)))
          keyField.unshift(keyField.length)
          data = data.concat(Array.from(keyField))
        }
      } else if (algo === 'secp256k1') {
        let algoRes = await dispatch(
          transceive(
            `00da00${algoSlot}06${tabValue === 1 ? '12' : '13'}2B8104000A`
          )
        )
        keyRes = await dispatch(transceive(`00478000000002${keySlot}000000`))
        if (algoRes.endsWith('9000') && keyRes.endsWith('9000')) {
          enqueueSnackbar(slotPosition + ':Creat key success', {
            variant: 'success',
          })
        } else {
          enqueueSnackbar(slotPosition + ':Creat key failed', {
            variant: 'error',
          })
          return
        }
        keyRes = keyRes.substr(12, 128)

        if (tabValue === 1) {
          data.push(18)

          let oidField = [0x05, 0x2b, 0x81, 0x04, 0x00, 0x0a]
          oidField.push(0x02, 0x03, 0x04)
          oidField = oidField.concat(Array.from(hexStringToByte(keyRes)))
          oidField.unshift(oidField.length)
          data = data.concat(Array.from(oidField))

          data.push(0x03, 0x01, 0x08, 0x02)
        } else {
          data.push(19)

          data.push(0x05, 0x2b, 0x81, 0x04, 0x00, 0x0a)

          let keyField = [0x02, 0x03, 0x04]
          keyField = keyField.concat(Array.from(hexStringToByte(keyRes)))
          keyField.unshift(keyField.length)
          data = data.concat(Array.from(keyField))
        }
      } else if (algo === 'Curve-25519') {
        let algoRes = await dispatch(
          transceive(
            `00da00${algoSlot}${
              tabValue === 1
                ? '0B122B060104019755010501'
                : '0A162B06010401DA470F01'
            }`
          )
        )
        keyRes = await dispatch(transceive(`00478000000002${keySlot}000000`))
        if (algoRes.endsWith('9000') && keyRes.endsWith('9000')) {
          enqueueSnackbar(slotPosition + ':Creat key success', {
            variant: 'success',
          })
        } else {
          enqueueSnackbar(slotPosition + ':Creat key failed', {
            variant: 'error',
          })
          return
        }

        if (tabValue === 1) {
          data.push(18)

          let oidField = [
            0x0a,
            0x2b,
            0x06,
            0x01,
            0x04,
            0x01,
            0x97,
            0x55,
            0x01,
            0x05,
            0x01,
          ]
          oidField.push(0x01, 0x07, 0x40)
          oidField = oidField.concat(Array.from(hexStringToByte(keyRes)))
          oidField.unshift(oidField.length)
          data = data.concat(Array.from(oidField))

          data.push(0x03, 0x01, 0x08, 0x02)
        } else {
          data.push(22)

          data.push(0x09, 0x2b, 0x06, 0x01, 0x04, 0x01, 0xda, 0x47, 0x0f, 0x01)

          let keyField = [0x01, 0x07, 0x40]
          keyField = keyField.concat(Array.from(hexStringToByte(keyRes)))
          keyField.unshift(keyField.length)
          data = data.concat(Array.from(keyField))
        }
      }

      data = Array.from(
        hexStringToByte(data.length.toString(16).padStart(4, '0'))
      ).concat(data)
      data.unshift(0x99)
      fingerprint = sha1(
        new TextDecoder('utf-8').decode(new Uint8Array(data))
      ).toString()

      //put generation time
      await dispatch(transceive(`00da00${dateSlot}04${timeStamp}`))

      //put fingerprint
      await dispatch(transceive(`00da00${fingerprintSlot}14${fingerprint}`))
    } catch (err) {
      enqueueSnackbar(err.toString(), { variant: 'error' })
    }
    sleep(500).then(() => {
      refresh()
    })
  }, [
    refresh,
    algo,
    dispatch,
    dateSlot,
    fingerprintSlot,
    algoSlot,
    keySlot,
    enqueueSnackbar,
    slotPosition,
    tabValue,
  ])

  const onChangePin = useCallback(() => {
    setChPinDialogOpen(true)
  }, [])

  const doChangePin = useCallback(async () => {
    setChPinDialogOpen(false)
    try {
      let oldArray = new TextEncoder().encode(oldPin)
      let oldHexString = byteToHexString(oldArray)
      let newArray = new TextEncoder().encode(newPin)
      let newHexString = byteToHexString(newArray)
      const Len = ((oldHexString.length + newHexString.length) / 2)
        .toString(16)
        .padStart(2, '0')

      await selectOpenPGPApplet()
      let res = await dispatch(
        transceive(`00240081${Len}${oldHexString}${newHexString}`, true)
      )
      if (res.endsWith('9000')) {
        enqueueSnackbar('PIN changed', { variant: 'success' })
        setOldPin(newPin)
      } else {
        enqueueSnackbar('Change PIN failed', { variant: 'error' })
      }
    } catch (err) {
      enqueueSnackbar(err.toString(), { variant: 'error' })
    }
  }, [newPin, oldPin, dispatch, enqueueSnackbar, selectOpenPGPApplet])

  const onKeyPressChPin = useCallback(
    async (e) => {
      if (e.key === 'Enter') {
        await doChangePin()
      }
    },
    [doChangePin]
  )

  const onChangeMK = useCallback(() => {
    setChMKDialogOpen(true)
  }, [])

  const doChangeMK = useCallback(async () => {
    setChMKDialogOpen(false)
    try {
      let oldArray = new TextEncoder().encode(nowMK)
      let oldHexString = byteToHexString(oldArray)
      let newArray = new TextEncoder().encode(newMK)
      let newHexString = byteToHexString(newArray)
      const Len = ((oldHexString.length + newHexString.length) / 2)
        .toString(16)
        .padStart(2, '0')

      await selectOpenPGPApplet()
      let res = await dispatch(
        transceive(`00240083${Len}${oldHexString}${newHexString}`, true)
      )
      if (res.endsWith('9000')) {
        enqueueSnackbar('MK changed', { variant: 'success' })
        setNowMK(newMK)
      } else {
        enqueueSnackbar('Change MK failed', { variant: 'error' })
      }
    } catch (err) {
      enqueueSnackbar(err.toString(), { variant: 'error' })
    }
  }, [nowMK, newMK, selectOpenPGPApplet, dispatch, enqueueSnackbar])

  const onKeyPressChMK = useCallback(
    async (e) => {
      if (e.key === 'Enter') {
        await doChangeMK()
      }
    },
    [doChangeMK]
  )

  const onMKAuthen = useCallback(() => {
    setMKAuthenDialogOpen(true)
  }, [])

  const doMKAuthen = useCallback(async () => {
    setMKAuthenDialogOpen(false)
    try {
      let pinArray = await new TextEncoder().encode(oldPin)
      let pinString = await byteToHexString(pinArray)
      let pinVerify
      let MKVerify
      await selectOpenPGPApplet()
      const pinLen = (pinString.length / 2).toString(16).padStart(2, '0')
      let pinRes = await dispatch(
        transceive(`00200082${pinLen}${pinString}`, true)
      )
      if (pinRes.endsWith('9000')) {
        enqueueSnackbar('PIN verified', { variant: 'success' })
        pinVerify = true
      } else {
        enqueueSnackbar('Verify PIN failed', { variant: 'error' })
        pinVerify = false
      }

      let MKArray = await new TextEncoder().encode(nowMK)
      let MKString = await byteToHexString(MKArray)
      const MKLen = (MKString.length / 2).toString(16).padStart(2, '0')
      let MKRes = await dispatch(
        transceive(`00200083${MKLen}${MKString}`, true)
      )
      if (MKRes.endsWith('9000')) {
        enqueueSnackbar('MK verification success', { variant: 'success' })
        MKVerify = true
      } else {
        enqueueSnackbar('MK verification failed', { variant: 'error' })
        MKVerify = false
      }

      if (pinVerify && MKVerify) setMKValid(true)
      else setMKValid(false)
    } catch (err) {
      enqueueSnackbar(err.toString(), { variant: 'error' })
    }
  }, [oldPin, selectOpenPGPApplet, dispatch, nowMK, enqueueSnackbar])

  const onKeyPressMKAuthen = useCallback(
    async (e) => {
      if (e.key === 'Enter') {
        await doMKAuthen()
      }
    },
    [doMKAuthen]
  )

  const onChangeUrl = useCallback(() => {
    setChUrlDialogOpen(true)
  }, [])

  const doChangeUrl = useCallback(async () => {
    setChUrlDialogOpen(false)
    try {
      let Array = new TextEncoder().encode(urlInput)
      let HexString = byteToHexString(Array)
      const Len = (HexString.length / 2).toString(16).padStart(2, '0')

      await selectOpenPGPApplet()
      let res = await dispatch(transceive(`00da5f50${Len}${HexString}`))
      if (res.endsWith('9000')) {
        enqueueSnackbar('url changed', { variant: 'success' })
      } else {
        enqueueSnackbar('Change url failed', { variant: 'error' })
      }
    } catch (err) {
      enqueueSnackbar(err.toString(), { variant: 'error' })
    }
    sleep(500).then(() => {
      refresh()
    })
  }, [urlInput, selectOpenPGPApplet, dispatch, enqueueSnackbar, refresh])

  const onKeyPressChUrl = useCallback(
    async (e) => {
      if (e.key === 'Enter') {
        await doChangeUrl()
      }
    },
    [doChangeUrl]
  )
  return (
    <div className={classes.root}>
      <Grid container justify={'center'} spacing={3}>
        {MKValid ? (
          <Grid item xs={12} md={12}>
            <Card className={classes.card}>
              <CardContent>
                <Typography variant="h3">OpenPGP Applet</Typography>
                <Typography>url:{url}</Typography>
              </CardContent>
              <CardActions>
                <Button variant="contained" onClick={onChangeUrl}>
                  set url
                </Button>
              </CardActions>
            </Card>

            <Card className={classes.card}>
              <CardContent>
                <Typography variant="h3">Certificates</Typography>
                <Typography>Dealing with certificates.</Typography>
              </CardContent>
              <AppBar position="static" color="default">
                <Tabs
                  value={tabValue}
                  onChange={handleTabChange}
                  indicatorColor="primary"
                  textColor="primary"
                  centered
                >
                  <Tab label="SIGnature" {...a11yProps(0)} />
                  <Tab label="DECipher" {...a11yProps(1)} />
                  <Tab label="AUThentication" {...a11yProps(2)} />
                </Tabs>
              </AppBar>
              <TabPanel value={tabValue} index={0}>
                <Typography>
                  Certificate:{ownCrt ? 'Exist' : 'Not Exist'}
                </Typography>
                <Typography>
                  Key:
                  {keyState0 === '00'
                    ? 'Not Exist'
                    : keyState0 === '01'
                    ? 'Created by CanoKey'
                    : 'Imported'}
                </Typography>
                <ButtonGroup
                  variant="contained"
                  className={classes.buttonGroup}
                >
                  <Button variant="contained" onClick={onImportCrt}>
                    import cert
                  </Button>

                  <Button variant="contained" onClick={doExportCrt}>
                    export cert
                  </Button>

                  <Button variant="contained" onClick={doDeleteCrt}>
                    delete cert
                  </Button>
                </ButtonGroup>
                <ButtonGroup
                  variant="contained"
                  className={classes.buttonGroup}
                >
                  <Button variant="contained" onClick={onImportKey}>
                    import key
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => setCreatKeyDialogOpen(true)}
                  >
                    creat key
                  </Button>
                </ButtonGroup>
              </TabPanel>
              <TabPanel value={tabValue} index={1}>
                <Typography>
                  Certificate:{ownCrt ? 'Exist' : 'Not Exist'}
                </Typography>
                <Typography>
                  Key:
                  {keyState1 === '00'
                    ? 'Not Exist'
                    : keyState1 === '01'
                    ? 'Created by CanoKey'
                    : 'Imported'}
                </Typography>
                <ButtonGroup
                  variant="contained"
                  className={classes.buttonGroup}
                >
                  <Button variant="contained" onClick={onImportCrt}>
                    import cert
                  </Button>

                  <Button variant="contained" onClick={doExportCrt}>
                    export cert
                  </Button>

                  <Button variant="contained" onClick={doDeleteCrt}>
                    delete cert
                  </Button>
                </ButtonGroup>
                <ButtonGroup
                  variant="contained"
                  className={classes.buttonGroup}
                >
                  <Button variant="contained" onClick={onImportKey}>
                    import key
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => setCreatKeyDialogOpen(true)}
                  >
                    creat key
                  </Button>
                </ButtonGroup>
              </TabPanel>
              <TabPanel value={tabValue} index={2}>
                <Typography>
                  Certificate:{ownCrt ? 'Exist' : 'Not Exist'}
                </Typography>
                <Typography>
                  Key:
                  {keyState2 === '00'
                    ? 'Not Exist'
                    : keyState2 === '01'
                    ? 'Created by CanoKey'
                    : 'Imported'}
                </Typography>
                <ButtonGroup
                  variant="contained"
                  className={classes.buttonGroup}
                >
                  <Button variant="contained" onClick={onImportCrt}>
                    import cert
                  </Button>

                  <Button variant="contained" onClick={doExportCrt}>
                    export cert
                  </Button>

                  <Button variant="contained" onClick={doDeleteCrt}>
                    delete cert
                  </Button>
                </ButtonGroup>
                <ButtonGroup
                  variant="contained"
                  className={classes.buttonGroup}
                >
                  <Button variant="contained" onClick={onImportKey}>
                    import key
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => setCreatKeyDialogOpen(true)}
                  >
                    creat key
                  </Button>
                </ButtonGroup>
              </TabPanel>
            </Card>
          </Grid>
        ) : null}
        <Grid item xs={12} md={12}>
          <Card className={classes.card}>
            <CardContent>
              <Typography variant="h3">Password Management</Typography>
              <Typography>Manage OpenPGP PIN and Admin PIN.</Typography>
            </CardContent>
            <CardActions>
              <Button
                variant="contained"
                onClick={onMKAuthen}
                className={classes.button}
              >
                Authenticate
              </Button>

              {MKValid ? (
                <span>
                  <Button
                    variant="contained"
                    onClick={onChangePin}
                    className={classes.button}
                  >
                    change pin
                  </Button>
                  <Button
                    variant="contained"
                    onClick={onChangeMK}
                    className={classes.button}
                  >
                    change managementkey
                  </Button>
                </span>
              ) : null}
            </CardActions>
          </Card>
        </Grid>
      </Grid>
      <Dialog
        open={MKAuthenDialogOpen}
        onClose={() => setMKAuthenDialogOpen(false)}
      >
        <DialogTitle> Enter PIN and MK to Authenticate</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Enter PIN and Admin PIN below. Please be aware of retry count.
            This will not be stored in browser.
          </DialogContentText>
          <TextField
            error={!oldPinValid}
            label="PIN"
            type="password"
            autoFocus
            fullWidth
            onKeyPress={onKeyPressMKAuthen}
            onChange={(e) => {
              setOldPin(e.target.value)
              if (/^[A-Za-z0-9]{6,64}$/.test(e.target.value)) {
                setOldPinValid(true)
              } else {
                setOldPinValid(false)
              }
            }}
          />
          <TextField
            error={!nowMKValid}
            label="Admin PIN"
            type="password"
            fullWidth
            onKeyPress={onKeyPressMKAuthen}
            onChange={(e) => {
              setNowMK(e.target.value)
              if (/^[A-Za-z0-9]{8,64}$/.test(e.target.value)) {
                setNowMKValid(true)
              } else {
                setNowMKValid(false)
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            color="primary"
            onClick={doMKAuthen}
            disabled={!(oldPinValid && nowMKValid)}
          >
            Authenticate
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={chPinDialogOpen}
        onClose={() => {
          setChPinDialogOpen(false)
        }}
      >
        <DialogTitle> Enter new PIN for OpenPGP Applet</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Enter new PIN for OpenPGP Applet.
          </DialogContentText>
          <form className={classes.root} noValidate autoComplete="off">
            <TextField
              error={!newPinValid}
              label="newPIN"
              type="password"
              autoFocus
              fullWidth
              onKeyPress={onKeyPressChPin}
              onChange={(e) => {
                setNewPin(e.target.value)
                if (/^[A-Za-z0-9]{6,64}$/.test(e.target.value)) {
                  setNewPinValid(true)
                } else {
                  setNewPinValid(false)
                }
              }}
            />
          </form>
        </DialogContent>
        <DialogActions>
          <Button color="primary" onClick={doChangePin} disabled={!newPinValid}>
            Change Pin
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={chMKDialogOpen}
        onClose={() => {
          setChMKDialogOpen(false)
        }}
      >
        <DialogTitle> Enter new Admin PIN for OpenPGP Applet</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Enter new Admin PIN for OpenPGP Applet.
          </DialogContentText>
          <TextField
            error={!newMKValid}
            label="newMK"
            type="password"
            autoFocus
            fullWidth
            onKeyPress={onKeyPressChMK}
            onChange={(e) => {
              setNewMK(e.target.value)
              if (/^[A-Za-z0-9]{8,64}$/.test(e.target.value)) {
                setNewMKValid(true)
              } else {
                setNewMKValid(false)
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button color="primary" onClick={doChangeMK} disabled={!newMKValid}>
            Change MK
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={importCrtDialogOpen}
        onClose={() => {
          setImportCrtDialogOpen(false)
        }}
      >
        <DialogTitle> Choose Certificate to Import</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Choose Certificate in pem format below.
          </DialogContentText>
          <input type="file" id="file" />
        </DialogContent>
        <DialogActions>
          <Button color="primary" onClick={doImportCrt}>
            Import
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={creatKeyDialogOpen}
        onClose={() => setCreatKeyDialogOpen(false)}
      >
        <DialogTitle>Creat crt to PIV Applet</DialogTitle>
        <DialogContent>
          <DialogContentText>Set key and crt info below</DialogContentText>
          <FormGroup col>
            <TextField
              fullWidth
              label="Country Name (2 letter code)"
              value={country}
              error={country.length !== 2}
              helperText={
                country.length > 0 ? '' : 'country name should be 2 letter code'
              }
              onChange={(e) => setCountry(e.target.value)}
            />
            <TextField
              fullWidth
              label="State or Province Name"
              value={province}
              onChange={(e) => setProvince(e.target.value)}
            />
            <TextField
              fullWidth
              label="Locality Name (eg, city)"
              value={locality}
              onChange={(e) => setLocality(e.target.value)}
            />
            <TextField
              fullWidth
              label="Organization Name"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
            />
            <TextField
              fullWidth
              label="Organizational Unit Name"
              value={organizationUnit}
              onChange={(e) => setOrganizationUnit(e.target.value)}
            />
            <TextField
              fullWidth
              label="Common Name"
              value={common}
              onChange={(e) => setCommon(e.target.value)}
            />
            <FormControl>
              <InputLabel id="algo-label">Algorithm</InputLabel>
              <Select
                labelId="algo-label"
                value={algo}
                onChange={(e) => setAlgo(e.target.value)}
              >
                <MenuItem value={'NIST-P-256'}>NIST-P-256</MenuItem>
                <MenuItem value={'NIST-P-384'}>NIST-P-384</MenuItem>
                <MenuItem value={'secp256k1'}>secp256k1</MenuItem>
                <MenuItem value={'Curve-25519'}>Curve-25519</MenuItem>
                <MenuItem value={'RSA-2048'}>RSA-2048</MenuItem>
              </Select>
            </FormControl>
          </FormGroup>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" color="primary" onClick={doCreatKey}>
            Creat
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={importKeyDialogOpen}
        onClose={() => {
          setImportKeyDialogOpen(false)
        }}
      >
        <DialogTitle> Import your private key</DialogTitle>
        <DialogContent>
          {keyAlgo === 'Curve-25519' ? (
            <DialogContentText>
              Enter your private key in hexString below.
            </DialogContentText>
          ) : (
            <DialogContentText>
              Enter your private key in pem format below.
            </DialogContentText>
          )}

          <InputLabel id="keyalgo-label">Algorithm</InputLabel>
          <Select
            labelId="keyalgo-label"
            value={keyAlgo}
            onChange={(e) => setKeyAlgo(e.target.value)}
          >
            <MenuItem value={'NIST-P-256'}>NIST-P-256</MenuItem>
            <MenuItem value={'NIST-P-384'}>NIST-P-384</MenuItem>
            <MenuItem value={'secp256k1'}>secp256k1</MenuItem>
            <MenuItem value={'Curve-25519'}>Curve-25519</MenuItem>
            <MenuItem value={'RSA-2048'}>RSA-2048</MenuItem>
            <MenuItem value={'RSA-4096'}>RSA-4096</MenuItem>
          </Select>
          {keyAlgo === 'Curve-25519' ? (
            <TextField
              fullWidth
              label="Private Key"
              value={priKeyHex}
              onChange={(e) => setPriKeyHex(e.target.value)}
            />
          ) : (
            <TextField
              label="Private Key"
              autoFocus
              fullWidth
              multiline
              onKeyPress={onKeyPressImportKey}
              value={keyPem}
              onChange={(e) => setKeyPem(e.target.value)}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button color="primary" onClick={doImportKey}>
            Import
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={chUrlDialogOpen}
        onClose={() => {
          setChUrlDialogOpen(false)
        }}
      >
        <DialogTitle> Enter new url for OpenPGP Applet</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Enter new url for OpenPGP Applet.
          </DialogContentText>
          <form className={classes.root} noValidate autoComplete="off">
            <TextField
              label="new url"
              autoFocus
              fullWidth
              onKeyPress={onKeyPressChUrl}
              onChange={(e) => {
                setUrlInput(e.target.value)
              }}
            />
          </form>
        </DialogContent>
        <DialogActions>
          <Button color="primary" onClick={doChangeUrl}>
            Change Url
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
