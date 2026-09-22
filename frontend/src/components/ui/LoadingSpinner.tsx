"use client";

import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";

interface LoadingSpinnerProps {
  fullPage?: boolean;
  size?: number;
}

export function LoadingSpinner({ fullPage = false, size = 40 }: LoadingSpinnerProps) {
  if (fullPage) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <CircularProgress size={size} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
      <CircularProgress size={size} />
    </Box>
  );
}
