import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Filter,
  Flame,
  LayoutDashboard,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Star,
  Target,
  Timer,
  Trash2,
  TrendingUp,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import { PageHeader, Panel, SectionHeader, StatCard, ProgressBar, Tag, EmptyState } from "@/components/common/ui";
import { useLocal } from "@/lib/use-local";
import { pageHead } from "@/lib/meta";
import { cn } from "@/lib/utils";
import {
  type DailyHistoryMap,
  type DailyLog,
  type DailyGoalItem,
  getTodayDateKey,
  getYesterdayDateKey,
  formatFriendlyDate,
  formatLongDate,
  calcPct,
  getDefaultHistorySeed,
  getOffsetDateKey,
  sanitizeHistoryLogs,
} from "@/lib/daily-history";

import { toast } from "sonner";

export const Route = createFileRoute("/history")({
  head: pageHead("Everyday History & Logs", "Review everyday logs, past achievements, focus sessions, and track historical daily performance."),
  component: HistoryPage,
});

function HistoryPage() {
  const [dailyHistory, setDailyHistory] = useLocal<DailyHistoryMap>("daily-history-logs", {});
  const [goals] = useLocal<DailyGoalItem[]>("goals", []);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "completed" | "yesterday" | "recent">("all");
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  // Editing notes state
  const [editingNotesDate, setEditingNotesDate] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");

  // New past day modal state
  const [isAddingPastDay, setIsAddingPastDay] = useState(false);
  const [pastDateInput, setPastDateInput] = useState(getYesterdayDateKey());
  const [pastGoalInput, setPastGoalInput] = useState("");
  const [pastGoalsList, setPastGoalsList] = useState<Array<{ text: string; done: boolean }>>([
    { text: "Core priority task completed", done: true },
  ]);
  const [pastFocusMins, setPastFocusMins] = useState(60);
  const [pastNotesInput, setPastNotesInput] = useState("");

  const activeHistory: DailyHistoryMap = useMemo(() => {
    return sanitizeHistoryLogs(dailyHistory || {}, { removePastDays: true });
  }, [dailyHistory]);

  // Ensure local state and storage are cleaned if any legacy entries remain
  useEffect(() => {
    if (dailyHistory && Object.keys(dailyHistory).length > 0) {
      const sanitized = sanitizeHistoryLogs(dailyHistory, { removePastDays: true });
      if (Object.keys(sanitized).length !== Object.keys(dailyHistory).length) {
        setDailyHistory(sanitized);
      }
    }
  }, [dailyHistory, setDailyHistory]);


  // Sorted list of all logged dates (newest first)
  const sortedDates = useMemo(() => {
    return Object.keys(activeHistory).sort((a, b) => b.localeCompare(a));
  }, [activeHistory]);

  // Overall Statistics across history
  const totalDaysLogged = sortedDates.length;
  const avgCompletionRate = useMemo(() => {
    if (!totalDaysLogged) return 0;
    const sum = sortedDates.reduce((acc, d) => acc + (activeHistory[d]?.completionPct || 0), 0);
    return Math.round(sum / totalDaysLogged);
  }, [sortedDates, activeHistory, totalDaysLogged]);

  const totalFocusMinutesLogged = useMemo(() => {
    return sortedDates.reduce((acc, d) => acc + (activeHistory[d]?.focusMinutes || 0), 0);
  }, [sortedDates, activeHistory]);

  const totalGoalsCompleted = useMemo(() => {
    return sortedDates.reduce((acc, d) => acc + (activeHistory[d]?.goalsDone || 0), 0);
  }, [sortedDates, activeHistory]);

  // Filtered date keys
  const filteredDates = useMemo(() => {
    const todayKey = getTodayDateKey();
    const yesterdayKey = getYesterdayDateKey();

    return sortedDates.filter((dateKey) => {
      const log = activeHistory[dateKey];
      if (!log) return false;

      // Filter Mode
      if (filterMode === "completed" && log.completionPct < 80) return false;
      if (filterMode === "yesterday" && dateKey !== yesterdayKey) return false;
      if (filterMode === "recent") {
        const offset7 = getOffsetDateKey(todayKey, -7);
        if (dateKey < offset7) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesDate = dateKey.includes(query) || formatFriendlyDate(dateKey).toLowerCase().includes(query);
        const matchesNotes = log.notes?.toLowerCase().includes(query);
        const matchesGoals = log.goals?.some((g) => g.text.toLowerCase().includes(query));
        const matchesChallenge = log.challenge?.activeName.toLowerCase().includes(query);
        if (!matchesDate && !matchesNotes && !matchesGoals && !matchesChallenge) {
          return false;
        }
      }

      return true;
    });
  }, [sortedDates, activeHistory, filterMode, searchQuery]);

  const handleSaveNotes = (dateKey: string) => {
    const existing = activeHistory[dateKey];
    if (!existing) return;
    const updated: DailyLog = {
      ...existing,
      notes: notesDraft.trim(),
      updatedAt: Date.now(),
    };
    setDailyHistory({
      ...activeHistory,
      [dateKey]: updated,
    });
    setEditingNotesDate(null);
    toast.success(`Notes saved for ${formatFriendlyDate(dateKey)}`);
  };

  const handleTogglePastGoal = (dateKey: string, goalId: string) => {
    const log = activeHistory[dateKey];
    if (!log) return;
    const updatedGoals = log.goals.map((g) => (g.id === goalId ? { ...g, done: !g.done } : g));
    const doneCount = updatedGoals.filter((g) => g.done).length;
    const newPct = calcPct(doneCount, updatedGoals.length);

    const updatedLog: DailyLog = {
      ...log,
      goals: updatedGoals,
      goalsDone: doneCount,
      completionPct: newPct,
      updatedAt: Date.now(),
    };

    setDailyHistory({
      ...activeHistory,
      [dateKey]: updatedLog,
    });
    toast.success("Goal status updated in history.");
  };

  const handleCreatePastDayLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastDateInput) return;

    const formattedGoals: DailyGoalItem[] = pastGoalsList.map((g) => ({
      id: crypto.randomUUID(),
      text: g.text.trim(),
      done: g.done,
    }));
    const doneCount = formattedGoals.filter((g) => g.done).length;
    const pct = calcPct(doneCount, formattedGoals.length);

    const newLog: DailyLog = {
      date: pastDateInput,
      updatedAt: Date.now(),
      goals: formattedGoals,
      goalsDone: doneCount,
      goalsTotal: formattedGoals.length,
      completionPct: pct,
      focusMinutes: Number(pastFocusMins) || 0,
      focusSessions: pastFocusMins > 0 ? [{ id: crypto.randomUUID(), name: "Deep work session", minutes: Number(pastFocusMins) }] : [],
      notes: pastNotesInput.trim(),
      specialTask: formattedGoals[0] ? { title: formattedGoals[0].text, done: formattedGoals[0].done } : null,
    };

    setDailyHistory({
      ...activeHistory,
      [pastDateInput]: newLog,
    });
    setIsAddingPastDay(false);
    toast.success(`Historical log added for ${formatFriendlyDate(pastDateInput)}!`);
  };

  const handleStartFromToday = () => {
    const todayKey = getTodayDateKey();
    const todayLog = activeHistory[todayKey];
    const nextHistory: DailyHistoryMap = todayLog ? { [todayKey]: todayLog } : {};
    setDailyHistory(nextHistory);
    toast.success("Previous days removed. History tracking started from today!");
  };

  const handleClearAllHistory = () => {
    if (confirm("Are you sure you want to clear all recorded history logs? This cannot be undone.")) {
      setDailyHistory({});
      toast.success("History logs cleared.");
    }
  };

  const totalFocusHours = (totalFocusMinutesLogged / 60).toFixed(1);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Everyday History & Logs"
        description="Comprehensive archive of your daily accomplishments, previous day logs, focus sessions, and discipline metrics."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/"
              className="flex items-center gap-1.5 rounded-lg border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-elevated transition-colors"
            >
              <LayoutDashboard className="size-3.5 text-primary" />
              <span>Back to Dashboard</span>
            </Link>
            <button
              onClick={handleStartFromToday}
              className="flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
              title="Remove previous days and start fresh from today"
            >
              <Sparkles className="size-3.5" />
              <span>Start from Today</span>
            </button>
            <button
              onClick={() => setIsAddingPastDay(true)}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary-hover shadow-sm transition-colors"
            >
              <Plus className="size-3.5" />
              <span>Log Past Day Entry</span>
            </button>
            {totalDaysLogged > 0 && (
              <button
                onClick={handleClearAllHistory}
                className="flex items-center gap-1.5 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-xs font-medium text-danger hover:bg-danger/10 transition-colors"
                title="Clear all recorded history logs"
              >
                <Trash2 className="size-3.5" />
                <span>Clear History</span>
              </button>
            )}
          </div>
        }
      />

      {/* High-level Summary Metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={CalendarDays}
          label="Days Logged"
          value={totalDaysLogged}
          hint="Continuous tracking"
          tone="primary"
        />
        <StatCard
          icon={TrendingUp}
          label="Avg Daily Completion"
          value={`${avgCompletionRate}%`}
          hint={avgCompletionRate >= 80 ? "High discipline 🎯" : "Steady progress"}
          tone={avgCompletionRate >= 80 ? "success" : "warning"}
        />
        <StatCard
          icon={Timer}
          label="Total Focus Hours"
          value={`${totalFocusHours}h`}
          hint={`${totalFocusMinutesLogged} minutes logged`}
          tone="success"
        />
        <StatCard
          icon={Target}
          label="Goals Completed"
          value={totalGoalsCompleted}
          hint="Across all recorded days"
          tone="primary"
        />
      </div>

      {/* Filter and Search Controls */}
      <Panel className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search history by date, goal title, notes or challenge..."
              className="h-10 w-full rounded-xl border bg-background pl-9 pr-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5" role="tablist">
            <span className="mr-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Filter className="size-3.5" /> Filter:
            </span>
            {(
              [
                { id: "all", label: "All Logs" },
                { id: "yesterday", label: "Yesterday" },
                { id: "recent", label: "Past 7 Days" },
                { id: "completed", label: "80%+ Done" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={filterMode === tab.id}
                onClick={() => setFilterMode(tab.id)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  filterMode === tab.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "border bg-elevated/60 text-muted-foreground hover:bg-elevated hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </Panel>

      {/* Add Past Day Entry Modal / Form */}
      {isAddingPastDay && (
        <Panel className="border-primary/40 bg-card/95 shadow-xl">
          <div className="mb-4 flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                <CalendarDays className="size-4" />
              </span>
              <div>
                <h3 className="text-sm font-semibold">Record a Past Day Log</h3>
                <p className="text-xs text-muted-foreground">Add retrospective goals or reflection for yesterday or previous dates.</p>
              </div>
            </div>
            <button
              onClick={() => setIsAddingPastDay(false)}
              className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-elevated"
            >
              <X className="size-4" />
            </button>
          </div>

          <form onSubmit={handleCreatePastDayLog} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Date for Log</label>
                <input
                  type="date"
                  value={pastDateInput}
                  onChange={(e) => setPastDateInput(e.target.value)}
                  className="h-10 w-full rounded-lg border bg-background px-3 text-xs"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Focus Time (minutes)</label>
                <input
                  type="number"
                  min="0"
                  value={pastFocusMins}
                  onChange={(e) => setPastFocusMins(Number(e.target.value))}
                  placeholder="e.g. 60"
                  className="h-10 w-full rounded-lg border bg-background px-3 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Goals on that day</label>
              <div className="space-y-2">
                {pastGoalsList.map((g, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={g.done}
                      onChange={() => {
                        const next = [...pastGoalsList];
                        if (next[idx]) next[idx].done = !next[idx].done;
                        setPastGoalsList(next);
                      }}
                      className="size-4 rounded"
                    />
                    <input
                      value={g.text}
                      onChange={(e) => {
                        const next = [...pastGoalsList];
                        if (next[idx]) next[idx].text = e.target.value;
                        setPastGoalsList(next);
                      }}
                      placeholder="Goal description"
                      className="h-8 flex-1 rounded border bg-background px-2.5 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setPastGoalsList(pastGoalsList.filter((_, i) => i !== idx))}
                      className="p-1 text-muted-foreground hover:text-danger"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input
                    value={pastGoalInput}
                    onChange={(e) => setPastGoalInput(e.target.value)}
                    placeholder="Add another goal..."
                    className="h-8 flex-1 rounded border bg-background px-2.5 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (pastGoalInput.trim()) {
                          setPastGoalsList([...pastGoalsList, { text: pastGoalInput.trim(), done: true }]);
                          setPastGoalInput("");
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (pastGoalInput.trim()) {
                        setPastGoalsList([...pastGoalsList, { text: pastGoalInput.trim(), done: true }]);
                        setPastGoalInput("");
                      }
                    }}
                    className="rounded bg-secondary px-3 text-xs font-medium hover:bg-elevated"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Daily Reflection / Summary Notes</label>
              <textarea
                value={pastNotesInput}
                onChange={(e) => setPastNotesInput(e.target.value)}
                placeholder="What went well on this day? Key achievements or takeaways..."
                rows={2}
                className="w-full rounded-lg border bg-background p-2.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingPastDay(false)}
                className="rounded-lg border px-4 py-2 text-xs font-medium hover:bg-elevated"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary-hover"
              >
                Save Historical Log
              </button>
            </div>
          </form>
        </Panel>
      )}

      {/* Timeline of Everyday Logs */}
      {filteredDates.length === 0 ? (
        <EmptyState text="No logs match your search or filter. Try clearing filters or click 'Log Past Day Entry'." />
      ) : (
        <div className="space-y-4">
          {filteredDates.map((dateKey) => {
            const log = activeHistory[dateKey];
            if (!log) return null;

            const isCurrentToday = dateKey === getTodayDateKey();
            const isCurrentYesterday = dateKey === getYesterdayDateKey();
            const isEditingThisNote = editingNotesDate === dateKey;

            return (
              <Panel
                key={dateKey}
                className={cn(
                  "transition-all duration-200 border",
                  isCurrentToday
                    ? "border-primary/50 shadow-sm bg-card"
                    : isCurrentYesterday
                      ? "border-warning/40 bg-card"
                      : "border-border/80 hover:border-border",
                )}
              >
                {/* Header Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "grid size-10 place-items-center rounded-xl font-bold text-sm",
                        log.completionPct >= 80
                          ? "bg-success/15 text-success"
                          : log.completionPct > 0
                            ? "bg-warning/15 text-warning"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      {log.completionPct}%
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-base tracking-tight text-foreground">
                          {formatFriendlyDate(dateKey)}
                        </h3>
                        {isCurrentToday && (
                          <Tag tone="primary">Today</Tag>
                        )}
                        {isCurrentYesterday && (
                          <Tag tone="warning">Previous Day</Tag>
                        )}
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          ({formatLongDate(dateKey)})
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {log.goalsDone} of {log.goalsTotal} goals completed
                        {log.focusMinutes > 0 && ` • ${log.focusMinutes}m deep focus`}
                        {log.challenge && ` • Day ${log.challenge.day} ${log.challenge.activeName}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      to="/"
                      title="Inspect this day on Dashboard"
                      className="flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs text-muted-foreground hover:bg-elevated hover:text-foreground transition-colors"
                    >
                      <LayoutDashboard className="size-3" />
                      <span>View in Dashboard</span>
                    </Link>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <ProgressBar
                    value={log.completionPct}
                    tone={log.completionPct >= 80 ? "success" : log.completionPct > 0 ? "warning" : "primary"}
                    label={`Completion for ${dateKey}`}
                  />
                </div>

                {/* Details Grid */}
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                  {/* Goals Column */}
                  <div className="rounded-xl bg-elevated/40 p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Target className="size-3.5 text-primary" /> Goals Log
                      </span>
                      <span>{log.goalsDone}/{log.goalsTotal}</span>
                    </div>

                    {log.goals.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">No specific goals recorded for this day.</p>
                    ) : (
                      <ul className="space-y-1.5 text-xs">
                        {log.goals.map((g) => (
                          <li
                            key={g.id}
                            className="group flex items-start justify-between gap-2 rounded p-1 hover:bg-elevated/70 transition-colors"
                          >
                            <label className="flex cursor-pointer items-start gap-2 flex-1 min-w-0">
                              <input
                                type="checkbox"
                                checked={g.done}
                                onChange={() => handleTogglePastGoal(dateKey, g.id)}
                                className="mt-0.5 size-3.5 rounded border-border"
                              />
                              <span className={cn("truncate", g.done && "line-through text-muted-foreground")}>
                                {g.text}
                              </span>
                            </label>
                            {g.time && (
                              <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                                {g.time}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Highlights: Focus & Challenge & Priority Task */}
                  <div className="rounded-xl bg-elevated/40 p-3.5 space-y-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                      <Sparkles className="size-3.5 text-warning" /> Day Highlights
                    </div>

                    {/* Focus time */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Timer className="size-3.5" /> Deep Focus:
                      </span>
                      <span className="font-semibold tabular-nums">
                        {log.focusMinutes >= 60
                          ? `${Math.floor(log.focusMinutes / 60)}h ${log.focusMinutes % 60 ? `${log.focusMinutes % 60}m` : ""}`
                          : `${log.focusMinutes}m`}
                      </span>
                    </div>

                    {/* Challenge */}
                    {log.challenge && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Flame className="size-3.5 text-warning" /> Challenge:
                        </span>
                        <span className="font-semibold truncate max-w-[150px]">
                          Day {log.challenge.day} ({log.challenge.activeName})
                        </span>
                      </div>
                    )}

                    {/* Special Priority Task */}
                    {log.specialTask && (
                      <div className="rounded-lg border bg-background/80 p-2 text-xs space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1 font-medium text-warning">
                            <Star className="size-3" /> Priority Task
                          </span>
                          <span className={log.specialTask.done ? "text-success font-semibold" : "text-muted-foreground"}>
                            {log.specialTask.done ? "Completed" : "Incomplete"}
                          </span>
                        </div>
                        <p className={cn("font-medium truncate", log.specialTask.done && "line-through text-muted-foreground")}>
                          {log.specialTask.title}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Daily Reflection & Notes */}
                  <div className="rounded-xl bg-elevated/40 p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <BookOpen className="size-3.5 text-primary" /> Daily Reflection / Notes
                      </span>
                      {!isEditingThisNote && (
                        <button
                          onClick={() => {
                            setEditingNotesDate(dateKey);
                            setNotesDraft(log.notes || "");
                          }}
                          className="flex items-center gap-1 text-[11px] text-primary hover:underline"
                        >
                          <Pencil className="size-3" /> Edit
                        </button>
                      )}
                    </div>

                    {isEditingThisNote ? (
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
                            onClick={() => setEditingNotesDate(null)}
                            className="rounded px-2.5 py-1 text-xs border text-muted-foreground hover:bg-elevated"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveNotes(dateKey)}
                            className="rounded bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary-hover"
                          >
                            Save Notes
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground leading-relaxed italic">
                        {log.notes?.trim() ? `"${log.notes.trim()}"` : "No reflection or notes recorded for this day."}
                      </p>
                    )}
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}
