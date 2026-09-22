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
              href="/dashboard"
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
        </Stack>
      </Container>
    </Box>
  );
}
