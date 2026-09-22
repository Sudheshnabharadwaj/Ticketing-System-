"use client";

import DashboardIcon from "@mui/icons-material/Dashboard";
import FolderIcon from "@mui/icons-material/Folder";
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
      </Box>

      <Divider />
      <Box sx={{ pb: 1 }}>
        <NavList items={BOTTOM_ITEMS} />
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
