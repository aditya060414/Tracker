import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { User, Palette, Bell, Clock, Download, ShieldCheck, Info, Sun, Moon, Database } from "lucide-react";
import { PageHeader, Panel, SectionHeader } from "@/components/common/ui";
import { useTheme } from "@/lib/theme";
import { useLocal } from "@/lib/use-local";
import { useAuth } from "@/lib/auth-context";
import { APP_VERSION } from "@/components/layout/AppLayout";
import { pageHead } from "@/lib/meta";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: pageHead("Settings", "Profile, appearance, notifications, date preferences and data export."),
  component: Settings,
});

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4">
      <span>{label}</span>
      <button role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={cn("relative h-6 w-11 rounded-full transition-colors", checked ? "bg-primary" : "bg-elevated border")}>
        <span className={cn("absolute top-0.5 size-5 rounded-full bg-card shadow transition-all", checked ? "left-[22px]" : "left-0.5")} />
      </button>
    </label>
  );
}

const field = "h-11 w-full rounded-[10px] border bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Settings() {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const [notif, setNotif] = useLocal("notif", { reminders: true, digest: true, challenge: false });
  const [name, setName] = useLocal("profile-name", "");
  return (
    <>
      <PageHeader title="Settings" description="Make Lifeboard yours." />
      <div className="grid max-w-5xl gap-4 lg:grid-cols-2">
        <Panel>
          <SectionHeader title="Profile & account" icon={User} />
          {user ? (
            <div className="space-y-3">
              <div>
                <span className="text-xs text-muted-foreground">Signed in as</span>
                <p className="font-semibold text-foreground text-sm">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>

              <div className="rounded-xl border bg-elevated/50 p-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase">
                  <ShieldCheck className="size-3.5 text-primary" /> Unique Account ID
                </div>
                <p className="mt-1 font-mono text-xs font-semibold text-primary break-all select-all">
                  {user.id}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Your tasks, transactions, and habits are linked directly to this unique identifier.
                </p>
              </div>

              <div className="flex gap-2 pt-1">
                <Link
                  to="/login"
                  className="flex h-9 items-center justify-center rounded-lg border px-3 text-xs font-medium hover:bg-elevated"
                >
                  Manage Account
                </Link>
                <button
                  onClick={logout}
                  className="flex h-9 items-center justify-center rounded-lg border border-danger/30 px-3 text-xs font-medium text-danger hover:bg-danger/10"
                >
                  Sign out
                </button>
              </div>
            </div>
          ) : (
            <div>
              <label htmlFor="name" className="mb-1.5 block text-[13px] text-muted-foreground">
                Local display name
              </label>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className={field}
              />
              <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
                <p className="text-xs font-medium text-foreground">Cloud Sync & Backup</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Create an account or sign in to sync your personal details securely across devices.
                </p>
                <Link
                  to="/login"
                  className="mt-2.5 flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary text-xs font-medium text-primary-foreground hover:bg-primary-hover"
                >
                  Sign In / Sign Up
                </Link>
              </div>
            </div>
          )}
        </Panel>
        <Panel>
          <SectionHeader title="Theme & appearance" icon={Palette} />
          <div className="grid grid-cols-2 gap-3">
            {(["light", "dark"] as const).map((t) => (
              <button key={t} aria-pressed={theme === t} onClick={() => setTheme(t)} className={cn("flex h-14 items-center justify-center gap-2 rounded-xl border capitalize", theme === t ? "border-primary bg-accent text-accent-foreground" : "hover:bg-elevated")}>
                {t === "light" ? <Sun className="size-4" /> : <Moon className="size-4" />} {t}
              </button>
            ))}
          </div>
        </Panel>
        <Panel>
          <SectionHeader title="Notifications" icon={Bell} />
          <Toggle label="Task reminders" checked={notif.reminders} onChange={(v) => setNotif({ ...notif, reminders: v })} />
          <Toggle label="Daily digest" checked={notif.digest} onChange={(v) => setNotif({ ...notif, digest: v })} />
          <Toggle label="Challenge nudges" checked={notif.challenge} onChange={(v) => setNotif({ ...notif, challenge: v })} />
        </Panel>
        <Panel>
          <SectionHeader title="Date & time" icon={Clock} />
          <label htmlFor="wk" className="mb-1.5 block text-[13px] text-muted-foreground">Week starts on</label>
          <select id="wk" className={field}><option>Monday</option><option>Sunday</option></select>
          <label htmlFor="tf" className="mt-3 mb-1.5 block text-[13px] text-muted-foreground">Time format</label>
          <select id="tf" className={field}><option>24-hour</option><option>12-hour</option></select>
        </Panel>
        <Panel>
          <SectionHeader title="Data export" icon={Download} />
          <button
            onClick={() => {
              const data = Object.fromEntries(Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)]));
              const a = document.createElement("a");
              a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
              a.download = "lifeboard-export.json";
              a.click();
              toast.success("Export downloaded");
            }}
            className="h-11 rounded-[10px] border px-4 font-medium hover:bg-elevated"
          >Download my data (JSON)</button>
        </Panel>
        <Panel>
          <SectionHeader title="Privacy & account" icon={ShieldCheck} />
          <button onClick={() => { if (confirm("Reset all locally stored data? This cannot be undone.")) { localStorage.clear(); localStorage.setItem("static_data_purged_v1", "true"); location.reload(); } }} className="h-11 rounded-[10px] border border-danger/40 px-4 font-medium text-danger hover:bg-danger/10">Reset all data</button>
        </Panel>
        <Panel className="lg:col-span-2">
          <SectionHeader title="About" icon={Info} />
          <p className="text-muted-foreground">Lifeboard {APP_VERSION} · Build 2026.10 · Data stored on this device</p>
        </Panel>
      </div>
    </>
  );
}
