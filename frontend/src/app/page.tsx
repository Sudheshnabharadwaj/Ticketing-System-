import type { Metadata } from "next";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Welcome | Platform",
  description: "The modern platform for high-performing teams.",
};

export default function HomePage() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        background:
          "radial-gradient(ellipse 80% 80% at 50% -20%, rgba(99,102,241,0.3), transparent)",
      }}
    >
      <Container maxWidth="md">
        <Stack spacing={4} alignItems="center" textAlign="center">
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: "2.5rem", md: "4rem" },
              fontWeight: 800,
              background: "linear-gradient(135deg, #6366f1 0%, #14b8a6 100%)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Build faster. Ship confidently.
          </Typography>

          <Typography
            variant="h5"
            color="text.secondary"
            sx={{ maxWidth: 560, fontWeight: 400 }}
          >
            Platform gives your team the tools to plan, collaborate, and deliver
            great products — all in one place.
          </Typography>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Button
              component={Link}
              href="/auth/signup"
              variant="contained"
              size="large"
              sx={{ px: 4, py: 1.5, fontSize: "1rem" }}
            >
              Get Started
            </Button>
            <Button
              component={Link}
              href="/auth/login"
              variant="outlined"
              size="large"
              sx={{ px: 4, py: 1.5, fontSize: "1rem" }}
            >
              Sign In
            </Button>
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 4, width: "100%", justifyContent: "center" }}>
            <Box
              component="a"
              href="http://localhost:5173"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                p: 2.5,
                borderRadius: 2,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.03)",
                backdropFilter: "blur(8px)",
                textDecoration: "none",
                color: "inherit",
                flex: 1,
                textAlign: "left",
                transition: "all 0.2s",
                "&:hover": { borderColor: "primary.main", transform: "translateY(-2px)" },
              }}
            >
              <Typography variant="subtitle1" fontWeight={700} color="primary.main">
                Admin Portal →
              </Typography>
              <Typography variant="body2" color="text.secondary">
                User management, SLA rules, workflow configs & metrics (Port 5173)
              </Typography>
            </Box>

            <Box
              component="a"
              href="http://localhost:4173"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                p: 2.5,
                borderRadius: 2,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.03)",
                backdropFilter: "blur(8px)",
                textDecoration: "none",
                color: "inherit",
                flex: 1,
                textAlign: "left",
                transition: "all 0.2s",
                "&:hover": { borderColor: "teal", transform: "translateY(-2px)" },
              }}
            >
              <Typography variant="subtitle1" fontWeight={700} sx={{ color: "#14b8a6" }}>
                Employee Portal →
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Raise tickets, track assigned work, notifications & KB (Port 4173)
              </Typography>
            </Box>

            <Box
              component="a"
              href="http://localhost:4174"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                p: 2.5,
                borderRadius: 2,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.03)",
                backdropFilter: "blur(8px)",
                textDecoration: "none",
                color: "inherit",
                flex: 1,
                textAlign: "left",
                transition: "all 0.2s",
                "&:hover": { borderColor: "warning.main", transform: "translateY(-2px)" },
              }}
            >
              <Typography variant="subtitle1" fontWeight={700} color="warning.main">
                Team Lead Portal →
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Team tickets, triage, employee workload, escalations & reports (Port 4174)
              </Typography>
            </Box>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
