import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  Target, Timer, Percent, ListChecks, Trophy, Wallet, Star, FileText, TrendingUp, Plus, Check, ArrowRight, Flame, Trash2, Pencil, X,
} from "lucide-react";
import { Panel, SectionHeader, StatCard, ProgressBar, Tag, EmptyState } from "@/components/common/ui";
import { useLocal } from "@/lib/use-local";
import { pageHead } from "@/lib/meta";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: pageHead("Dashboard", "Your day at a glance: goals, focus time, challenge progress and budget."),
  component: Dashboard,
});

type Goal = { id: string; text: string; done: boolean; time?: string | undefined };
type Tx = { id: string; name: string; cat: string; amount: number; date: string };
type FocusSession = { id: string; minutes: number };
type SpecialTaskData = { title: string; done: boolean };

function greeting(h: number) {
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function Dashboard() {
  const [goals, setGoals] = useLocal<Goal[]>("goals", []);
  const [name] = useLocal("profile-name", "");
  const [draft, setDraft] = useState("");
  const [range, setRange] = useState<"week" | "month">("week");
  const [hour, setHour] = useState<number | null>(null);

  // Cross-module states
  const [budget] = useLocal("budget", 2000);
  const [txs] = useLocal<Tx[]>("transactions", []);
  const [focusSessions] = useLocal<FocusSession[]>("work-focus-sessions", []);
  const [challengeName] = useLocal("challenge-name", "75 Days of Discipline");
  const [challengeDay] = useLocal("challenge-day", 0);
  const [challengeTotal] = useLocal("challenge-total-days", 75);
  const [challengeStreak] = useLocal("challenge-streak", 0);

  useEffect(() => setHour(new Date().getHours()), []);

  const done = goals.filter((g) => g.done).length;
  const pct = goals.length ? Math.round((done / goals.length) * 100) : 0;

  // Real financial calculations
  const expenses = txs.filter((t) => t.amount < 0);
  const spent = Math.abs(expenses.reduce((s, t) => s + t.amount, 0));
  const remainingBudget = Math.max(0, budget - spent);
  const budgetPctUsed = budget > 0 ? Math.round((spent / budget) * 100) : 0;

  // Real focus calculation
  const totalFocusMinutes = focusSessions.reduce((acc, s) => acc + s.minutes, 0);
  const focusTimeDisplay =
    totalFocusMinutes >= 60
      ? `${Math.floor(totalFocusMinutes / 60)}h ${totalFocusMinutes % 60 ? `${totalFocusMinutes % 60}m` : ""}`
      : `${totalFocusMinutes}m`;

  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editingGoalText, setEditingGoalText] = useState("");

  const addGoal = () => {
    if (!draft.trim()) return;
    setGoals([...goals, { id: crypto.randomUUID(), text: draft.trim(), done: false }]);
    setDraft("");
  };

  const saveEditGoal = (id: string) => {
    const trimmed = editingGoalText.trim();
    if (!trimmed) return;
    setGoals(goals.map((g) => (g.id === id ? { ...g, text: trimmed } : g)));
    setEditingGoalId(null);
  };

  const removeGoal = (id: string) => {
    setGoals(goals.filter((g) => g.id !== id));
  };

  // Dynamic progress chart reflecting today's completion
  const todayDayName = dayNames[new Date().getDay()] || "Mon";
  const weekData = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => ({
    d,
    v: d === todayDayName ? pct : 0,
  }));
  const monthData = Array.from({ length: 30 }, (_, i) => ({
    d: `${i + 1}`,
    v: i + 1 === new Date().getDate() ? pct : 0,
  }));

  const displayName = name.trim() ? `, ${name.trim()}` : "";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight md:text-[32px]">
          {hour === null ? "Welcome back" : greeting(hour)}{displayName}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {goals.length === 0
            ? "Your day is a clean slate. Add your goals below to begin."
            : `You're ${pct}% through today. Keep the momentum going.`}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          icon={Target}
          label="Goals completed"
          value={`${done} of ${goals.length}`}
          hint={goals.length ? `${pct}% done` : "No goals set"}
        />
        <StatCard
          icon={Timer}
          label="Focus time today"
          value={focusTimeDisplay}
          hint={totalFocusMinutes > 0 ? `${focusSessions.length} session(s)` : "No sessions logged"}
          tone={totalFocusMinutes > 0 ? "success" : "primary"}
        />
        <div className="col-span-2 lg:col-span-1">
          <StatCard
            icon={Percent}
            label="Daily completion"
            value={`${pct}%`}
            hint={pct >= 80 ? "Goal met! 🎯" : "Target: 80%"}
            tone={pct >= 80 ? "success" : pct > 0 ? "warning" : "primary"}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr]">
        {/* Today's Goals */}
        <Panel className="md:row-span-2 xl:row-span-1">
          <SectionHeader
            title="Today's Goals"
            icon={ListChecks}
            action={
              <Link to="/planning" className="text-[13px] text-primary hover:underline">
                View planning
              </Link>
            }
          />
          {goals.length === 0 ? (
            <EmptyState text="No goals yet — add your first goal below to start your day." />
          ) : (
            <ul className="space-y-1">
              {goals.map((g) => {
                if (editingGoalId === g.id) {
                  return (
                    <li key={g.id} className="flex items-center gap-1.5 rounded-lg border border-primary/40 bg-accent/20 p-1.5 text-xs">
                      <input
                        value={editingGoalText}
                        onChange={(e) => setEditingGoalText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            saveEditGoal(g.id);
                          } else if (e.key === "Escape") {
                            setEditingGoalId(null);
                          }
                        }}
                        className="h-8 flex-1 rounded border bg-background px-2.5 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => saveEditGoal(g.id)}
                        className="grid size-8 place-items-center rounded bg-primary text-primary-foreground hover:bg-primary-hover transition-colors"
                      >
                        <Check className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingGoalId(null)}
                        className="grid size-8 place-items-center rounded border text-muted-foreground hover:bg-elevated transition-colors"
                      >
                        <X className="size-3.5" />
                      </button>
                    </li>
                  );
                }

                return (
                  <li key={g.id} className="group flex items-center justify-between rounded-lg px-2 hover:bg-elevated">
                    <label className="flex min-h-11 flex-1 cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        checked={g.done}
                        onChange={() => setGoals(goals.map((x) => (x.id === g.id ? { ...x, done: !x.done } : x)))}
                        className="peer sr-only"
                      />
                      <span
                        className={cn(
                          "grid size-5 shrink-0 place-items-center rounded-md border-2 peer-focus-visible:ring-2 peer-focus-visible:ring-ring",
                          g.done ? "border-success bg-success text-background" : "border-border",
                        )}
                      >
                        {g.done && <Check className="size-3.5" strokeWidth={3} />}
                      </span>
                      <span className={cn("flex-1", g.done && "text-muted-foreground line-through")}>{g.text}</span>
                      {g.time && <span className="text-xs text-muted-foreground tabular-nums">{g.time}</span>}
                    </label>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingGoalId(g.id);
                          setEditingGoalText(g.text);
                        }}
                        className="p-1 text-muted-foreground hover:text-primary transition-colors"
                        aria-label={`Edit ${g.text}`}
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        onClick={() => removeGoal(g.id)}
                        className="p-1 text-muted-foreground hover:text-danger transition-colors"
                        aria-label={`Delete ${g.text}`}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addGoal();
            }}
            className="mt-3 flex gap-2"
          >
            <label htmlFor="new-goal" className="sr-only">
              New goal
            </label>
            <input
              id="new-goal"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a goal…"
              className="h-11 flex-1 rounded-[10px] border bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button
              className="grid size-11 place-items-center rounded-[10px] bg-primary text-primary-foreground hover:bg-primary-hover"
              aria-label="Add goal"
            >
              <Plus className="size-5" />
            </button>
          </form>
        </Panel>

        {/* Current Challenge */}
        <Panel className="relative overflow-hidden">
          <div className="bg-gradient-challenge absolute inset-x-0 top-0 h-1" aria-hidden />
          <SectionHeader title="Current Challenge" icon={Trophy} />
          <p className="font-display text-lg font-semibold">{challengeName}</p>
          <p className="mt-1 text-muted-foreground">
            {challengeDay > 0 ? `Day ${challengeDay} of ${challengeTotal}` : "Not started yet"}
          </p>
          <div className="mt-4">
            <ProgressBar
              value={challengeTotal > 0 ? (challengeDay / challengeTotal) * 100 : 0}
              label="Challenge progress"
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-[13px]">
            <span className={cn("flex items-center gap-1", challengeStreak > 0 ? "text-warning" : "text-muted-foreground")}>
              <Flame className="size-4" /> {challengeStreak}-day streak
            </span>
            <span className="text-muted-foreground">
              {challengeDay > 0 ? `Target: Day ${challengeTotal}` : "Ready to begin"}
            </span>
          </div>
          <Link
            to="/challenges"
            className="mt-5 flex h-11 items-center justify-center gap-2 rounded-[10px] bg-primary font-medium text-primary-foreground hover:bg-primary-hover"
          >
            {challengeDay > 0 ? "Continue challenge" : "View challenges"} <ArrowRight className="size-4" />
          </Link>
        </Panel>

        {/* Monthly Budget */}
        <Panel>
          <SectionHeader
            title="Monthly Budget"
            icon={Wallet}
            action={
              <Link to="/money-management" className="text-[13px] text-primary hover:underline">
                Details
              </Link>
            }
          />
          <p className="font-display text-3xl font-semibold tabular-nums">₹{remainingBudget.toLocaleString("en-IN")}</p>
          <p className="text-muted-foreground">remaining of ₹{budget.toLocaleString("en-IN")}</p>
          <div className="mt-4">
            <ProgressBar
              value={budgetPctUsed}
              tone={budgetPctUsed > 90 ? "danger" : "success"}
              label="Budget spent"
            />
          </div>
          <div className="mt-3 flex justify-between text-[13px]">
            <span>
              Spent <b className="tabular-nums">₹{spent.toLocaleString("en-IN")}</b>
            </span>
            <span className="text-muted-foreground">{budgetPctUsed}% used</span>
          </div>
        </Panel>

        <SpecialTask />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]">
        {/* Overall Progress */}
        <Panel>
          <SectionHeader
            title="Overall Progress"
            icon={TrendingUp}
            action={
              <div className="flex rounded-lg bg-elevated p-1" role="tablist" aria-label="Date range">
                {(["week", "month"] as const).map((r) => (
                  <button
                    key={r}
                    role="tab"
                    aria-selected={range === r}
                    onClick={() => setRange(r)}
                    className={cn(
                      "rounded-md px-3 py-1 text-[13px] capitalize",
                      range === r ? "bg-card font-medium shadow-sm" : "text-muted-foreground",
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            }
          />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={range === "week" ? weekData : monthData} margin={{ left: -20, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="d" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} unit="%" />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--foreground)" }} />
                <Area type="monotone" dataKey="v" name="Completion" stroke="var(--chart-1)" strokeWidth={2} fill="url(#fill)" unit="%" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* Daily Summary */}
        <Panel>
          <SectionHeader title="Daily Summary" icon={FileText} />
          <dl className="grid grid-cols-2 gap-3">
            {[
              ["Goals done", `${done} / ${goals.length}`],
              ["Focus time", focusTimeDisplay],
              ["Expenses", `₹${spent.toLocaleString("en-IN")}`],
              ["Streak", `${challengeStreak}d`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg bg-elevated p-3">
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="font-display mt-1 text-lg font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 rounded-lg border-l-2 border-primary bg-accent/40 p-3 text-[13px] text-muted-foreground">
            {pct === 100 && goals.length > 0
              ? "All goals completed today! Excellent execution."
              : goals.length > 0
                ? "Keep going! Focus on one goal at a time to complete your list."
                : "Add your goals above to start tracking your daily accomplishments."}
          </div>
          <Link to="/planning" className="mt-4 inline-flex items-center gap-1 text-[13px] text-primary hover:underline">
            Past plans and reports <ArrowRight className="size-3.5" />
          </Link>
        </Panel>
      </div>
    </div>
  );
}

function SpecialTask() {
  const [special, setSpecial] = useLocal<SpecialTaskData | null>("special-task", null);
  const [isAdding, setIsAdding] = useState(false);
  const [inputVal, setInputVal] = useState("");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    setSpecial({ title: inputVal.trim(), done: false });
    setInputVal("");
    setIsAdding(false);
  };

  return (
    <Panel className="md:col-span-2 xl:col-span-3">
      {special ? (
        <div className="flex flex-wrap items-center gap-4">
          <span className="grid size-10 place-items-center rounded-lg bg-warning/15 text-warning">
            <Star className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Top priority task</p>
            <p className={cn("font-semibold", special.done && "text-muted-foreground line-through")}>
              {special.title}
            </p>
          </div>
          <Tag tone="danger">High priority</Tag>
          <button
            onClick={() => setSpecial({ ...special, done: !special.done })}
            className={cn(
              "flex h-11 items-center gap-2 rounded-[10px] px-4 font-medium transition-colors",
              special.done ? "bg-success/15 text-success" : "bg-secondary hover:bg-elevated",
            )}
          >
            <Check className="size-4" /> {special.done ? "Completed" : "Mark done"}
          </button>
          <button
            onClick={() => setSpecial(null)}
            className="p-2 text-muted-foreground hover:text-danger"
            aria-label="Remove special task"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      ) : isAdding ? (
        <form onSubmit={handleSave} className="flex flex-wrap items-center gap-2">
          <input
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="What is your single most important task today?"
            className="h-11 min-w-[280px] flex-1 rounded-[10px] border bg-background px-3 outline-none"
            autoFocus
          />
          <button
            type="submit"
            className="h-11 rounded-[10px] bg-primary px-4 font-medium text-primary-foreground hover:bg-primary-hover"
          >
            Set task
          </button>
          <button
            type="button"
            onClick={() => setIsAdding(false)}
            className="h-11 rounded-[10px] border px-3 hover:bg-elevated"
          >
            Cancel
          </button>
        </form>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-warning/15 text-warning">
              <Star className="size-4" aria-hidden />
            </span>
            <span className="text-sm text-muted-foreground">No special priority task set for today.</span>
          </div>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-elevated"
          >
            <Plus className="size-3.5" /> Set priority task
          </button>
        </div>
      )}
    </Panel>
  );
}
