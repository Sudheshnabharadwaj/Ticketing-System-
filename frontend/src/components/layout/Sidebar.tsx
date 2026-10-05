"use client";

import DashboardIcon from "@mui/icons-material/Dashboard";
import FolderIcon from "@mui/icons-material/Folder";
import LogoutIcon from "@mui/icons-material/Logout";
import PeopleIcon from "@mui/icons-material/People";
import SettingsIcon from "@mui/icons-material/Settings";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ElementType } from "react";
import { logout } from "@/lib/auth";

export const DRAWER_WIDTH = 240;

interface NavItem {
  label: string;
  href: string;
  icon: ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: DashboardIcon },
  { label: "Projects", href: "/projects", icon: FolderIcon },
  { label: "Team", href: "/team", icon: PeopleIcon },
];

const BOTTOM_ITEMS: NavItem[] = [
  { label: "Settings", href: "/settings", icon: SettingsIcon },
];

function NavList({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <List dense>
      {items.map(({ label, href, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <ListItem key={href} disablePadding sx={{ px: 1, mb: 0.5 }}>
            <ListItemButton
              component={Link}
              href={href}
              selected={active}
              sx={{
                borderRadius: 2,
                "&.Mui-selected": {
                  bgcolor: "primary.main",
                  color: "primary.contrastText",
                  "& .MuiListItemIcon-root": { color: "primary.contrastText" },
                  "&:hover": { bgcolor: "primary.dark" },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={label} />
            </ListItemButton>
          </ListItem>
        );
      })}
    </List>
  );
}

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

function DrawerContent() {
  const handleLogout = async () => {
    await logout();
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Toolbar sx={{ px: 2 }}>
        <Typography variant="h6" fontWeight={800} color="primary">
          ⬡ Platform
        </Typography>
      </Toolbar>
      <Divider />

      <Box sx={{ flex: 1, overflow: "auto", pt: 1 }}>
        <NavList items={NAV_ITEMS} />
        <Divider sx={{ my: 1.5 }} />
        <Typography variant="overline" sx={{ px: 2, color: "text.secondary", fontWeight: 700, letterSpacing: 1 }}>
          Role Portals
        </Typography>
        <List dense>
          <ListItem disablePadding sx={{ px: 1, mb: 0.5 }}>
            <ListItemButton
              component="a"
              href="http://localhost:5173"
              target="_blank"
              rel="noopener noreferrer"
              sx={{ borderRadius: 2 }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: "primary.main" }}>
                <PeopleIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Admin Portal"
                secondary="Port 5173"
                primaryTypographyProps={{ variant: "body2", fontWeight: 600 }}
                secondaryTypographyProps={{ variant: "caption" }}
              />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding sx={{ px: 1, mb: 0.5 }}>
            <ListItemButton
              component="a"
              href="http://localhost:4173"
              target="_blank"
              rel="noopener noreferrer"
              sx={{ borderRadius: 2 }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: "#14b8a6" }}>
                <FolderIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Employee Portal"
                secondary="Port 4173"
                primaryTypographyProps={{ variant: "body2", fontWeight: 600 }}
                secondaryTypographyProps={{ variant: "caption" }}
              />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding sx={{ px: 1, mb: 0.5 }}>
            <ListItemButton
              component="a"
              href="http://localhost:4174"
              target="_blank"
              rel="noopener noreferrer"
              sx={{ borderRadius: 2 }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: "warning.main" }}>
                <DashboardIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Team Lead Portal"
                secondary="Port 4174"
                primaryTypographyProps={{ variant: "body2", fontWeight: 600 }}
                secondaryTypographyProps={{ variant: "caption" }}
              />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>

      <Divider />
      <Box sx={{ pb: 1 }}>
        <NavList items={BOTTOM_ITEMS} />
        <List dense>
          <ListItem disablePadding sx={{ px: 1 }}>
            <ListItemButton
              onClick={handleLogout}
              sx={{
                borderRadius: 2,
                color: "error.main",
                "&:hover": { bgcolor: "error.main", color: "#fff", "& .MuiListItemIcon-root": { color: "#fff" } },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: "error.main" }}>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Sign Out" />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>
    </Box>
  );
}

export function Sidebar({ mobileOpen = false, onClose }: SidebarProps) {
  return (
    <Box
      component="nav"
      sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: { sm: 0 } }}
    >
      {/* Mobile */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", sm: "none" },
          "& .MuiDrawer-paper": { width: DRAWER_WIDTH, boxSizing: "border-box" },
        }}
      >
        <DrawerContent />
      </Drawer>

      {/* Desktop */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", sm: "block" },
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
            borderRight: "1px solid",
            borderColor: "divider",
          },
        }}
        open
      >
        <DrawerContent />
      </Drawer>
    </Box>
  );
}
