"use client";

import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import GroupIcon from "@mui/icons-material/Group";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import FolderIcon from "@mui/icons-material/Folder";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { SvgIconComponent } from "@mui/icons-material";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface StatCardProps {
  title: string;
  value: string;
  delta: string;
  positive: boolean;
  Icon: SvgIconComponent;
  color: string;
}

function StatCard({ title, value, delta, positive, Icon, color }: StatCardProps) {
  return (
    <Card
      sx={{
        height: "100%",
        position: "relative",
        overflow: "visible",
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          borderRadius: "12px 12px 0 0",
          background: color,
        },
      }}
    >
      <CardContent>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
        >
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight={700}>
              {value}
            </Typography>
          </Box>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              background: color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: 0.9,
            }}
          >
            <Icon sx={{ color: "#fff" }} />
          </Box>
        </Stack>
        <Chip
          label={delta}
          size="small"
          color={positive ? "success" : "error"}
          variant="outlined"
          sx={{ mt: 1.5, fontWeight: 600 }}
        />
      </CardContent>
    </Card>
  );
}

const STATS: Omit<StatCardProps, "">[] = [
  {
    title: "Active Projects",
    value: "12",
    delta: "+2 this week",
    positive: true,
    Icon: FolderIcon,
    color: "linear-gradient(135deg, #6366f1, #818cf8)",
  },
  {
    title: "Team Members",
    value: "34",
    delta: "+5 this month",
    positive: true,
    Icon: GroupIcon,
    color: "linear-gradient(135deg, #14b8a6, #2dd4bf)",
  },
  {
    title: "Tasks Completed",
    value: "248",
    delta: "+18 today",
    positive: true,
    Icon: TaskAltIcon,
    color: "linear-gradient(135deg, #f59e0b, #fbbf24)",
  },
  {
    title: "Velocity",
    value: "94%",
    delta: "-3% vs last sprint",
    positive: false,
    Icon: TrendingUpIcon,
    color: "linear-gradient(135deg, #ef4444, #f87171)",
  },
];

export default function DashboardPage() {
  const { data: user, isLoading } = useCurrentUser();

  const greeting = isLoading ? (
    <Skeleton width={300} height={40} />
  ) : (
    <Typography variant="h4" fontWeight={700}>
      Good day, {user?.full_name?.split(" ")[0] ?? "there"} 👋
    </Typography>
  );

  return (
    <Box>
      {/* Header */}
      <Stack spacing={0.5} sx={{ mb: 4 }}>
        {greeting}
        <Typography variant="body1" color="text.secondary">
          Here&apos;s what&apos;s happening across your workspace today.
        </Typography>
      </Stack>

      {/* Stat cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {STATS.map((stat) => (
          <Grid item xs={12} sm={6} lg={3} key={stat.title}>
            <StatCard {...stat} />
          </Grid>
        ))}
      </Grid>

      {/* Placeholder content */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card sx={{ height: 320 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Activity Feed
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Recent project activity will appear here.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: 320 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Upcoming Deadlines
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tasks due soon will appear here.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
