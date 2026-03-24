import React, { useState } from "react";
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
  Divider,
  Tooltip,
} from "@mui/material";
import { Link } from "react-router-dom";
import { RoutesEnum } from "../enum/RoutesEnum";
import { useTranslation } from "react-i18next";

import HomeIcon from "@mui/icons-material/Home";
import PeopleIcon from "@mui/icons-material/People";
import PaymentIcon from "@mui/icons-material/Payment";
import SettingsIcon from "@mui/icons-material/Settings";
import MenuIcon from "@mui/icons-material/Menu";
import LoginIcon from "@mui/icons-material/Login";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import { useClerk } from "@clerk/clerk-react";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import "../styles/MainLayout.css";

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { i18n } = useTranslation();
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const toggleDrawer = () => setOpen(!open);
  const clerk = useClerk();
  const { t } = useTranslation();

  const menuItems = [
    { label: t("mainLayout.home"), route: RoutesEnum.HOME, icon: <HomeIcon /> },
    {
      label: t("mainLayout.clients"),
      route: RoutesEnum.CLIENTI,
      icon: <PeopleIcon />,
    },
    {
      label: t("mainLayout.transactions"),
      route: RoutesEnum.TRANSAZIONI,
      icon: <PaymentIcon />,
    },
    {
      label: t("mainLayout.entries"),
      route: RoutesEnum.INGRESSI,
      icon: <LoginIcon />,
    },
    {
      label: t("mainLayout.settings"),
      route: RoutesEnum.SETTINGS,
      icon: <SettingsIcon />,
    },
    ...(isSmallScreen
      ? []
      : [
          {
            label: "Scanner",
            route: RoutesEnum.SCANNER,
            icon: <QrCodeScannerIcon />,
          },
        ]),
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
  const handleLogout = () => {
    // logica di logout (es. pulizia token, redirect, ecc.)
    clerk.signOut();
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
        variant={isSmallScreen ? "temporary" : "persistent"}
        open={isSmallScreen ? open : true}
        onClose={toggleDrawer}
        className="drawer"
        sx={{
          width: 240,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: 240,
            boxSizing: "border-box",
          },
        }}
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
            <Box sx={{ my: 1 }}>
              <Divider
                sx={{
                  backgroundColor: "white",
                  opacity: 0.3,
                  height: "2px",
                  borderRadius: "4px",
                  mx: 2, // margine orizzontale (evita che tocchi i bordi)
                  my: 1.5, // margine verticale per separarlo visivamente
                }}
              />
            </Box>

            {/* Logout come ultimo elemento */}
            <ListItem disablePadding>
              <ListItemButton
                onClick={handleLogout}
                className="menuItemButton logoutItem"
              >
                <ExitToAppIcon sx={{ marginRight: 1 }} />
                <ListItemText primary="Logout" className="menuItemText" />
              </ListItemButton>
            </ListItem>
          </List>

          <Box className="languageSelector">
            <Tooltip title={t("mainLayout.languageSelector")}>
              <Button
                onClick={handleLanguageMenuOpen}
                className="languageButtonDrawer"
              >
                {i18n.language === "it" ? "IT" : "EN"}
              </Button>
            </Tooltip>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleLanguageMenuClose}
            >
              <MenuItem onClick={() => changeLanguage("it")}>Italiano</MenuItem>
              <MenuItem onClick={() => changeLanguage("en")}>English</MenuItem>
            </Menu>
          </Box>
        </Box>
      </Drawer>

      <Box
        component="main"
        className={`mainContent ${isSmallScreen ? "shifted" : ""}`}
      >
        {children}
      </Box>
    </Box>
  );
};

export default MainLayout;
