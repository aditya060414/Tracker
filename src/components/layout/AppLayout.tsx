import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Dumbbell, HeartPulse, Briefcase, Wallet, Lightbulb, CalendarClock,
  Map, Trophy, Settings, Sun, Moon, Bell, Flame, Menu, X, PanelLeftClose, PanelLeftOpen,
  User, LogIn,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme";
import { useLocal } from "@/lib/use-local";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/common/Logo";

export const APP_VERSION = "v0.1.0";

type NavItem = {
  to: "/" | "/gym" | "/health" | "/work" | "/money-management" | "/ideas" | "/scheduler" | "/planning" | "/challenges" | "/settings" | "/login";
  label: string;
  icon: typeof LayoutDashboard;
  badge?: number;
};
const groups: { label: string; items: NavItem[] }[] = [
  { label: "Overview", items: [{ to: "/", label: "Dashboard", icon: LayoutDashboard }] },
  {
    label: "Personal",
    items: [
      { to: "/gym", label: "Gym", icon: Dumbbell },
      { to: "/health", label: "Health", icon: HeartPulse },
      { to: "/work", label: "Work", icon: Briefcase },
      { to: "/money-management", label: "Money Management", icon: Wallet },
      { to: "/ideas", label: "Ideas / Brainstorm", icon: Lightbulb },
      { to: "/scheduler", label: "Task Scheduler", icon: CalendarClock },
      { to: "/planning", label: "Planning", icon: Map },
      { to: "/challenges", label: "Take Challenge", icon: Trophy },
    ],
  },
  {
    label: "Account",
    items: [
      { to: "/login", label: "Account / Sign In", icon: User },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

const allItems = groups.flatMap((g) => g.items);

function ThemeButton({ compact }: { compact?: boolean }) {
  const { theme, toggle } = useTheme();
  const Icon = theme === "dark" ? Sun : Moon;
  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      className={cn(
        "flex h-10 items-center gap-3 rounded-[10px] text-muted-foreground hover:bg-elevated hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring",
        compact ? "w-10 justify-center" : "w-full px-3",
      )}
    >
      <Icon className="size-[18px]" aria-hidden />
      {!compact && <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>}
    </button>
  );
}

function Nav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [od] = useLocal<unknown[]>("sched-overdue", []);
  const overdueCount = od.length;

  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4" aria-label="Main">
      {groups.map((g) => (
        <div key={g.label}>
          {!collapsed && <p className="mb-2 px-3 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">{g.label}</p>}
          <ul className="space-y-1">
            {g.items.map((item) => {
              const active = item.to === "/" ? path === "/" : path.startsWith(item.to);
              const Icon = item.icon;
              const badge = item.to === "/scheduler" && overdueCount > 0 ? overdueCount : item.badge;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex h-10 items-center gap-3 rounded-[10px] px-3 transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                      active ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-elevated hover:text-foreground",
                      collapsed && "justify-center px-0",
                    )}
                  >
                    {active && <span className="absolute top-2 bottom-2 left-0 w-[3px] rounded-r bg-sidebar-primary" aria-hidden />}
                    <Icon className="size-[18px] shrink-0" aria-hidden />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {badge ? (
                      <span className={cn("rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground", collapsed ? "absolute top-1 right-1" : "ml-auto")} aria-label={`${badge} pending`}>
                        {badge}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={cn("flex h-[68px] items-center gap-2.5 px-5", collapsed && "justify-center px-0")}>
      <Logo size={32} />
      {!collapsed && <span className="font-display text-lg font-bold tracking-tight">Lifeboard</span>}
    </div>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [streak] = useLocal("challenge-streak", 0);
  const [profileName] = useLocal("profile-name", "");
  const { user } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => setNow(new Date()), []);
  const current = allItems.find((i) => (i.to === "/" ? path === "/" : path.startsWith(i.to)));

  const displayName = user?.name || profileName;
  const userInitial = displayName.trim() ? displayName.trim().charAt(0).toUpperCase() : "U";

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className={cn("sticky top-0 hidden h-screen shrink-0 flex-col border-r bg-sidebar transition-[width] md:flex", collapsed ? "w-[76px]" : "w-[240px]")}>
        <Brand collapsed={collapsed} />
        <Nav collapsed={collapsed} />
        <div className={cn("space-y-1 border-t p-3", collapsed && "flex flex-col items-center")}>
          <ThemeButton compact={collapsed} />
          <button
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn("flex h-10 items-center gap-3 rounded-[10px] text-muted-foreground hover:bg-elevated hover:text-foreground", collapsed ? "w-10 justify-center" : "w-full px-3")}
          >
            {collapsed ? <PanelLeftOpen className="size-[18px]" /> : <PanelLeftClose className="size-[18px]" />}
            {!collapsed && <span>Collapse</span>}
          </button>
          {!collapsed && <p className="px-3 pt-2 text-[11px] text-muted-foreground">Lifeboard {APP_VERSION}</p>}
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="shadow-float absolute inset-y-0 left-0 flex w-[260px] flex-col border-r bg-sidebar">
            <div className="flex items-center justify-between pr-3">
              <Brand collapsed={false} />
              <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="grid size-10 place-items-center rounded-lg hover:bg-elevated">
                <X className="size-5" />
              </button>
            </div>
            <Nav collapsed={false} onNavigate={() => setMobileOpen(false)} />
            <div className="border-t p-3">
              <ThemeButton />
              <p className="px-3 pt-2 text-[11px] text-muted-foreground">Lifeboard {APP_VERSION}</p>
            </div>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-[68px] items-center gap-3 border-b bg-background/85 px-4 backdrop-blur md:px-6">
          <button onClick={() => setMobileOpen(true)} aria-label="Open menu" className="grid size-10 place-items-center rounded-lg hover:bg-elevated md:hidden">
            <Menu className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold md:hidden">{current?.label ?? "Lifeboard"}</p>
            <p className="hidden text-muted-foreground md:block" suppressHydrationWarning>
              {now ? now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "\u00a0"}
            </p>
          </div>

          {/* User Status Pill */}
          {user ? (
            <Link
              to="/login"
              title={`Logged in as ${user.name} (${user.email})\nAccount ID: ${user.id}`}
              className="hidden items-center gap-2 rounded-full border bg-elevated/60 px-3 py-1.5 text-xs transition-colors hover:bg-elevated sm:flex"
            >
              <span className="size-2 rounded-full bg-success" />
              <span className="max-w-[120px] truncate font-medium">{user.name}</span>
              <span className="font-mono text-[11px] text-muted-foreground">ID: {user.id.slice(0, 6)}…</span>
            </Link>
          ) : (
            <Link
              to="/login"
              className="hidden items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 sm:flex"
            >
              <LogIn className="size-3.5" /> Sign In / Sign Up
            </Link>
          )}

          <span
            className={cn("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium", streak > 0 ? "bg-warning/15 text-warning" : "bg-elevated text-muted-foreground")}
            title={streak > 0 ? "Current streak" : "Start a challenge to build your streak"}
          >
            <Flame className="size-4" aria-hidden /> {streak}<span className="hidden sm:inline">&nbsp;day streak</span>
          </span>
          <button aria-label="Notifications" className="grid size-10 place-items-center rounded-lg text-muted-foreground hover:bg-elevated hover:text-foreground">
            <Bell className="size-[18px]" />
          </button>
          <div className="hidden md:block"><ThemeButton compact /></div>
          <Link
            to={user ? "/login" : "/login"}
            className="grid size-9 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-foreground hover:ring-2 hover:ring-ring"
            aria-label={user ? `User profile (${user.name})` : "Sign In / Sign Up"}
          >
            {userInitial}
          </Link>
        </header>
        <main className="mx-auto w-full max-w-[1600px] flex-1 p-4 md:p-5 xl:p-6">{children}</main>
      </div>
    </div>
  );
}
