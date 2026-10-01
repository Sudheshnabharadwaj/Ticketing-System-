"use client";

import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { login } from "@/lib/auth";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await login(); // redirects to Keycloak
    } catch (err: unknown) {
      setLoading(false);
      const msg = err instanceof Error ? err.message : String(err);
      setError(
        `Unable to connect to Keycloak auth server (${msg || "connection failure"}). Please verify http://localhost:8080 is accessible.`
      );
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(ellipse 60% 60% at 50% 0%, rgba(99,102,241,0.2), transparent)",
      }}
    >
      <Container maxWidth="xs">
        <Paper
          elevation={0}
          sx={{
            p: 4,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 3,
            backdropFilter: "blur(20px)",
          }}
        >
          <Avatar sx={{ bgcolor: "primary.main", width: 56, height: 56 }}>
            <LockOutlinedIcon />
          </Avatar>

          <Box textAlign="center">
            <Typography variant="h5" fontWeight={700} gutterBottom>
              Welcome back
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sign in to your Platform account to continue
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ width: "100%", textAlign: "left" }}>
              {error}
            </Alert>
          )}

          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={handleLogin}
            disabled={loading}
            sx={{ py: 1.5 }}
            startIcon={
              loading ? <CircularProgress size={20} color="inherit" /> : null
            }
          >
            {loading ? "Redirecting…" : "Sign in with SSO"}
          </Button>

          <Typography variant="caption" color="text.disabled" textAlign="center">
            Secured by Keycloak — OAuth 2.0 + OpenID Connect
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}
