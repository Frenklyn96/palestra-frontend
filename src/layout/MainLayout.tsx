import React, { useState } from 'react';
import {
  Box, CssBaseline, Drawer, IconButton, List, ListItem, ListItemText, Toolbar, AppBar, Typography, ListItemButton, Button, Menu, MenuItem
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { Link } from 'react-router-dom';
import { RoutesEnum } from '../enum/RoutesEnum'; // Importa l'enum con le rotte
import { useTranslation } from 'react-i18next';  // Importiamo il hook useTranslation per gestire la lingua
import '../styles/MainLayout.css'; // Importa il CSS relativo al layout

const drawerWidth = 240;

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null); // Stato per il menu della lingua
  const { i18n } = useTranslation();  // Hook per gestire le lingue
  const openMenu = Boolean(anchorEl); // Verifica se il menu della lingua è aperto

  const toggleDrawer = () => setOpen(!open);

  const menuItems = [
    { label: 'Home', route: RoutesEnum.HOME },
    { label: 'Clienti', route: RoutesEnum.CLIENTI },
    { label: 'Transazioni', route: RoutesEnum.TRANSAZIONI },
    { label: 'Settings', route: RoutesEnum.SETTINGS },
  ];

  // Funzione per aprire il menu della lingua
  const handleLanguageMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  // Funzione per chiudere il menu della lingua
  const handleLanguageMenuClose = () => {
    setAnchorEl(null);
  };

  // Funzione per cambiare la lingua
  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);  // Cambia la lingua con i18next
    handleLanguageMenuClose();  // Chiudi il menu dopo aver cambiato la lingua
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar position="fixed" className="appBar">
        <Toolbar>
          <IconButton color="inherit" onClick={toggleDrawer} edge="start" sx={{ mr: 2 }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap>My Gym App</Typography>

          {/* Bottone per cambiare lingua */}
          <Button
            color="inherit"
            onClick={handleLanguageMenuOpen}
            sx={{ ml: 'auto' }}
          >
            {i18n.language === 'it' ? 'Italiano' : 'English'}
          </Button>

          {/* Menu per selezionare la lingua */}
          <Menu
            anchorEl={anchorEl}
            open={openMenu}
            onClose={handleLanguageMenuClose}
          >
            <MenuItem onClick={() => changeLanguage('it')}>Italiano</MenuItem>
            <MenuItem onClick={() => changeLanguage('en')}>English</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="temporary"
        open={open}
        onClose={toggleDrawer}
        sx={{
          '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' },
        }}
        className="drawer"
      >
        <Toolbar />
        <List>
          {menuItems.map((item) => (
            <ListItem key={item.route} component={Link} to={item.route} onClick={toggleDrawer}>
              <ListItemButton>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>

      <Box component="main" className="mainContent">
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
};

export default MainLayout;
