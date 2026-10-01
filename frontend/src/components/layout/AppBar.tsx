"use client";

import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SettingsIcon from "@mui/icons-material/Settings";
import AppBar from "@mui/material/AppBar";
import Avatar from "@mui/material/Avatar";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useState, type MouseEvent } from "react";
import { useColorMode } from "@/components/providers/ThemeProvider";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { logout } from "@/lib/auth";

interface TopAppBarProps {
  onMenuToggle?: () => void;
  drawerWidth?: number;
}

export function TopAppBar({ onMenuToggle, drawerWidth = 240 }: TopAppBarProps) {
  const { mode, toggleColorMode } = useColorMode();
  const { data: user } = useCurrentUser();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleOpenUserMenu = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorEl(null);
  };

  const handleSignOut = async () => {
    handleCloseUserMenu();
    await logout();
  };

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        width: { sm: `calc(100% - ${drawerWidth}px)` },
        ml: { sm: `${drawerWidth}px` },
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid",
        borderColor: "divider",
        background: "transparent",
        backgroundColor: (t) =>
          t.palette.mode === "dark"
            ? "rgba(15,15,26,0.8)"
            : "rgba(248,250,252,0.8)",
      }}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          edge="start"
          onClick={onMenuToggle}
          sx={{ mr: 2, display: { sm: "none" } }}
        >
          <MenuIcon />
        </IconButton>

        <Typography variant="h6" noWrap sx={{ flexGrow: 1, fontWeight: 700 }}>
          Platform
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Tooltip title="Toggle theme">
            <IconButton onClick={toggleColorMode} color="inherit">
              {mode === "dark" ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
          </Tooltip>

          <Tooltip title="Notifications">
            <IconButton color="inherit">
              <Badge badgeContent={3} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          <Tooltip title={user?.full_name ?? "Account"}>
            <IconButton onClick={handleOpenUserMenu} sx={{ p: 0, ml: 1 }}>
              {user?.avatar_url ? (
                <Avatar src={user.avatar_url} sx={{ width: 36, height: 36 }} />
              ) : (
                <Avatar sx={{ width: 36, height: 36, bgcolor: "primary.main" }}>
                  <AccountCircleIcon />
                </Avatar>
              )}
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleCloseUserMenu}
            PaperProps={{
              elevation: 4,
              sx: {
                minWidth: 220,
                borderRadius: 3,
                mt: 1.5,
                border: "1px solid",
                borderColor: "divider",
                p: 0.5,
              },
            }}
            transformOrigin={{ horizontal: "right", vertical: "top" }}
            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
          >
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography variant="subtitle2" fontWeight={700} noWrap>
                {user?.full_name ?? "Platform User"}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" noWrap>
                {user?.email ?? "user@platform.dev"}
              </Typography>
              <Chip
                label={user?.role ?? "user"}
                size="small"
                color={user?.role === "admin" ? "error" : "primary"}
                sx={{ mt: 1, height: 20, fontSize: "0.7rem", fontWeight: 700 }}
              />
            </Box>

            <Divider sx={{ my: 0.5 }} />

            <MenuItem component={Link} href="/settings" onClick={handleCloseUserMenu} sx={{ borderRadius: 1.5 }}>
              <ListItemIcon>
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Settings" />
            </MenuItem>

            <MenuItem onClick={handleSignOut} sx={{ borderRadius: 1.5, color: "error.main" }}>
              <ListItemIcon sx={{ color: "error.main" }}>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Sign Out" />
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
