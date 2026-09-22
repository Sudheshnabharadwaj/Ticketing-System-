"use client";

import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import MenuIcon from "@mui/icons-material/Menu";
import NotificationsIcon from "@mui/icons-material/Notifications";
import AppBar from "@mui/material/AppBar";
import Avatar from "@mui/material/Avatar";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

import { useColorMode } from "@/components/providers/ThemeProvider";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface TopAppBarProps {
  onMenuToggle?: () => void;
  drawerWidth?: number;
}

export function TopAppBar({ onMenuToggle, drawerWidth = 240 }: TopAppBarProps) {
  const { mode, toggleColorMode } = useColorMode();
  const { data: user } = useCurrentUser();

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
            <IconButton sx={{ p: 0, ml: 1 }}>
              {user?.avatar_url ? (
                <Avatar src={user.avatar_url} sx={{ width: 36, height: 36 }} />
              ) : (
                <Avatar sx={{ width: 36, height: 36, bgcolor: "primary.main" }}>
                  <AccountCircleIcon />
                </Avatar>
              )}
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
