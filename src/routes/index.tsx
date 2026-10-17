import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  Target,
  Timer,
  Percent,
  ListChecks,
  Trophy,
  Wallet,
  Star,
  FileText,
  TrendingUp,
  Plus,
  Check,
  ArrowRight,
  Flame,
  Trash2,
  Pencil,
  X,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  History,
  RotateCcw,
  BookOpen,
} from "lucide-react";
import { Panel, SectionHeader, StatCard, ProgressBar, Tag, EmptyState } from "@/components/common/ui";
import { useLocal } from "@/lib/use-local";
import { pageHead } from "@/lib/meta";
import { cn } from "@/lib/utils";
import {
  type DailyHistoryMap,
  type DailyLog,
  type DailyGoalItem,
  getTodayDateKey,
  getYesterdayDateKey,
  getOffsetDateKey,
  formatFriendlyDate,
  formatLongDate,
  formatDateKey,
  calcPct,
  getDefaultHistorySeed,
  sanitizeHistoryLogs,
} from "@/lib/daily-history";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: pageHead("Dashboard", "Your day at a glance: goals, focus time, challenge progress, budget and everyday history."),
  component: Dashboard,
});

type Goal = { id: string; text: string; done: boolean; time?: string | undefined };
type Tx = { id: string; name: string; cat: string; amount: number; date: string };
type FocusSession = { id: string; minutes: number; name?: string; tag?: string };
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
  const [special, setSpecial] = useLocal<SpecialTaskData | null>("special-task", null);

  // Everyday History Storage
  const [dailyHistory, setDailyHistory] = useLocal<DailyHistoryMap>("daily-history-logs", {});
  const todayKey = getTodayDateKey();
  const yesterdayKey = getYesterdayDateKey();

  // Selected date state for viewing everyday / previous day logs
  const [selectedDateKey, setSelectedDateKey] = useState<string>(todayKey);

  useEffect(() => setHour(new Date().getHours()), []);

  const activeHistory: DailyHistoryMap = useMemo(() => {
    return sanitizeHistoryLogs(dailyHistory || {}, { removePastDays: true });
  }, [dailyHistory]);

  // Today calculations
  const todayDone = goals.filter((g) => g.done).length;
  const todayPct = goals.length ? Math.round((todayDone / goals.length) * 100) : 0;

  // Real financial calculations
  const expenses = txs.filter((t) => t.amount < 0);
  const spent = Math.abs(expenses.reduce((s, t) => s + t.amount, 0));
  const remainingBudget = Math.max(0, budget - spent);
  const budgetPctUsed = budget > 0 ? Math.round((spent / budget) * 100) : 0;

  // Real focus calculation
  const totalFocusMinutes = focusSessions.reduce((acc, s) => acc + s.minutes, 0);

  // Sync today's activities into dailyHistory automatically
  useEffect(() => {
    const existing = activeHistory[todayKey];
    const doneCount = goals.filter((g) => g.done).length;
    const currentPct = goals.length ? Math.round((doneCount / goals.length) * 100) : 0;

    if (
      !existing ||
      existing.goalsDone !== doneCount ||
      existing.goalsTotal !== goals.length ||
      existing.focusMinutes !== totalFocusMinutes ||
      existing.completionPct !== currentPct ||
      JSON.stringify(existing.specialTask) !== JSON.stringify(special)
    ) {
      const updatedLog: DailyLog = {
        date: todayKey,
        updatedAt: Date.now(),
        goals: goals.map((g) => ({ id: g.id, text: g.text, done: g.done, time: g.time })),
        goalsDone: doneCount,
        goalsTotal: goals.length,
        completionPct: currentPct,
        focusMinutes: totalFocusMinutes,
        focusSessions: focusSessions.map((s) => ({
          id: s.id,
          name: s.name || "Deep work session",
          minutes: s.minutes,
          tag: s.tag,
        })),
        specialTask: special,
        challenge: {
          activeName: challengeName,
          day: challengeDay,
          totalDays: challengeTotal,
          streak: challengeStreak,
        },
        spent,
        notes: existing?.notes || "",
      };

      setDailyHistory({
        ...activeHistory,
        [todayKey]: updatedLog,
      });
    }
  }, [goals, focusSessions, special, challengeName, challengeDay, challengeTotal, challengeStreak, spent, todayKey]);

  // Determine whether we are viewing Today or a Previous day
  const isViewingToday = selectedDateKey === todayKey;
  const isViewingYesterday = selectedDateKey === yesterdayKey;
  const historicalLog: DailyLog | undefined = activeHistory[selectedDateKey];

  // Active metrics based on selected date
  const displayGoals: DailyGoalItem[] = isViewingToday
    ? goals
    : historicalLog?.goals ?? [];

  const displayDoneCount = isViewingToday
    ? todayDone
    : historicalLog?.goalsDone ?? 0;

  const displayGoalsTotal = isViewingToday
    ? goals.length
    : historicalLog?.goalsTotal ?? 0;

  const displayPct = isViewingToday
    ? todayPct
    : historicalLog?.completionPct ?? (displayGoalsTotal ? calcPct(displayDoneCount, displayGoalsTotal) : 0);

  const displayFocusMinutes = isViewingToday
    ? totalFocusMinutes
    : historicalLog?.focusMinutes ?? 0;

  const displayFocusTime =
    displayFocusMinutes >= 60
      ? `${Math.floor(displayFocusMinutes / 60)}h ${displayFocusMinutes % 60 ? `${displayFocusMinutes % 60}m` : ""}`
      : `${displayFocusMinutes}m`;

  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editingGoalText, setEditingGoalText] = useState("");

  // Notes editing for selected date
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");

  const addGoal = () => {
    if (!draft.trim()) return;
    const newGoalItem: Goal = { id: crypto.randomUUID(), text: draft.trim(), done: false };

    if (isViewingToday) {
      setGoals([...goals, newGoalItem]);
    } else {
      // Add to historical day log
      const updatedGoals = [...displayGoals, newGoalItem];
      const doneCount = updatedGoals.filter((g) => g.done).length;
      const pct = calcPct(doneCount, updatedGoals.length);

      const updatedLog: DailyLog = {
        ...(historicalLog || {
          date: selectedDateKey,
          updatedAt: Date.now(),
          focusMinutes: 0,
          focusSessions: [],
        }),
        date: selectedDateKey,
        updatedAt: Date.now(),
        goals: updatedGoals,
        goalsDone: doneCount,
        goalsTotal: updatedGoals.length,
        completionPct: pct,
      };

      setDailyHistory({
        ...activeHistory,
        [selectedDateKey]: updatedLog,
      });
      toast.success(`Goal added to ${formatFriendlyDate(selectedDateKey)} record.`);
    }
    setDraft("");
  };

  const toggleGoal = (id: string) => {
    if (isViewingToday) {
      setGoals(goals.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
    } else {
      // Toggle in historical log
      const updatedGoals = displayGoals.map((x) => (x.id === id ? { ...x, done: !x.done } : x));
      const doneCount = updatedGoals.filter((g) => g.done).length;
      const pct = calcPct(doneCount, updatedGoals.length);

      const updatedLog: DailyLog = {
        ...(historicalLog || {
          date: selectedDateKey,
          updatedAt: Date.now(),
          focusMinutes: 0,
          focusSessions: [],
        }),
        date: selectedDateKey,
        updatedAt: Date.now(),
        goals: updatedGoals,
        goalsDone: doneCount,
        goalsTotal: updatedGoals.length,
        completionPct: pct,
      };

      setDailyHistory({
        ...activeHistory,
        [selectedDateKey]: updatedLog,
      });
    }
  };

  const saveEditGoal = (id: string) => {
    const trimmed = editingGoalText.trim();
    if (!trimmed) return;
    if (isViewingToday) {
      setGoals(goals.map((g) => (g.id === id ? { ...g, text: trimmed } : g)));
    } else {
      const updatedGoals = displayGoals.map((g) => (g.id === id ? { ...g, text: trimmed } : g));
      if (historicalLog) {
        setDailyHistory({
          ...activeHistory,
          [selectedDateKey]: { ...historicalLog, goals: updatedGoals, updatedAt: Date.now() },
        });
      }
    }
    setEditingGoalId(null);
  };

  const removeGoal = (id: string) => {
    if (isViewingToday) {
      setGoals(goals.filter((g) => g.id !== id));
    } else {
      const updatedGoals = displayGoals.filter((g) => g.id !== id);
      const doneCount = updatedGoals.filter((g) => g.done).length;
      const pct = calcPct(doneCount, updatedGoals.length);
      if (historicalLog) {
        setDailyHistory({
          ...activeHistory,
          [selectedDateKey]: {
            ...historicalLog,
            goals: updatedGoals,
            goalsDone: doneCount,
            goalsTotal: updatedGoals.length,
            completionPct: pct,
            updatedAt: Date.now(),
          },
        });
      }
    }
  };

  const handleSaveNotes = () => {
    const currentLog = historicalLog || {
      date: selectedDateKey,
      updatedAt: Date.now(),
      goals: isViewingToday ? goals : [],
      goalsDone: displayDoneCount,
      goalsTotal: displayGoalsTotal,
      completionPct: displayPct,
      focusMinutes: displayFocusMinutes,
      focusSessions: [],
    };

    setDailyHistory({
      ...activeHistory,
      [selectedDateKey]: {
        ...currentLog,
        notes: notesDraft.trim(),
        updatedAt: Date.now(),
      },
    });
    setEditingNotes(false);
    toast.success(`Notes saved for ${formatFriendlyDate(selectedDateKey)}.`);
  };

  // Dynamic progress chart reflecting real historical everyday logs
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const curr = new Date();
  const dayOfWeek = (curr.getDay() + 6) % 7; // 0 = Mon, 6 = Sun
  const monday = new Date(curr);
  monday.setDate(curr.getDate() - dayOfWeek);

  const weekData = weekDays.map((d, i) => {
    const dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + i);
    const dateKey = formatDateKey(dayDate);
    const isCurrentDay = dateKey === todayKey;
    const log = activeHistory[dateKey];
    return {
      d,
      v: isCurrentDay ? todayPct : (log?.completionPct ?? 0),
      dateKey,
    };
  });

  const monthData = Array.from({ length: 30 }, (_, i) => {
    const dayNum = i + 1;
    const dObj = new Date(curr.getFullYear(), curr.getMonth(), dayNum);
    const dateKey = formatDateKey(dObj);
    const isCurrentDay = dateKey === todayKey;
    const log = activeHistory[dateKey];
    return {
      d: `${dayNum}`,
      v: isCurrentDay ? todayPct : (log?.completionPct ?? 0),
      dateKey,
    };
  });

  const displayName = name.trim() ? `, ${name.trim()}` : "";

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight md:text-[32px]">
            {hour === null ? "Welcome back" : greeting(hour)}{displayName}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {isViewingToday
              ? goals.length === 0
                ? "Your day is a clean slate. Add your goals below to begin."
                : `You're ${todayPct}% through today. Keep the momentum going.`
              : `Reviewing recorded log for ${formatFriendlyDate(selectedDateKey)} (${formatLongDate(selectedDateKey)}).`}
          </p>
        </div>

        {/* Link to Full Everyday History */}
        <Link
          to="/history"
          className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3.5 py-2 text-xs font-medium text-primary hover:bg-primary/10 transition-colors shadow-sm"
        >
          <History className="size-4" />
          <span>Everyday History & Logs</span>
          <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[11px] font-semibold">
            {Object.keys(activeHistory).length} days
          </span>
        </Link>
      </div>

      {/* Date Navigation Bar: Today, Yesterday & Calendar */}
      <Panel className="border-border/80 bg-card/60 p-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Day Navigation Controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSelectedDateKey(getOffsetDateKey(selectedDateKey, -1))}
              className="grid size-9 place-items-center rounded-lg border border-border/80 bg-background text-muted-foreground hover:bg-elevated hover:text-foreground transition-colors"
              title="Previous day"
            >
              <ChevronLeft className="size-4" />
            </button>

            <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-background px-3 py-1.5 text-xs font-semibold">
              <CalendarDays className="size-4 text-primary" />
              <span>{formatFriendlyDate(selectedDateKey)}</span>
              <span className="text-muted-foreground hidden sm:inline">
                ({selectedDateKey})
              </span>
            </div>

            <button
              disabled={isViewingToday}
              onClick={() => setSelectedDateKey(getOffsetDateKey(selectedDateKey, 1))}
              className="grid size-9 place-items-center rounded-lg border border-border/80 bg-background text-muted-foreground hover:bg-elevated hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Next day"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          {/* Quick Date Selectors */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedDateKey(todayKey)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                isViewingToday
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "border border-border/80 bg-background text-muted-foreground hover:bg-elevated hover:text-foreground",
              )}
            >
              Today
            </button>
            <button
              onClick={() => setSelectedDateKey(yesterdayKey)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                isViewingYesterday
                  ? "bg-warning text-warning-foreground shadow-sm"
                  : "border border-border/80 bg-background text-muted-foreground hover:bg-elevated hover:text-foreground",
              )}
            >
              Yesterday (Previous day)
            </button>

            <div className="relative flex items-center">
              <input
                type="date"
                max={todayKey}
                value={selectedDateKey}
                onChange={(e) => {
                  if (e.target.value) setSelectedDateKey(e.target.value);
                }}
                className="h-8 rounded-lg border border-border/80 bg-background px-2 text-xs text-muted-foreground hover:text-foreground"
                title="Select date"
              />
            </div>

            {!isViewingToday && (
              <button
                onClick={() => setSelectedDateKey(todayKey)}
                className="flex items-center gap-1 rounded-lg border border-primary/40 bg-accent/40 px-2.5 py-1 text-xs font-medium text-primary hover:bg-accent transition-colors"
              >
                <RotateCcw className="size-3" /> Return to Today
              </button>
            )}
          </div>
        </div>
      </Panel>

      {/* Historical Mode Alert Banner */}
      {!isViewingToday && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/40 bg-warning/10 p-3.5 text-xs text-foreground">
          <div className="flex items-center gap-2.5">
            <span className="grid size-7 place-items-center rounded-lg bg-warning/20 text-warning">
              <CalendarDays className="size-4" />
            </span>
            <span>
              <strong>Viewing Historical Record for {formatFriendlyDate(selectedDateKey)}:</strong> Showing the goals, focus time, and achievements logged on {formatLongDate(selectedDateKey)}.
            </span>
          </div>
          <button
            onClick={() => setSelectedDateKey(todayKey)}
            className="flex items-center gap-1 font-semibold text-primary hover:underline shrink-0"
          >
            Back to Today's Dashboard <ArrowRight className="size-3.5" />
          </button>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          icon={Target}
          label={isViewingToday ? "Goals completed" : `Goals completed (${formatFriendlyDate(selectedDateKey)})`}
          value={`${displayDoneCount} of ${displayGoalsTotal}`}
          hint={displayGoalsTotal ? `${displayPct}% done` : "No goals set"}
        />
        <StatCard
          icon={Timer}
          label={isViewingToday ? "Focus time today" : `Focus time (${formatFriendlyDate(selectedDateKey)})`}
          value={displayFocusTime}
          hint={displayFocusMinutes > 0 ? `${displayFocusMinutes}m recorded` : "No sessions logged"}
          tone={displayFocusMinutes > 0 ? "success" : "primary"}
        />
        <div className="col-span-2 lg:col-span-1">
          <StatCard
            icon={Percent}
            label={isViewingToday ? "Daily completion" : "Historical completion"}
            value={`${displayPct}%`}
            hint={displayPct >= 80 ? "Goal met! 🎯" : "Target: 80%"}
            tone={displayPct >= 80 ? "success" : displayPct > 0 ? "warning" : "primary"}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr]">
        {/* Goals Panel (Today's Goals or Previous Day's Goals) */}
        <Panel className="md:row-span-2 xl:row-span-1">
          <SectionHeader
            title={isViewingToday ? "Today's Goals" : `Goals on ${formatFriendlyDate(selectedDateKey)}`}
            icon={ListChecks}
            action={
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {displayDoneCount}/{displayGoalsTotal} done
                </span>
                <Link to="/planning" className="text-[13px] text-primary hover:underline">
                  Planning
                </Link>
              </div>
            }
          />

          {displayGoals.length === 0 ? (
            <EmptyState
              text={
                isViewingToday
                  ? "No goals yet — add your first goal below to start your day."
                  : `No goals recorded for ${formatFriendlyDate(selectedDateKey)}. Use the form below to add a retrospective goal.`
              }
            />
          ) : (
            <ul className="space-y-1">
              {displayGoals.map((g) => {
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
                        onChange={() => toggleGoal(g.id)}
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
              placeholder={isViewingToday ? "Add a goal…" : `Add a goal to ${formatFriendlyDate(selectedDateKey)}'s log…`}
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
          <SectionHeader title="Challenge Status" icon={Trophy} />
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

        {/* Special Priority Task */}
        <SpecialTask
          isViewingToday={isViewingToday}
          selectedDateKey={selectedDateKey}
          historicalTask={historicalLog?.specialTask}
          onUpdateHistoricalTask={(updatedTask) => {
            if (historicalLog) {
              setDailyHistory({
                ...activeHistory,
                [selectedDateKey]: { ...historicalLog, specialTask: updatedTask, updatedAt: Date.now() },
              });
            }
          }}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]">
        {/* Overall Progress - Connected to Real Everyday History */}
        <Panel>
          <SectionHeader
            title="Overall Progress History"
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
                      "rounded-md px-3 py-1 text-[13px] capitalize transition-colors",
                      range === r ? "bg-card font-medium shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
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
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0]?.payload;
                      return (
                        <div className="rounded-xl border bg-popover p-2.5 shadow-xl text-xs space-y-1">
                          <p className="font-semibold text-foreground">{data.dateKey || data.d}</p>
                          <p className="text-primary font-medium">Completion: {data.v}%</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area type="monotone" dataKey="v" name="Completion" stroke="var(--chart-1)" strokeWidth={2} fill="url(#fill)" unit="%" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
            <span>Chart tracks daily completion % from stored everyday logs.</span>
            <Link to="/history" className="text-primary hover:underline flex items-center gap-1 font-medium">
              View all past logs <ArrowRight className="size-3" />
            </Link>
          </div>
        </Panel>

        {/* Daily Summary & Reflection Notes */}
        <Panel className="space-y-4">
          <SectionHeader
            title={isViewingToday ? "Daily Summary" : `Summary: ${formatFriendlyDate(selectedDateKey)}`}
            icon={FileText}
          />
          <dl className="grid grid-cols-2 gap-3">
            {[
              ["Goals done", `${displayDoneCount} / ${displayGoalsTotal}`],
              ["Focus time", displayFocusTime],
              ["Expenses", `₹${spent.toLocaleString("en-IN")}`],
              ["Streak", `${challengeStreak}d`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg bg-elevated p-3">
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="font-display mt-1 text-lg font-semibold">{v}</dd>
              </div>
            ))}
          </dl>

          {/* Daily Reflection / Note Box for the Active Day */}
          <div className="rounded-xl border bg-card p-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-foreground">
                <BookOpen className="size-3.5 text-primary" /> Daily Notes & Reflection
              </span>
              {!editingNotes && (
                <button
                  onClick={() => {
                    setEditingNotes(true);
                    setNotesDraft(historicalLog?.notes || "");
                  }}
                  className="flex items-center gap-1 text-[11px] text-primary hover:underline"
                >
                  <Pencil className="size-3" /> {historicalLog?.notes ? "Edit" : "Add note"}
                </button>
              )}
            </div>

            {editingNotes ? (
              <div className="space-y-2">
                <textarea
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  placeholder="Record key takeaways, thoughts, or wins for this day..."
                  rows={3}
                  className="w-full rounded-lg border bg-background p-2 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  autoFocus
                />
                <div className="flex justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditingNotes(false)}
                    className="rounded px-2.5 py-1 text-xs border text-muted-foreground hover:bg-elevated"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveNotes}
                    className="rounded bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary-hover"
                  >
                    Save Notes
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground leading-relaxed italic">
                {historicalLog?.notes?.trim()
                  ? `"${historicalLog.notes.trim()}"`
                  : isViewingToday
                    ? "Add a quick reflection note on your focus and accomplishments today."
                    : "No notes logged for this previous day."}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2">
            <Link to="/history" className="inline-flex items-center gap-1 text-[13px] text-primary hover:underline font-medium">
              Browse all everyday logs <ArrowRight className="size-3.5" />
            </Link>
            <Link to="/planning" className="text-xs text-muted-foreground hover:underline">
              Long-term planning
            </Link>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function SpecialTask({
  isViewingToday,
  selectedDateKey,
  historicalTask,
  onUpdateHistoricalTask,
}: {
  isViewingToday: boolean;
  selectedDateKey: string;
  historicalTask?: SpecialTaskData | null | undefined;
  onUpdateHistoricalTask?: ((task: SpecialTaskData | null) => void) | undefined;
}) {
  const [special, setSpecial] = useLocal<SpecialTaskData | null>("special-task", null);
  const [isAdding, setIsAdding] = useState(false);
  const [inputVal, setInputVal] = useState("");

  const activeTask = isViewingToday ? special : (historicalTask ?? null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    const newTask = { title: inputVal.trim(), done: false };
    if (isViewingToday) {
      setSpecial(newTask);
    } else if (onUpdateHistoricalTask) {
      onUpdateHistoricalTask(newTask);
    }
    setInputVal("");
    setIsAdding(false);
  };

  const handleToggle = () => {
    if (!activeTask) return;
    const updated = { ...activeTask, done: !activeTask.done };
    if (isViewingToday) {
      setSpecial(updated);
    } else if (onUpdateHistoricalTask) {
      onUpdateHistoricalTask(updated);
    }
  };

  const handleRemove = () => {
    if (isViewingToday) {
      setSpecial(null);
    } else if (onUpdateHistoricalTask) {
      onUpdateHistoricalTask(null);
    }
  };

  return (
    <Panel className="md:col-span-2 xl:col-span-3">
      {activeTask ? (
        <div className="flex flex-wrap items-center gap-4">
          <span className="grid size-10 place-items-center rounded-lg bg-warning/15 text-warning">
            <Star className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
              {isViewingToday ? "Top priority task" : `Priority task (${formatFriendlyDate(selectedDateKey)})`}
            </p>
            <p className={cn("font-semibold", activeTask.done && "text-muted-foreground line-through")}>
              {activeTask.title}
            </p>
          </div>
          <Tag tone="danger">High priority</Tag>
          <button
            onClick={handleToggle}
            className={cn(
              "flex h-11 items-center gap-2 rounded-[10px] px-4 font-medium transition-colors",
              activeTask.done ? "bg-success/15 text-success" : "bg-secondary hover:bg-elevated",
            )}
          >
            <Check className="size-4" /> {activeTask.done ? "Completed" : "Mark done"}
          </button>
          <button
            onClick={handleRemove}
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
            placeholder={isViewingToday ? "What is your single most important task today?" : `Priority task for ${formatFriendlyDate(selectedDateKey)}?`}
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
            <span className="text-sm text-muted-foreground">
              {isViewingToday
                ? "No special priority task set for today."
                : `No priority task recorded for ${formatFriendlyDate(selectedDateKey)}.`}
            </span>
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
