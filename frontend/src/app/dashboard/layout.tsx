import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: { template: "%s | Platform", default: "Dashboard" },
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
