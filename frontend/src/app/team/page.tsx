"use client";

import AddIcon from "@mui/icons-material/Add";
import EmailIcon from "@mui/icons-material/Email";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import SearchIcon from "@mui/icons-material/Search";
import SecurityIcon from "@mui/icons-material/Security";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";

interface Member {
  id: string;
  name: string;
  email: string;
  role: "Administrator" | "Lead Engineer" | "Frontend Developer" | "DevOps Specialist";
  status: "Active" | "Away" | "Offline";
  initials: string;
  projectsCount: number;
}

const INITIAL_MEMBERS: Member[] = [
  {
    id: "1",
    name: "Admin User",
    email: "admin@platform.dev",
    role: "Administrator",
    status: "Active",
    initials: "AU",
    projectsCount: 4,
  },
  {
    id: "2",
    name: "Platform User",
    email: "user@platform.dev",
    role: "Lead Engineer",
    status: "Active",
    initials: "PU",
    projectsCount: 3,
  },
  {
    id: "3",
    name: "Alex Bennett",
    email: "alex.b@platform.dev",
    role: "Frontend Developer",
    status: "Away",
    initials: "AB",
    projectsCount: 2,
  },
  {
    id: "4",
    name: "Samira Khan",
    email: "samira.k@platform.dev",
    role: "DevOps Specialist",
    status: "Active",
    initials: "SK",
    projectsCount: 3,
  },
];

const STATUS_CHIP_COLORS: Record<Member["status"], "success" | "warning" | "default"> = {
  Active: "success",
  Away: "warning",
  Offline: "default",
};

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [openModal, setOpenModal] = useState(false);
  const [newMember, setNewMember] = useState({
    name: "",
    email: "",
    role: "Frontend Developer" as Member["role"],
  });

  const handleInvite = () => {
    if (!newMember.name.trim() || !newMember.email.trim()) return;
    const initials = newMember.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    const created: Member = {
      id: String(Date.now()),
      name: newMember.name,
      email: newMember.email,
      role: newMember.role,
      status: "Active",
      initials: initials || "TM",
      projectsCount: 0,
    };
    setMembers([created, ...members]);
    setNewMember({ name: "", email: "", role: "Frontend Developer" });
    setOpenModal(false);
  };

  const filtered = members.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()) ||
      m.role.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || m.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <Box>
      {/* Header */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        sx={{ mb: 4 }}
      >
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Team Members
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage workspace access, team roles, and collaborative permissions.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenModal(true)}
          sx={{ borderRadius: 2, px: 2.5, py: 1 }}
        >
          Invite Member
        </Button>
      </Stack>

      {/* Filters & Search */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3 }}>
        <TextField
          placeholder="Search members by name or email..."
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flexGrow: 1, maxWidth: { sm: 360 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
        />
        <Select
          size="small"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          displayEmpty
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="all">All Roles</MenuItem>
          <MenuItem value="Administrator">Administrator</MenuItem>
          <MenuItem value="Lead Engineer">Lead Engineer</MenuItem>
          <MenuItem value="Frontend Developer">Frontend Developer</MenuItem>
          <MenuItem value="DevOps Specialist">DevOps Specialist</MenuItem>
        </Select>
      </Stack>

      {/* Members Grid */}
      <Grid container spacing={3}>
        {filtered.map((member) => (
          <Grid item xs={12} sm={6} lg={4} key={member.id}>
            <Card
              sx={{
                height: "100%",
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                transition: "transform 0.2s, box-shadow 0.2s",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: (theme) =>
                    theme.palette.mode === "dark"
                      ? "0 12px 30px rgba(0,0,0,0.4)"
                      : "0 12px 30px rgba(99,102,241,0.12)",
                },
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                  <Avatar
                    sx={{
                      width: 52,
                      height: 52,
                      bgcolor: "primary.main",
                      fontWeight: 700,
                      fontSize: 18,
                    }}
                  >
                    {member.initials}
                  </Avatar>
                  <IconButton size="small">
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </Stack>

                <Typography variant="h6" fontWeight={700} gutterBottom>
                  {member.name}
                </Typography>

                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                  <EmailIcon fontSize="small" sx={{ color: "text.secondary", fontSize: 16 }} />
                  <Typography variant="body2" color="text.secondary">
                    {member.email}
                  </Typography>
                </Stack>

                <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
                  <Chip
                    icon={<SecurityIcon sx={{ fontSize: "14px !important" }} />}
                    label={member.role}
                    size="small"
                    variant="outlined"
                    sx={{ fontWeight: 600 }}
                  />
                  <Chip
                    label={member.status}
                    size="small"
                    color={STATUS_CHIP_COLORS[member.status]}
                    sx={{ fontWeight: 600 }}
                  />
                </Stack>

                <Box
                  sx={{
                    pt: 1.5,
                    borderTop: "1px solid",
                    borderColor: "divider",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    Assigned Projects
                  </Typography>
                  <Typography variant="caption" fontWeight={700}>
                    {member.projectsCount} active
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Invite Member Dialog */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Invite Team Member</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              label="Full Name"
              fullWidth
              required
              value={newMember.name}
              onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
            />
            <TextField
              label="Email Address"
              type="email"
              fullWidth
              required
              value={newMember.email}
              onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
            />
            <TextField
              select
              label="Role"
              fullWidth
              value={newMember.role}
              onChange={(e) => setNewMember({ ...newMember, role: e.target.value as Member["role"] })}
            >
              <MenuItem value="Administrator">Administrator</MenuItem>
              <MenuItem value="Lead Engineer">Lead Engineer</MenuItem>
              <MenuItem value="Frontend Developer">Frontend Developer</MenuItem>
              <MenuItem value="DevOps Specialist">DevOps Specialist</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setOpenModal(false)} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleInvite}
            disabled={!newMember.name.trim() || !newMember.email.trim()}
          >
            Send Invitation
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
