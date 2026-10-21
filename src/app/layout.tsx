import type { Metadata, Viewport } from "next";

import { AppShell } from "@/components/app-shell";
import { GatherlyProvider } from "@/lib/store";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Gatherly AI — Your event. Thoughtfully planned.",
    template: "%s · Gatherly AI",
  },
  description:
    "Plan weddings, birthdays, and community events with budgets, timelines, vendor checklists, and AI-assisted ideas.",
};

export const viewport: Viewport = {
  themeColor: "#29172f",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className="min-h-dvh bg-canvas text-ink antialiased">
        <GatherlyProvider>
          <AppShell>{children}</AppShell>
        </GatherlyProvider>
      </body>
    </html>
  );
}
