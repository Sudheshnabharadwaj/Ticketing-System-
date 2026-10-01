"use client";

import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloudQueueIcon from "@mui/icons-material/CloudQueue";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import NotificationsIcon from "@mui/icons-material/Notifications";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import StorageIcon from "@mui/icons-material/Storage";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export default function SettingsPage() {
  const { data: user, isLoading } = useCurrentUser();
  const [savedAlert, setSavedAlert] = useState(false);
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    weeklyDigest: false,
    securityAlerts: true,
  });

  const handleSave = () => {
    setSavedAlert(true);
    setTimeout(() => setSavedAlert(false), 4000);
  };

  return (
    <Box sx={{ maxWidth: 1000, mx: "auto" }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Workspace Settings
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your account profile, authentication sessions, and system integrations.
        </Typography>
      </Box>

      {savedAlert && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Settings updated successfully!
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Profile Card */}
        <Grid item xs={12} md={7}>
          <Card sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
                <PersonOutlineIcon color="primary" />
                <Typography variant="h6" fontWeight={700}>
                  Account Profile
                </Typography>
              </Stack>

              <Stack direction="row" alignItems="center" spacing={3} sx={{ mb: 4 }}>
                <Avatar
                  sx={{
                    width: 72,
                    height: 72,
                    bgcolor: "primary.main",
                    fontSize: 24,
                    fontWeight: 700,
                  }}
                >
                  {user?.full_name?.slice(0, 2).toUpperCase() ?? "AU"}
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight={700}>
                    {user?.full_name ?? "Platform User"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {user?.email ?? "user@platform.dev"}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Chip label={user?.role ?? "user"} size="small" color="primary" sx={{ fontWeight: 600 }} />
                    <Chip label="Keycloak Managed" size="small" variant="outlined" />
                  </Stack>
                </Box>
              </Stack>

              <Stack spacing={2.5}>
                <TextField
                  label="Full Name"
                  fullWidth
                  defaultValue={user?.full_name ?? "Platform User"}
                />
                <TextField
                  label="Email Address"
                  fullWidth
                  disabled
                  defaultValue={user?.email ?? "user@platform.dev"}
                  helperText="Email is synchronized from Keycloak SSO and cannot be modified locally."
                />
              </Stack>
            </CardContent>
          </Card>

          {/* Notifications Card */}
          <Card sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
                <NotificationsIcon color="primary" />
                <Typography variant="h6" fontWeight={700}>
                  Notifications
                </Typography>
              </Stack>

              <Stack spacing={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={notifications.emailAlerts}
                      onChange={(e) =>
                        setNotifications({ ...notifications, emailAlerts: e.target.checked })
                      }
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="subtitle2" fontWeight={600}>
                        Email Task Notifications
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Receive email alerts when project tasks are assigned or updated.
                      </Typography>
                    </Box>
                  }
                />
                <Divider />
                <FormControlLabel
                  control={
                    <Switch
                      checked={notifications.weeklyDigest}
                      onChange={(e) =>
                        setNotifications({ ...notifications, weeklyDigest: e.target.checked })
                      }
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="subtitle2" fontWeight={600}>
                        Weekly Workspace Digest
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Summary report of project milestones and team performance.
                      </Typography>
                    </Box>
                  }
                />
                <Divider />
                <FormControlLabel
                  control={
                    <Switch
                      checked={notifications.securityAlerts}
                      onChange={(e) =>
                        setNotifications({ ...notifications, securityAlerts: e.target.checked })
                      }
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="subtitle2" fontWeight={600}>
                        Security & Auth Alerts
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Immediate notification for new logins and permission changes.
                      </Typography>
                    </Box>
                  }
                />
              </Stack>

              <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
                <Button variant="contained" onClick={handleSave}>
                  Save Preferences
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Security & System Status Side Column */}
        <Grid item xs={12} md={5}>
          {/* Security & SSO Card */}
          <Card sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                <LockOutlinedIcon color="primary" />
                <Typography variant="h6" fontWeight={700}>
                  Security & SSO
                </Typography>
              </Stack>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                Your identity is secured by Keycloak with PKCE S256 OAuth 2.0 flow.
              </Typography>

              <Stack spacing={1.5}>
                <Box sx={{ p: 2, bgcolor: "action.hover", borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Auth Server URL
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    http://localhost:8080
                  </Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: "action.hover", borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    SSO Realm
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    platform
                  </Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: "action.hover", borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Client ID
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    frontend-app
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          {/* Infrastructure Health Card */}
          <Card sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                <StorageIcon color="primary" />
                <Typography variant="h6" fontWeight={700}>
                  Infrastructure Status
                </Typography>
              </Stack>

              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CheckCircleIcon color="success" fontSize="small" />
                    <Typography variant="body2">FastAPI Backend</Typography>
                  </Stack>
                  <Chip label="Port 8000" size="small" variant="outlined" />
                </Stack>
                <Divider />
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CheckCircleIcon color="success" fontSize="small" />
                    <Typography variant="body2">PostgreSQL 16</Typography>
                  </Stack>
                  <Chip label="Port 5433" size="small" variant="outlined" />
                </Stack>
                <Divider />
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CheckCircleIcon color="success" fontSize="small" />
                    <Typography variant="body2">Redis 7</Typography>
                  </Stack>
                  <Chip label="Port 6379" size="small" variant="outlined" />
                </Stack>
                <Divider />
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CheckCircleIcon color="success" fontSize="small" />
                    <Typography variant="body2">MinIO Object Store</Typography>
                  </Stack>
                  <Chip label="Port 9000/9001" size="small" variant="outlined" />
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
