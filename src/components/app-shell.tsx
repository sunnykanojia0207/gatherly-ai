"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  LayoutDashboard,
  ListChecks,
  Sparkles,
  Store,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { EVENT_TYPE_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { useGatherly } from "@/lib/store";
import { Alert } from "@/components/ui";
import { AtelierMark } from "@/components/motifs";

const NAV: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/events", label: "My Events", icon: CalendarDays },
  { href: "/budget", label: "Budget", icon: Wallet },
  { href: "/timeline", label: "Timeline", icon: ListChecks },
  { href: "/vendors", label: "Vendors", icon: Store },
  { href: "/ideas", label: "AI Ideas", icon: Sparkles },
];

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-3 rounded-xl">
      <AtelierMark className="h-10 w-10 shrink-0" />
      <span>
        <span className="block font-display text-[22px] leading-none tracking-tight text-on-dark">
          Gatherly AI
        </span>
        <span className="mt-1.5 block text-[10px] font-medium uppercase tracking-[0.22em] text-on-dark-faint">
          Event atelier
        </span>
      </span>
    </Link>
  );
}

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function DesktopNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="min-h-0 flex-1 overflow-y-auto px-3 pt-4">
      <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-on-dark-faint">
        Workspace
      </p>
      <ul className="space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-on-dark/10 font-medium text-on-dark"
                    : "text-on-dark-soft hover:bg-on-dark/5 hover:text-on-dark"
                }`}
              >
                {active ? (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 h-4 w-[2px] rounded-full bg-orchid"
                  />
                ) : null}
                <Icon
                  aria-hidden="true"
                  className={`h-4 w-4 shrink-0 ${active ? "text-orchid" : "text-on-dark-faint"}`}
                />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function MobileNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="no-scrollbar overflow-x-auto border-t border-on-dark/10 px-3 pb-2"
    >
      <ul className="flex w-max gap-1 py-2">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex w-max items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] transition-colors ${
                  active
                    ? "bg-on-dark font-medium text-plum"
                    : "text-on-dark-soft hover:bg-on-dark/10 hover:text-on-dark"
                }`}
              >
                <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { activeEvent, storageWarning } = useGatherly();

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-plum focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-on-dark"
      >
        Skip to content
      </a>

      <div className="lg:flex">
        <aside className="plum-texture hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-72 lg:shrink-0 lg:flex-col">
          <div className="px-6 pb-6 pt-7">
            <Brand />
          </div>
          <DesktopNav />
          <div className="mx-3 mb-3 rounded-xl border border-on-dark/10 bg-on-dark/[0.04] p-4">
            {activeEvent ? (
              <>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-on-dark-faint">
                  Active event
                </p>
                <p className="mt-1.5 truncate font-display text-lg leading-tight text-on-dark">
                  {activeEvent.name}
                </p>
                <p className="mt-1 text-xs text-on-dark-soft">
                  {EVENT_TYPE_LABELS[activeEvent.type]} · {formatDate(activeEvent.date)}
                </p>
              </>
            ) : (
              <p className="text-xs leading-relaxed text-on-dark-soft">
                No active event yet. Choose one in My Events.
              </p>
            )}
            <Link
              href="/events"
              className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-orchid hover:text-on-dark"
            >
              Switch or create event <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="border-t border-on-dark/10 px-6 py-5">
            <p className="text-[11px] leading-relaxed text-on-dark-faint">
              Saved in this browser only.
              <br />
              Curated ideas plus optional Gemini suggestions.
            </p>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="plum-texture sticky top-0 z-30 border-b border-on-dark/10 lg:hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <Link href="/" className="flex items-center gap-2.5 rounded-lg">
                <AtelierMark className="h-8 w-8" />
                <span className="font-display text-lg leading-none text-on-dark">Gatherly AI</span>
              </Link>
              <span className="max-w-40 truncate text-right text-[11px] text-on-dark-soft">
                {activeEvent ? activeEvent.name : "No event selected"}
              </span>
            </div>
            <MobileNav />
          </header>

          <main
            id="main"
            className="workspace-glow mx-auto w-full max-w-[1180px] px-4 py-7 sm:px-6 sm:py-9 lg:px-10 lg:py-11"
          >
            {storageWarning ? (
              <div className="mb-6">
                <Alert tone="warning" title="Changes are not being saved">
                  This browser blocked local storage, so edits will disappear on refresh. Check
                  private-mode settings or storage permissions.
                </Alert>
              </div>
            ) : null}
            {children}
          </main>

          <footer className="mx-auto flex w-full max-w-[1180px] flex-wrap items-center justify-between gap-2 px-4 pb-10 text-[11px] text-ink-faint sm:px-6 lg:px-10">
            <p>Gatherly AI · Event Atelier</p>
            <p>Local-first · Every number comes from your saved plan.</p>
          </footer>
        </div>
      </div>
    </>
  );
}
