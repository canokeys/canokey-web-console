import React, { useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import logo from './logo.png';
import { Toolbar, AppBar, IconButton, Typography, Drawer, List, ListItem, ListItemIcon, ListItemText, Divider } from '@material-ui/core';
import MenuIcon from '@material-ui/icons/Menu';

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
  },
  icon: {
    paddingLeft: "20px",
    paddingTop: "10px",
    paddingBottom: "10px",
    width: "70%",
  },
}));

function App() {
  const classes = useStyles();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className={classes.root}>
      <AppBar position="static">
        <Toolbar>
          <IconButton edge="start" color="inherit" aria-label="menu" onClick={() => setDrawerOpen(true)}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" >
            CanoKey Web Console
          </Typography>
        </Toolbar>
      </AppBar>
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}>
        <img src={logo} alt="logo" className={classes.icon}/>
        <List>
          <Divider/>
          <ListItem button>
            <ListItemIcon><MenuIcon /></ListItemIcon>
            <ListItemText>Admin</ListItemText>
          </ListItem>
          <ListItem button>
            <ListItemIcon><MenuIcon /></ListItemIcon>
            <ListItemText>CTAP</ListItemText>
          </ListItem>
          <ListItem button>
            <ListItemIcon><MenuIcon /></ListItemIcon>
            <ListItemText>OATH</ListItemText>
          </ListItem>
          <ListItem button>
            <ListItemIcon><MenuIcon /></ListItemIcon>
            <ListItemText>OpenPGP</ListItemText>
          </ListItem>
          <ListItem button>
            <ListItemIcon><MenuIcon /></ListItemIcon>
            <ListItemText>PIV</ListItemText>
          </ListItem>
        </List>
      </Drawer>
    </div>
  );
}

export default App;
