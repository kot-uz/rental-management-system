import React, { useState, useEffect, Suspense } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  useMediaQuery,
  useTheme,
  Divider,
  Avatar,
  Menu,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import {
  Dashboard,
  Apartment,
  People,
  Assignment,
  AttachMoney,
  Build,
  ElectricBolt,
  Engineering,
  History,
  Settings,
  Webhook,
  LocalOffer,
  Lock,
  Menu as MenuIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAppSelector, useAppDispatch } from '../../shared/hooks/useAppSelector';
import { logout } from '../../entities/auth/model/authSlice';
import { NotificationBell } from '../NotificationBell/NotificationBell';
import { GlobalSearchBar } from '../GlobalSearchBar/GlobalSearchBar';
import { LanguageSwitcher } from '../../shared/ui/LanguageSwitcher';
import { usePermissions } from '../../shared/hooks/usePermissions';

const DRAWER_WIDTH = 240;

export function AppLayout() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const { can } = usePermissions();

  const navItems = [
    { labelKey: 'nav.dashboard', icon: <Dashboard />, path: '/' },
    { labelKey: 'nav.apartments', icon: <Apartment />, path: '/apartments' },
    { labelKey: 'nav.tenants', icon: <People />, path: '/tenants' },
    { labelKey: 'nav.leases', icon: <Assignment />, path: '/leases' },
    { labelKey: 'nav.rent', icon: <AttachMoney />, path: '/rent' },
    { labelKey: 'nav.utilities', icon: <ElectricBolt />, path: '/utilities' },
    { labelKey: 'nav.repairs', icon: <Build />, path: '/repairs' },
    { labelKey: 'nav.contractors', icon: <Engineering />, path: '/contractors' },
    ...(can('audit:read') ? [{ labelKey: 'nav.audit', icon: <History />, path: '/audit' }] : []),
    ...(can('accounting:read') ? [{ labelKey: 'nav.accounting', icon: <Lock />, path: '/accounting' }] : []),
    ...(can('tags:read') ? [{ labelKey: 'nav.tags', icon: <LocalOffer />, path: '/tags' }] : []),
    ...(can('webhooks:read') ? [{ labelKey: 'nav.webhooks', icon: <Webhook />, path: '/webhooks' }] : []),
    ...(can('org:read') ? [{ labelKey: 'nav.settings', icon: <Settings />, path: '/settings' }] : []),
  ];

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const drawerContent = (
    <Box>
      <Toolbar>
        <Typography variant="h6" fontWeight={700} color="primary">
          RentManager
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {navItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path))}
              onClick={() => {
                navigate(item.path);
                if (isMobile) setMobileOpen(false);
              }}
              sx={{ borderRadius: 1, mx: 1, my: 0.25 }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={t(item.labelKey)} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1, bgcolor: 'white', color: 'text.primary' }} elevation={1}>
        <Toolbar>
          {isMobile && (
            <IconButton edge="start" onClick={() => setMobileOpen(true)} sx={{ mr: 2 }}>
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" fontWeight={700} color="primary" sx={{ display: { xs: 'block', md: 'none' } }}>
            RentManager
          </Typography>
          <Box sx={{ mx: { xs: 1, sm: 2 } }}>
            <GlobalSearchBar />
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <LanguageSwitcher />
          <NotificationBell />
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 14 }}>
              {user?.firstName?.[0] ?? 'U'}
            </Avatar>
          </IconButton>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
            <MenuItem disabled>
              <Typography variant="body2">{user?.email}</Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>{t('nav.logout')}</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant={isMobile ? 'temporary' : 'permanent'}
          open={isMobile ? mobileOpen : true}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
          }}
        >
          {drawerContent}
        </Drawer>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 3 }, mt: 8, width: { md: `calc(100% - ${DRAWER_WIDTH}px)` } }}>
        <Suspense fallback={<Box display="flex" justifyContent="center" mt={8}><CircularProgress /></Box>}>
          <Outlet />
        </Suspense>
      </Box>
    </Box>
  );
}
