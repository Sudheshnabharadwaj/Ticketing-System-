"use client";

import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import { useState, type ReactNode } from "react";
import { TopAppBar } from "./AppBar";
import { DRAWER_WIDTH, Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <TopAppBar
        onMenuToggle={() => setMobileOpen((o) => !o)}
        drawerWidth={DRAWER_WIDTH}
      />
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Toolbar />
        <Box sx={{ flex: 1, p: { xs: 2, md: 3 } }}>{children}</Box>
      </Box>
    </Box>
  );
}
