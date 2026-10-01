import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Team Members",
};

export default function TeamLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
