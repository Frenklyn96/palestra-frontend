import React, { useState } from 'react';
import {
  Box,
  CssBaseline,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Button,
  Menu,
  MenuItem,
  Toolbar,
  useTheme,
  useMediaQuery,
  IconButton,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { RoutesEnum } from '../enum/RoutesEnum';
import { useTranslation } from 'react-i18next';

import HomeIcon from '@mui/icons-material/Home';
import PeopleIcon from '@mui/icons-material/People';
import PaymentIcon from '@mui/icons-material/Payment';
import SettingsIcon from '@mui/icons-material/Settings';
import MenuIcon from '@mui/icons-material/Menu';

import '../styles/MainLayout.css';

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { i18n } = useTranslation();
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const toggleDrawer = () => setOpen(!open);

  const menuItems = [
    { label: 'Home', route: RoutesEnum.HOME, icon: <HomeIcon /> },
    { label: 'Clienti', route: RoutesEnum.CLIENTI, icon: <PeopleIcon /> },
    { label: 'Transazioni', route: RoutesEnum.TRANSAZIONI, icon: <PaymentIcon /> },
    { label: 'Settings', route: RoutesEnum.SETTINGS, icon: <SettingsIcon /> },
  ];

  const handleLanguageMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleLanguageMenuClose = () => {
    setAnchorEl(null);
  };

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    handleLanguageMenuClose();
  };

  return (
    <Box className="layout">
      <CssBaseline />

      {/* Bottone hamburger solo su schermi piccoli */}
      {isSmallScreen && (
        <IconButton
          color="inherit"
          aria-label="open drawer"
          onClick={toggleDrawer}
          edge="start"
          className="hamburgerButton"

        >
          <MenuIcon />
        </IconButton>
      )}

      <Drawer
        variant={isSmallScreen ? 'temporary' : 'persistent'}
        open={isSmallScreen ? open : true}
        onClose={toggleDrawer}
        className="drawer"
        ModalProps={{
          keepMounted: true, // migliora performance mobile
        }}
      >
        <Toolbar />
        <Box className="drawerContent">
          <List className="menuList">
            {menuItems.map((item) => (
              <ListItem
                key={item.route}
                component={Link}
                to={item.route}
                onClick={isSmallScreen ? toggleDrawer : undefined}
                disablePadding
              >
                <ListItemButton className="menuItemButton">
                  {item.icon}
                  <ListItemText primary={item.label} className="menuItemText" />
                </ListItemButton>
              </ListItem>
            ))}
          </List>

          <Box className="languageSelector">
            <Button
              onClick={handleLanguageMenuOpen}
              className="languageButtonDrawer"
            >
              {i18n.language === 'it' ? 'IT' : 'EN'}
            </Button>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleLanguageMenuClose}
            >
              <MenuItem onClick={() => changeLanguage('it')}>Italiano</MenuItem>
              <MenuItem onClick={() => changeLanguage('en')}>English</MenuItem>
            </Menu>
          </Box>
        </Box>
      </Drawer>

      <Box
        component="main"
        className={`mainContent ${isSmallScreen ? 'shifted' : ''}`}
      >
        {children}
      </Box>
    </Box>
  );
};

export default MainLayout;
