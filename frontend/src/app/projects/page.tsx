"use client";

import AddIcon from "@mui/icons-material/Add";
import FilterListIcon from "@mui/icons-material/FilterList";
import FolderIcon from "@mui/icons-material/Folder";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import SearchIcon from "@mui/icons-material/Search";
import Avatar from "@mui/material/Avatar";
import AvatarGroup from "@mui/material/AvatarGroup";
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
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";

interface Project {
  id: string;
  name: string;
  description: string;
  category: string;
  status: "In Progress" | "Completed" | "Planning" | "On Hold";
  progress: number;
  members: string[];
  dueDate: string;
}

const INITIAL_PROJECTS: Project[] = [
  {
    id: "1",
    name: "Cloud Infrastructure Migration",
    description: "Migrate legacy backend services to Docker Compose and Kubernetes cluster.",
    category: "DevOps",
    status: "In Progress",
    progress: 68,
    members: ["JD", "AB", "SK"],
    dueDate: "Oct 15, 2026",
  },
  {
    id: "2",
    name: "Keycloak SSO & RBAC Integration",
    description: "Implement unified OpenID Connect authentication with multi-role support.",
    category: "Security",
    status: "Completed",
    progress: 100,
    members: ["AB", "JD"],
    dueDate: "Sep 24, 2026",
  },
  {
    id: "3",
    name: "Real-time Telemetry Dashboard",
    description: "Instrument FastAPI and Next.js with OpenTelemetry and Sentry monitoring.",
    category: "Observability",
    status: "In Progress",
    progress: 45,
    members: ["SK", "MS", "JD"],
    dueDate: "Nov 01, 2026",
  },
  {
    id: "4",
    name: "MinIO S3 File Storage Pipeline",
    description: "Async file uploads, thumbnail generation, and pre-signed URL sharing.",
    category: "Backend",
    status: "Planning",
    progress: 20,
    members: ["JD", "MS"],
    dueDate: "Nov 20, 2026",
  },
];

const STATUS_COLORS: Record<Project["status"], "primary" | "success" | "warning" | "default"> = {
  "In Progress": "primary",
  Completed: "success",
  Planning: "warning",
  "On Hold": "default",
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [openModal, setOpenModal] = useState(false);
  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
    category: "General",
  });

  const handleCreate = () => {
    if (!newProject.name.trim()) return;
    const created: Project = {
      id: String(Date.now()),
      name: newProject.name,
      description: newProject.description || "No description provided.",
      category: newProject.category,
      status: "Planning",
      progress: 0,
      members: ["JD"],
      dueDate: "Dec 31, 2026",
    };
    setProjects([created, ...projects]);
    setNewProject({ name: "", description: "", category: "General" });
    setOpenModal(false);
  };

  const filtered = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
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
            Projects
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage workspace projects, deliverables, and team milestones.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenModal(true)}
          sx={{ borderRadius: 2, px: 2.5, py: 1 }}
        >
          New Project
        </Button>
      </Stack>

      {/* Filters & Search */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <TextField
          placeholder="Search projects..."
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
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          displayEmpty
          startAdornment={
            <InputAdornment position="start">
              <FilterListIcon fontSize="small" color="action" />
            </InputAdornment>
          }
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="all">All Statuses</MenuItem>
          <MenuItem value="In Progress">In Progress</MenuItem>
          <MenuItem value="Completed">Completed</MenuItem>
          <MenuItem value="Planning">Planning</MenuItem>
          <MenuItem value="On Hold">On Hold</MenuItem>
        </Select>
      </Stack>

      {/* Projects Grid */}
      <Grid container spacing={3}>
        {filtered.map((project) => (
          <Grid item xs={12} md={6} lg={4} key={project.id}>
            <Card
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
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
              <CardContent sx={{ flex: 1, p: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
                  <Chip
                    label={project.category}
                    size="small"
                    variant="outlined"
                    sx={{ fontWeight: 600 }}
                  />
                  <IconButton size="small">
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </Stack>

                <Typography variant="h6" fontWeight={700} gutterBottom>
                  {project.name}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mb: 3,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    minHeight: 40,
                  }}
                >
                  {project.description}
                </Typography>

                {/* Progress bar */}
                <Box sx={{ mb: 3 }}>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
                    <Typography variant="caption" color="text.secondary">
                      Progress
                    </Typography>
                    <Typography variant="caption" fontWeight={600}>
                      {project.progress}%
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={project.progress}
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                </Box>

                {/* Card Footer */}
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ pt: 1, borderTop: "1px solid", borderColor: "divider" }}
                >
                  <AvatarGroup max={3} sx={{ "& .MuiAvatar-root": { width: 28, height: 28, fontSize: 12 } }}>
                    {project.members.map((m) => (
                      <Avatar key={m} sx={{ bgcolor: "primary.main" }}>
                        {m}
                      </Avatar>
                    ))}
                  </AvatarGroup>
                  <Chip
                    label={project.status}
                    size="small"
                    color={STATUS_COLORS[project.status]}
                    sx={{ fontWeight: 600 }}
                  />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* New Project Dialog */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Create New Project</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              label="Project Title"
              fullWidth
              required
              value={newProject.name}
              onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
            />
            <TextField
              label="Category"
              fullWidth
              value={newProject.category}
              onChange={(e) => setNewProject({ ...newProject, category: e.target.value })}
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={newProject.description}
              onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setOpenModal(false)} color="inherit">
            Cancel
          </Button>
          <Button variant="contained" onClick={handleCreate} disabled={!newProject.name.trim()}>
            Create Project
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
