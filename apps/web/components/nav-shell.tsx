"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  ChevronDown,
  FileSearch,
  Files,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Moon,
  PanelRight,
  Search,
  Settings,
  Sun,
  Upload,
  X,
} from "lucide-react";
import { FormEvent, ReactNode, useState } from "react";

import { useTheme, type Theme } from "@/components/theme-provider";
import { useScope } from "@/components/scope-context";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/search", label: "Document Search", icon: FileSearch },
  { href: "/app/documents", label: "Document Library", icon: Files },
  { href: "/app/documents/upload", label: "Upload", icon: Upload },
  { href: "/app/chat", label: "Chat", icon: MessageSquare },
];

const themes: Theme[] = ["light", "dark", "system"];

function isNavItemActive(pathname: string, href: string) {
  if (href === "/app") return pathname === href;
  if (href === "/app/documents/upload") return pathname === href;
  if (href === "/app/documents") {
    return (
      pathname === href ||
      (pathname.startsWith(`${href}/`) &&
        !pathname.startsWith("/app/documents/upload"))
    );
  }
  return pathname.startsWith(href);
}

function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  return (
    <label className="relative flex h-9 items-center rounded-base border bg-surface-muted px-2 text-xs text-muted-foreground">
      {theme === "dark" ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
      <span className="sr-only">Theme</span>
      <select
        aria-label="Theme"
        className="absolute inset-0 cursor-pointer opacity-0"
        onChange={(event) => setTheme(event.target.value as Theme)}
        value={theme}
      >
        {themes.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
    </label>
  );
}

function Brand() {
  return (
    <Link
      className="flex min-w-fit items-center gap-2.5 font-display font-bold"
      href="/app"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-extrabold text-primary-foreground shadow-[0_4px_12px_hsl(var(--primary)/0.28)]">
        CB
      </span>
      <span className="hidden text-[15px] sm:inline">Company Brain</span>
    </Link>
  );
}

export function NavShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [railOpen, setRailOpen] = useState(false);
  const [globalQuery, setGlobalQuery] = useState("");
  const {
    user,
    organizations,
    organization,
    business,
    loading: scopeLoading,
    error: scopeError,
    setOrganizationId,
    setBusinessId,
  } = useScope();

  const organizationLabel =
    organization?.name ?? (scopeLoading ? "Loading..." : "No organization");
  const businessLabel =
    business?.name ?? (scopeLoading ? "Loading..." : "No workspace");
  const userLabel = user?.display_name || user?.email || "Not signed in";
  const userInitials = userLabel
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    if (globalQuery.trim())
      router.push(`/app/search?q=${encodeURIComponent(globalQuery.trim())}`);
  }

  const title =
    navItems.find((item) => isNavItemActive(pathname, item.href))?.label ??
    "Document";

  return (
    <div className="h-screen overflow-hidden bg-background text-foreground">
      <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b bg-surface/95 px-4 backdrop-blur md:px-6">
        <div className="flex items-center gap-3">
          <button
            aria-label="Open navigation"
            className="flex h-9 w-9 items-center justify-center rounded-base hover:bg-surface-muted md:hidden"
            onClick={() => setSidebarOpen(true)}
            type="button"
          >
            <Menu className="h-4 w-4" />
          </button>
          <Brand />
          <label className="relative hidden h-9 items-center gap-2 rounded-base border bg-surface-muted px-3 text-xs font-semibold lg:flex">
            <Building2 className="h-4 w-4 text-primary" /> {organizationLabel}
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="sr-only">Organization</span>
            <select
              aria-label="Organization"
              className="absolute inset-0 cursor-pointer opacity-0"
              disabled={!organizations.length}
              onChange={(event) => setOrganizationId(event.target.value)}
              value={organization?.id ?? ""}
            >
              {!organizations.length ? (
                <option value="">No organization</option>
              ) : null}
              {organizations.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex items-center gap-2">
          <form className="relative hidden md:block" onSubmit={submitSearch}>
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              aria-label="Global document search"
              className="h-9 w-52 rounded-base border bg-surface-muted pl-9 pr-3 text-xs outline-none transition-[width,background] focus:w-72 focus:bg-surface focus:ring-2 focus:ring-primary/20"
              onChange={(event) => setGlobalQuery(event.target.value)}
              placeholder="Search survey or document..."
              value={globalQuery}
            />
          </form>
          <ThemeSwitcher />
          <button
            aria-label="Toggle context panel"
            className="flex h-9 w-9 items-center justify-center rounded-base hover:bg-surface-muted"
            onClick={() => setRailOpen((value) => !value)}
            type="button"
          >
            <PanelRight className="h-4 w-4" />
          </button>
          <span className="flex h-9 w-9 items-center justify-center rounded-full border bg-primary text-xs font-bold text-primary-foreground">
            {userInitials || "?"}
          </span>
        </div>
      </header>

      {sidebarOpen ? (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/25 md:hidden"
          onClick={() => setSidebarOpen(false)}
          type="button"
        />
      ) : null}
      <aside
        className={cn(
          "fixed bottom-0 left-0 top-16 z-40 flex w-[260px] flex-col border-r bg-surface transition-transform md:translate-x-0",
          sidebarOpen ? "translate-x-0 shadow-panel" : "-translate-x-full",
        )}
      >
        <div className="border-b p-4">
          <div className="label-caps mb-2 px-1">Active workspace</div>
          <label className="relative flex w-full items-center justify-between rounded-base border bg-surface-muted px-3 py-2.5 text-left text-sm font-semibold">
            {businessLabel}
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
            <span className="sr-only">Business workspace</span>
            <select
              aria-label="Business workspace"
              className="absolute inset-0 cursor-pointer opacity-0"
              disabled={!organization?.businesses.length}
              onChange={(event) => setBusinessId(event.target.value)}
              value={business?.id ?? ""}
            >
              {!organization?.businesses.length ? (
                <option value="">No workspace</option>
              ) : null}
              {organization?.businesses.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <nav aria-label="Main navigation" className="space-y-1 p-3">
          {navItems.map((item) => {
            const active = isNavItemActive(pathname, item.href);
            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-base px-3 py-2.5 text-[13px] font-semibold transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
                )}
                href={item.href}
                key={item.href}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="h-4 w-4" /> {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t px-4 py-4">
          <div className="label-caps mb-3">Recent searches</div>
          <p className="rounded-lg px-2 py-2 text-xs leading-5 text-muted-foreground">
            Searches from this workspace will appear here.
          </p>
        </div>
        <div className="mt-auto border-t p-3">
          <Link
            className="flex items-center gap-3 rounded-base px-3 py-2.5 text-[13px] font-semibold text-muted-foreground hover:bg-surface-muted"
            href="/app/settings"
          >
            <Settings className="h-4 w-4" /> Settings
          </Link>
          <div className="mt-2 rounded-base border bg-surface-muted p-3 text-xs">
            <p className="truncate font-semibold">{userLabel}</p>
            <p className="mt-1 text-muted-foreground">
              {business?.role
                ? `${business.role} access`
                : scopeError || "No active scope"}
            </p>
          </div>
        </div>
      </aside>

      <div className="flex h-full pt-16 md:pl-[260px]">
        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="sticky top-0 z-20 flex min-h-14 items-center justify-between border-b bg-surface/95 px-4 backdrop-blur lg:px-6">
            <div className="text-xs text-muted-foreground">
              {organizationLabel} <span className="mx-1.5">/</span>{" "}
              <strong className="text-foreground">{title}</strong>
            </div>
            <div className="hidden items-center rounded-base bg-surface-muted p-1 xl:flex">
              {navItems.map((item) => {
                const active = isNavItemActive(pathname, item.href);
                return (
                  <Link
                    className={cn(
                      "rounded-[10px] px-3 py-1.5 text-xs font-semibold",
                      active
                        ? "bg-surface text-foreground shadow-soft"
                        : "text-muted-foreground",
                    )}
                    href={item.href}
                    key={item.href}
                  >
                    {item.label.replace("Document ", "")}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="mx-auto w-full max-w-[1240px] px-4 py-5 lg:px-7 lg:py-7">
            {children}
          </div>
        </main>

        <aside
          className={cn(
            "fixed bottom-0 right-0 top-16 z-40 w-[280px] overflow-y-auto border-l bg-surface transition-transform xl:static xl:top-0 xl:z-0 xl:block",
            railOpen
              ? "translate-x-0 shadow-panel"
              : "translate-x-full xl:translate-x-0",
          )}
        >
          <div className="flex items-center justify-between border-b p-5 xl:hidden">
            <span className="font-display text-sm font-bold">Context</span>
            <button
              aria-label="Close context panel"
              onClick={() => setRailOpen(false)}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="border-b p-5">
            <div className="label-caps mb-4">Active scope</div>
            <dl className="space-y-3 text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Organization</dt>
                <dd className="text-right font-semibold">
                  {organizationLabel}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Workspace</dt>
                <dd className="text-right font-semibold">{businessLabel}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Access</dt>
                <dd
                  className={cn(
                    "font-semibold",
                    business ? "text-success" : "text-muted-foreground",
                  )}
                >
                  {business ? "Authorized" : "Unavailable"}
                </dd>
              </div>
            </dl>
          </div>
          <div className="border-b p-5">
            <div className="label-caps mb-4">Search guidance</div>
            <p className="text-xs leading-5 text-muted-foreground">
              Survey numbers preserve slashes, letters, spaces, and hyphens.
              Exact authorized matches always appear first.
            </p>
          </div>
          <div className="p-5">
            <div className="label-caps mb-3">Quick action</div>
            <Link
              className="flex w-full items-center justify-center gap-2 rounded-base bg-foreground px-3 py-2.5 text-xs font-bold text-background hover:bg-primary hover:text-white"
              href="/app/documents/upload"
            >
              <Upload className="h-4 w-4" /> Upload document
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
