"use client";

import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider as MuiThemeProvider, createTheme } from "@mui/material/styles";
import { useMemo, useState, createContext, useContext, type ReactNode } from "react";

type ColorMode = "light" | "dark";

interface ColorModeContextType {
  mode: ColorMode;
  toggleColorMode: () => void;
}

export const ColorModeContext = createContext<ColorModeContextType>({
  mode: "dark",
  toggleColorMode: () => {},
});

export const useColorMode = () => useContext(ColorModeContext);

function buildTheme(mode: ColorMode) {
  return createTheme({
    palette: {
      mode,
      primary: {
        main: "#6366f1", // Indigo-500
        light: "#818cf8",
        dark: "#4f46e5",
      },
      secondary: {
        main: "#14b8a6", // Teal-500
      },
      background:
        mode === "dark"
          ? { default: "#0f0f1a", paper: "#1a1a2e" }
          : { default: "#f8fafc", paper: "#ffffff" },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: { fontWeight: 700 },
      h2: { fontWeight: 700 },
      h3: { fontWeight: 600 },
    },
    shape: { borderRadius: 12 },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
            fontWeight: 600,
            borderRadius: 8,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            boxShadow:
              mode === "dark"
                ? "0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.5)"
                : "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)",
          },
        },
      },
    },
  });
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ColorMode>("dark");

  const colorMode = useMemo(
    () => ({
      mode,
      toggleColorMode: () =>
        setMode((prev) => (prev === "light" ? "dark" : "light")),
    }),
    [mode]
  );

  const theme = useMemo(() => buildTheme(mode), [mode]);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ColorModeContext.Provider>
  );
}
