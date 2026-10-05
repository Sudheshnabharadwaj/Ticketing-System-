"use client";

import React, { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import PersonAddOutlinedIcon from "@mui/icons-material/PersonAddOutlined";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignUpPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError("Full Name is required.");
      return;
    }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid work email address.");
      return;
    }
    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    setTimeout(() => {
      // Store user locally
      try {
        const raw = localStorage.getItem("platform_all_users");
        const users = raw ? JSON.parse(raw) : [];
        const cleanEmail = email.trim().toLowerCase();
        const existing = users.find((u: any) => u.email?.toLowerCase() === cleanEmail);
        if (existing) {
          setError("An account with this email address already exists. Please log in instead.");
          setLoading(false);
          return;
        }

        const newUser = {
          id: `usr-${Date.now()}`,
          name: fullName.trim(),
          email: cleanEmail,
          password,
          role: "employee",
          status: "Active",
          createdAt: new Date().toISOString().split("T")[0]
        };
        users.unshift(newUser);
        localStorage.setItem("platform_all_users", JSON.stringify(users));
      } catch {}

      setLoading(false);
      setSuccess("Account created successfully! Redirecting to Login...");

      // Enforce flow: Sign Up -> Login -> Dashboard
      setTimeout(() => {
        router.push("/auth/login");
      }, 800);
    }, 400);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(ellipse 60% 60% at 50% 0%, rgba(99,102,241,0.2), transparent)",
        py: 4,
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
            gap: 2.5,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 3,
            backdropFilter: "blur(20px)",
          }}
        >
          <Avatar sx={{ bgcolor: "primary.main", width: 56, height: 56 }}>
            <PersonAddOutlinedIcon />
          </Avatar>

          <Box sx={{ textAlign: "center" }}>
            <Typography variant="h5" fontWeight={700}>
              Create an Account
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Register to access your platform workspace
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ width: "100%" }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ width: "100%" }}>
              {success}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ width: "100%", display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="Full Name"
              required
              fullWidth
              size="small"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <TextField
              label="Work Email"
              type="email"
              required
              fullWidth
              size="small"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              label="Password"
              type="password"
              required
              fullWidth
              size="small"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              helperText="Minimum 8 characters"
            />
            <TextField
              label="Confirm Password"
              type="password"
              required
              fullWidth
              size="small"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              sx={{ mt: 1 }}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </Button>
          </Box>

          <Typography variant="body2" color="text.secondary">
            Already have an account?{" "}
            <Link href="/auth/login" style={{ color: "#6366f1", fontWeight: 600 }}>
              Sign In
            </Link>
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}
