import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Trophy,
  Flame,
  Award,
  CheckCircle2,
  RotateCcw,
  History,
  Lock,
  Plus,
  Trash2,
  Sparkles,
  Target,
  Layers,
  X,
  ChevronRight,
  Database,
  CloudCheck,
  Shuffle,
  GripVertical,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
} from "lucide-react";
import { PageHeader, Panel, SectionHeader, ProgressBar, Tag, EmptyState } from "@/components/common/ui";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useLocal, getEffectiveUserId } from "@/lib/use-local";
import { pageHead } from "@/lib/meta";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/challenges")({
  head: pageHead("Take Challenge", "Join challenges, create custom goals, build streaks and celebrate milestones."),
  component: Challenges,
});

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = result[i]!;
    result[i] = result[j]!;
    result[j] = temp;
  }
  return result;
}

export interface CustomChallenge {
  id: string;
  name: string;
  days: number;
  level: "Easy" | "Medium" | "Hard";
  reqs: string[];
  createdAt: string;
}

const defaultPresetReqs = [
  "Two 45-min workouts",
  "Follow your nutrition plan",
  "Drink 3L of water",
  "Read 10 pages",
  "Progress photo",
];

const defaultReqsMap: Record<string, string[]> = {
  "75 Days of Discipline": defaultPresetReqs,
  "30-Day No Sugar": [
    "Zero added sugar or sweetened drinks",
    "Eat whole unprocessed foods",
    "Drink 2.5L of water",
    "Log daily energy levels",
  ],
  "10k Steps Daily": [
    "Reach 10,000 steps",
    "15-min post-meal brisk walk",
    "5 minutes of stretching",
  ],
  "Morning Pages": [
    "Write 3 pages of stream-of-consciousness",
    "No digital devices for first 30 mins",
    "Define top 3 daily priorities",
  ],
};

const availablePresets = [
  { name: "75 Days of Discipline", days: 75, level: "Hard", reqs: defaultPresetReqs },
  { name: "30-Day No Sugar", days: 30, level: "Medium", reqs: defaultReqsMap["30-Day No Sugar"]! },
  { name: "10k Steps Daily", days: 21, level: "Easy", reqs: defaultReqsMap["10k Steps Daily"]! },
  { name: "Morning Pages", days: 14, level: "Easy", reqs: defaultReqsMap["Morning Pages"]! },
];

const SUGGESTIONS = [
  "Drink 2.5L Water",
  "30-Min Workout",
  "10,000 Steps",
  "Read 15 Pages",
  "Meditate 10 Mins",
  "Zero Sugar / Junk",
  "Sleep by 11:00 PM",
  "Journal 5 Mins",
  "No Screen 1h Before Bed",
  "Cold Shower",
  "Daily Gratitude",
  "Code for 1 Hour",
];

function getMilestones(days: number): number[] {
  if (days <= 7) return [Math.max(1, Math.floor(days / 2)), days];
  if (days <= 14) return [3, 7, 10, days];
  if (days <= 21) return [7, 14, days];
  if (days <= 30) return [7, 14, 21, days];
  if (days <= 60) return [7, 21, 30, 45, days];
  if (days <= 75) return [7, 21, 40, 60, days];
  return [7, 21, 50, 75, days];
}

function Challenges() {
  const [activeName, setActiveName] = useLocal("challenge-name", "75 Days of Discipline");
  const [totalDays, setTotalDays] = useLocal("challenge-total-days", 75);
  const [day, setDay] = useLocal("challenge-day", 0);
  const [streak, setStreak] = useLocal("challenge-streak", 0);
  const [checked, setChecked] = useLocal<string[]>("challenge-checked", []);
  const [history, setHistory] = useLocal<Array<{ name: string; status: string }>>("challenge-history", []);
  const [activeReqs, setActiveReqs] = useLocal<string[]>("challenge-active-reqs", defaultPresetReqs);
  const [customList, setCustomList] = useLocal<CustomChallenge[]>("challenge-custom-list", []);

  // UI State
  const [activeTab, setActiveTab] = useState<"preset" | "custom">("preset");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form State for Custom Challenge
  const [customName, setCustomName] = useState("");
  const [customDays, setCustomDays] = useState(30);
  const [customLevel, setCustomLevel] = useState<"Easy" | "Medium" | "Hard">("Medium");
  const [customReqs, setCustomReqs] = useState<string[]>([
    "Drink 2.5L Water",
    "30-Min Workout",
    "Read 10 Pages",
  ]);
  const [newReqInput, setNewReqInput] = useState("");

  const effectiveReqs = activeReqs && activeReqs.length > 0 ? activeReqs : defaultPresetReqs;
  const allDone = effectiveReqs.length > 0 && checked.length === effectiveReqs.length;
  const currentMilestones = getMilestones(totalDays).filter((m) => m <= totalDays);

  // Reorder & shuffle states for challenge tasks
  const [draggedReqIdx, setDraggedReqIdx] = useState<number | null>(null);
  const [draggedCustomReqIdx, setDraggedCustomReqIdx] = useState<number | null>(null);
  const [orderMenuOpen, setOrderMenuOpen] = useState(false);

  const handleReorderActiveReqs = (newReqs: string[], message?: string) => {
    setActiveReqs(newReqs);
    if (message) {
      toast.success(message);
    }
    const userId = getEffectiveUserId();
    fetch("/api/challenges/take", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        activeName,
        totalDays,
        day,
        streak,
        checked,
        activeReqs: newReqs,
        history,
      }),
    }).catch(() => {});
  };

  const moveActiveReq = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= effectiveReqs.length) return;
    const updated = [...effectiveReqs];
    const [moved] = updated.splice(fromIndex, 1);
    if (!moved) return;
    updated.splice(toIndex, 0, moved);
    handleReorderActiveReqs(updated, "Requirement moved.");
  };

  const handleShuffleActiveReqs = () => {
    if (effectiveReqs.length < 2) {
      toast.info("Add at least 2 requirements to shuffle.");
      return;
    }
    const shuffled = shuffleArray(effectiveReqs);
    handleReorderActiveReqs(shuffled, "Requirements shuffled & saved to database!");
  };

  const handleSortActiveReqsPendingFirst = () => {
    const sorted = [...effectiveReqs].sort((a, b) => {
      const aDone = checked.includes(a);
      const bDone = checked.includes(b);
      return Number(aDone) - Number(bDone);
    });
    handleReorderActiveReqs(sorted, "Pending tasks moved to top!");
  };

  const handleReverseActiveReqs = () => {
    const reversed = [...effectiveReqs].reverse();
    handleReorderActiveReqs(reversed, "Requirements order reversed!");
  };

  const moveCustomReq = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= customReqs.length) return;
    const updated = [...customReqs];
    const [moved] = updated.splice(fromIndex, 1);
    if (!moved) return;
    updated.splice(toIndex, 0, moved);
    setCustomReqs(updated);
  };

  const handleShuffleCustomReqs = () => {
    if (customReqs.length < 2) return;
    setCustomReqs(shuffleArray(customReqs));
    toast.success("Requirements shuffled!");
  };

  // Load custom challenges & active progress from MongoDB on component mount
  useEffect(() => {
    const userId = getEffectiveUserId();
    fetch(`/api/challenges?userId=${encodeURIComponent(userId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success) {
          if (Array.isArray(data.customList) && data.customList.length > 0) {
            setCustomList((prev) => {
              const map = new Map<string, CustomChallenge>();
              // Load database challenges first
              for (const item of data.customList) {
                if (item?.id || item?.name) {
                  map.set(item.id || item.name, item);
                }
              }
              // Merge local challenges that might not yet be in database
              for (const item of prev) {
                if ((item?.id || item?.name) && !map.has(item.id || item.name)) {
                  map.set(item.id || item.name, item);
                  // Upload un-synced local challenge to database
                  fetch("/api/challenges/custom", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId, challenge: item }),
                  }).catch(() => {});
                }
              }
              return Array.from(map.values());
            });
          } else if (customList.length > 0) {
            // If database has none yet, sync existing local custom challenges to database
            for (const item of customList) {
              fetch("/api/challenges/custom", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, challenge: item }),
              }).catch(() => {});
            }
          }

          if (data.activeChallenge && data.activeChallenge.activeName) {
            const remote = data.activeChallenge;
            if (remote.day > 0) {
              setActiveName(remote.activeName);
              setTotalDays(remote.totalDays);
              setDay(remote.day);
              setStreak(remote.streak);
              if (remote.checked) setChecked(remote.checked);
              if (remote.activeReqs && remote.activeReqs.length > 0) setActiveReqs(remote.activeReqs);
              if (remote.history) setHistory(remote.history);
            }
          }
        }
      })
      .catch((err) => {
        console.warn("[MongoDB] Error synchronizing challenges:", err);
      });
  }, []);

  const completeDay = () => {
    const nextDay = day + 1;
    const nextStreak = streak + 1;
    setDay(nextDay);
    setStreak(nextStreak);
    setChecked([]);

    let nextHistory = history;
    if (nextDay >= totalDays) {
      toast.success(`🎉 Congratulations! You completed the ${activeName}!`, {
        description: "Challenge saved to MongoDB database history.",
      });
      nextHistory = [...history, { name: `${activeName} · ${totalDays}d`, status: "Completed" }];
      setHistory(nextHistory);
    } else {
      toast.success(`Day ${nextDay} complete! 🎉`, {
        description: currentMilestones.includes(nextDay) ? "New milestone unlocked!" : "Keep the streak alive.",
      });
    }

    const userId = getEffectiveUserId();
    fetch("/api/challenges/take", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        activeName,
        totalDays,
        day: nextDay,
        streak: nextStreak,
        checked: [],
        activeReqs: effectiveReqs,
        history: nextHistory,
      }),
    }).catch(() => {});
  };

  const startChallenge = (name: string, days: number, challengeReqs?: string[]) => {
    let nextHistory = history;
    if (day > 0 && day < totalDays) {
      if (!confirm(`Switching to '${name}' will archive your current progress. Continue?`)) {
        return;
      }
      nextHistory = [...history, { name: `${activeName} · Day ${day}/${totalDays}`, status: "Paused" }];
      setHistory(nextHistory);
    }
    setActiveName(name);
    setTotalDays(days);
    const chosenReqs = challengeReqs && challengeReqs.length > 0
      ? challengeReqs
      : (defaultReqsMap[name] || defaultPresetReqs);
    setActiveReqs(chosenReqs);
    setDay(1);
    setChecked([]);
    toast.success(`Started ${name}! Day 1 begins now.`, {
      description: "Challenge progress saved to MongoDB database.",
    });

    const userId = getEffectiveUserId();
    fetch("/api/challenges/take", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        activeName: name,
        totalDays: days,
        day: 1,
        streak: 0,
        checked: [],
        activeReqs: chosenReqs,
        history: nextHistory,
      }),
    }).catch(() => {});
  };

  const resetChallenge = () => {
    if (confirm("Reset current challenge progress to Day 1?")) {
      setDay(1);
      setStreak(0);
      setChecked([]);
      toast.info("Challenge reset to Day 1.");

      const userId = getEffectiveUserId();
      fetch("/api/challenges/take", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          activeName,
          totalDays,
          day: 1,
          streak: 0,
          checked: [],
          activeReqs: effectiveReqs,
          history,
        }),
      }).catch(() => {});
    }
  };

  const toggleCheck = (r: string) => {
    const nextChecked = checked.includes(r) ? checked.filter((x) => x !== r) : [...checked, r];
    setChecked(nextChecked);

    const userId = getEffectiveUserId();
    fetch("/api/challenges/take", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        activeName,
        totalDays,
        day,
        streak,
        checked: nextChecked,
        activeReqs: effectiveReqs,
        history,
      }),
    }).catch(() => {});
  };

  const handleAddReq = (text?: string) => {
    const val = (text ?? newReqInput).trim();
    if (!val) return;
    if (customReqs.includes(val)) {
      toast.info("This requirement is already in your list.");
      return;
    }
    setCustomReqs([...customReqs, val]);
    if (!text) setNewReqInput("");
  };

  const handleRemoveReq = (index: number) => {
    setCustomReqs(customReqs.filter((_, i) => i !== index));
  };

  const handleSaveCustom = async (startImmediately: boolean = false) => {
    const trimmedName = customName.trim();
    if (!trimmedName) {
      toast.error("Please enter a challenge name.");
      return;
    }
    if (customDays < 1 || isNaN(customDays)) {
      toast.error("Duration must be at least 1 day.");
      return;
    }
    if (customReqs.length === 0) {
      toast.error("Please add at least one daily requirement.");
      return;
    }

    const newChallenge: CustomChallenge = {
      id: "cust_" + Date.now(),
      name: trimmedName,
      days: Number(customDays),
      level: customLevel,
      reqs: customReqs,
      createdAt: new Date().toISOString(),
    };

    // 1. Immediately update local state
    setCustomList([newChallenge, ...customList]);
    setIsCreateOpen(false);

    // Reset Form
    setCustomName("");
    setCustomDays(30);
    setCustomLevel("Medium");
    setCustomReqs(["Drink 2.5L Water", "30-Min Workout", "Read 10 Pages"]);
    setNewReqInput("");

    // 2. Direct save to MongoDB database
    const userId = getEffectiveUserId();
    try {
      const res = await fetch("/api/challenges/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, challenge: newChallenge }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Custom challenge "${newChallenge.name}" saved to MongoDB database!`, {
          description: "Persisted in 'challenges' collection in MongoDB Atlas.",
        });
      } else {
        toast.success(`Custom challenge "${newChallenge.name}" saved!`);
      }
    } catch {
      toast.success(`Custom challenge "${newChallenge.name}" saved!`);
    }

    if (startImmediately) {
      startChallenge(newChallenge.name, newChallenge.days, newChallenge.reqs);
    } else {
      setActiveTab("custom");
    }
  };

  const handleDeleteCustom = async (id: string, name: string) => {
    if (confirm(`Delete custom challenge "${name}"?`)) {
      setCustomList(customList.filter((c) => c.id !== id));
      const userId = getEffectiveUserId();
      try {
        await fetch("/api/challenges/custom/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, id }),
        });
      } catch {}
      toast.info(`Deleted "${name}" from database.`);
    }
  };

  return (
    <>
      <PageHeader
        title="Take Challenge"
        description="Build discipline with daily habits, streak tracking, and customizable goals."
        actions={
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
              <span className="size-1.5 rounded-full bg-success" />
              <Database className="size-3.5" /> MongoDB Active
            </span>
            {day > 0 && (
              <button
                onClick={resetChallenge}
                className="flex items-center gap-1.5 rounded-[10px] border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-elevated hover:text-foreground transition-colors"
              >
                <RotateCcw className="size-3.5" /> Reset progress
              </button>
            )}
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-1.5 rounded-[10px] bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover transition-colors"
            >
              <Plus className="size-4" /> Create Custom Challenge
            </button>
          </div>
        }
      />

      {/* Active Challenge Hero Panel */}
      <Panel className="relative mb-4 overflow-hidden border-primary/20">
        <div className="bg-gradient-challenge absolute inset-0 opacity-10" aria-hidden />
        <div className="relative grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <div className="flex items-center gap-2">
              <Tag tone="primary">Active challenge</Tag>
              {customList.some((c) => c.name === activeName) && (
                <span className="rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-accent-foreground border border-primary/20">
                  Custom
                </span>
              )}
            </div>

            <h2 className="mt-3 text-2xl font-semibold tracking-tight">{activeName}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {day > 0 ? `Target: ${totalDays} consecutive days` : "Challenge ready to begin"}
            </p>

            <div className="mt-5 flex items-end gap-6">
              <div>
                <p className="font-display text-4xl font-bold tabular-nums">
                  {day}
                  <span className="text-lg text-muted-foreground font-normal">/{totalDays}</span>
                </p>
                <p className="text-[13px] text-muted-foreground">Current day</p>
              </div>
              <div>
                <p className="font-display flex items-center gap-1.5 text-4xl font-bold text-warning">
                  <Flame className="size-7" />
                  {streak}
                </p>
                <p className="text-[13px] text-muted-foreground">Day streak</p>
              </div>
            </div>

            <div className="mt-5">
              <ProgressBar value={totalDays > 0 ? (day / totalDays) * 100 : 0} label="Challenge progress" />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {currentMilestones.map((m) => (
                <span
                  key={m}
                  className={cn(
                    "flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition-colors",
                    day >= m ? "border-warning/50 bg-warning/15 text-warning font-medium" : "text-muted-foreground",
                  )}
                >
                  {day >= m ? <Award className="size-3.5" /> : <Lock className="size-3.5" />} Day {m}
                </span>
              ))}
            </div>
          </div>

          {/* Today's Requirements Checklist */}
          <div className="rounded-xl border bg-card p-4 shadow-sm flex flex-col justify-between">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm">Today's requirements</h3>
                  <span className="text-[11px] text-muted-foreground">
                    {checked.length}/{effectiveReqs.length} done
                  </span>
                </div>

                {effectiveReqs.length > 1 && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOrderMenuOpen(!orderMenuOpen)}
                      className="flex items-center gap-1 rounded-md border border-border/80 bg-elevated/70 px-2 py-1 text-xs font-medium text-foreground hover:bg-elevated transition-colors"
                      title="Shuffle & reorder challenge tasks"
                    >
                      <Shuffle className="size-3 text-primary" />
                      <span>Shuffle / Order</span>
                    </button>

                    {orderMenuOpen && (
                      <div className="absolute right-0 top-full mt-1 z-30 w-48 rounded-xl border bg-popover p-1.5 shadow-xl text-xs space-y-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            handleShuffleActiveReqs();
                            setOrderMenuOpen(false);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left hover:bg-elevated text-foreground transition-colors"
                        >
                          <Shuffle className="size-3.5 text-primary" />
                          <span>Shuffle randomly</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleSortActiveReqsPendingFirst();
                            setOrderMenuOpen(false);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left hover:bg-elevated text-foreground transition-colors"
                        >
                          <CheckCircle2 className="size-3.5 text-warning" />
                          <span>Pending tasks first</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleReverseActiveReqs();
                            setOrderMenuOpen(false);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left hover:bg-elevated text-foreground transition-colors"
                        >
                          <ArrowUpDown className="size-3.5 text-muted-foreground" />
                          <span>Reverse order</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                {effectiveReqs.map((r, idx) => {
                  const on = checked.includes(r);
                  return (
                    <div
                      key={r}
                      draggable
                      onDragStart={() => setDraggedReqIdx(idx)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (draggedReqIdx !== null && draggedReqIdx !== idx) {
                          moveActiveReq(draggedReqIdx, idx);
                        }
                        setDraggedReqIdx(null);
                      }}
                      onDragEnd={() => setDraggedReqIdx(null)}
                      className={cn(
                        "group flex min-h-10 w-full items-center justify-between rounded-lg px-2 py-1.5 transition-colors",
                        on ? "bg-elevated/40" : "hover:bg-elevated",
                        draggedReqIdx === idx && "opacity-40 border border-dashed border-primary",
                      )}
                    >
                      {/* Drag handle */}
                      <div
                        className="mr-1.5 cursor-grab text-muted-foreground/40 hover:text-foreground opacity-60 group-hover:opacity-100 transition-opacity"
                        title="Drag to reorder"
                      >
                        <GripVertical className="size-3.5" />
                      </div>

                      {/* Checkbox and task text */}
                      <button
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggleCheck(r)}
                        className="flex flex-1 items-center gap-2.5 text-left text-sm min-w-0"
                      >
                        <CheckCircle2
                          className={cn(
                            "size-4.5 shrink-0 transition-colors",
                            on ? "text-success" : "text-muted-foreground/40",
                          )}
                        />
                        <span className={cn("truncate", on && "text-muted-foreground line-through")}>{r}</span>
                      </button>

                      {/* Move up / down controls */}
                      <div className="flex items-center gap-0.5 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveActiveReq(idx, idx - 1)}
                          title="Move up"
                          className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
                        >
                          <ChevronUp className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === effectiveReqs.length - 1}
                          onClick={() => moveActiveReq(idx, idx + 1)}
                          title="Move down"
                          className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
                        >
                          <ChevronDown className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-3">
              <button
                disabled={!allDone}
                onClick={completeDay}
                className="bg-gradient-challenge mt-2 h-11 w-full rounded-[10px] font-semibold text-primary-foreground transition-opacity hover:opacity-95 disabled:opacity-40"
              >
                {allDone ? "Complete day" : `${checked.length}/${effectiveReqs.length} done`}
              </button>
              <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                <RotateCcw className="size-3" /> Check all items daily to advance and build your streak.
              </p>
            </div>
          </div>
        </div>
      </Panel>

      {/* Available & Custom Challenges Section */}
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Panel>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SectionHeader title="Challenge Catalog" icon={Trophy} />

            {/* Catalog Tabs */}
            <div className="flex rounded-lg bg-elevated p-1 text-xs">
              <button
                onClick={() => setActiveTab("preset")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-all",
                  activeTab === "preset"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Layers className="size-3.5" /> Presets ({availablePresets.length})
              </button>
              <button
                onClick={() => setActiveTab("custom")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-all",
                  activeTab === "custom"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Target className="size-3.5" /> Custom ({customList.length})
              </button>
            </div>
          </div>

          {activeTab === "preset" ? (
            /* Presets Grid */
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
              {availablePresets.map((c) => {
                const isCurrent = activeName === c.name;
                return (
                  <div
                    key={c.name}
                    className={cn(
                      "flex flex-col justify-between rounded-xl border bg-elevated/60 p-4 transition-all hover:border-border",
                      isCurrent && "border-primary/50 bg-primary/5",
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] font-medium border",
                            c.level === "Hard"
                              ? "border-danger/30 bg-danger/10 text-danger"
                              : c.level === "Medium"
                                ? "border-warning/30 bg-warning/10 text-warning"
                                : "border-success/30 bg-success/10 text-success",
                          )}
                        >
                          {c.level}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">{c.days} days</span>
                      </div>
                      <p className="mt-2.5 font-semibold text-sm leading-snug">{c.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{c.reqs.length} daily requirements</p>
                    </div>

                    <button
                      onClick={() => startChallenge(c.name, c.days, c.reqs)}
                      disabled={isCurrent}
                      className={cn(
                        "mt-4 h-9 w-full rounded-[10px] border font-medium text-xs transition-colors",
                        isCurrent
                          ? "border-primary bg-accent text-accent-foreground opacity-90"
                          : "bg-card hover:bg-elevated",
                      )}
                    >
                      {isCurrent ? "Active" : "Start challenge"}
                    </button>
                  </div>
                );
              })}

              {/* Dashed Create Card */}
              <button
                onClick={() => setIsCreateOpen(true)}
                className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-elevated/30 p-4 text-center transition-all hover:border-primary hover:bg-primary/5 min-h-[140px]"
              >
                <div className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary">
                  <Plus className="size-4" />
                </div>
                <p className="mt-2 text-xs font-semibold">Create Custom</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Design your own rules</p>
              </button>
            </div>
          ) : (
            /* Custom Challenges Grid */
            <div>
              {customList.length === 0 ? (
                <div className="rounded-xl border border-dashed p-8 text-center">
                  <div className="mx-auto grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
                    <Target className="size-6" />
                  </div>
                  <h4 className="mt-3 text-sm font-semibold">No custom challenges created yet</h4>
                  <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                    Design a challenge tailored to your lifestyle with custom duration and specific daily rules.
                  </p>
                  <button
                    onClick={() => setIsCreateOpen(true)}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-[10px] bg-primary px-3.5 py-2 text-xs font-medium text-primary-foreground hover:bg-primary-hover shadow-sm"
                  >
                    <Plus className="size-3.5" /> Create your first challenge
                  </button>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {customList.map((c) => {
                    const isCurrent = activeName === c.name;
                    return (
                      <div
                        key={c.id}
                        className={cn(
                          "relative flex flex-col justify-between rounded-xl border bg-card p-4 shadow-sm transition-all hover:border-border",
                          isCurrent && "border-primary/50 bg-primary/5",
                        )}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[11px] font-medium border",
                                c.level === "Hard"
                                  ? "border-danger/30 bg-danger/10 text-danger"
                                  : c.level === "Medium"
                                    ? "border-warning/30 bg-warning/10 text-warning"
                                    : "border-success/30 bg-success/10 text-success",
                              )}
                            >
                              {c.level}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="flex items-center gap-1 rounded-full bg-success/10 border border-success/20 px-2 py-0.5 text-[10px] font-medium text-success">
                                <Database className="size-2.5" /> Database
                              </span>
                              <span className="text-xs text-muted-foreground font-mono">{c.days} days</span>
                              <button
                                onClick={() => handleDeleteCustom(c.id, c.name)}
                                title="Delete custom challenge"
                                className="grid size-6 place-items-center rounded text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          </div>

                          <p className="mt-2.5 font-semibold text-sm leading-snug">{c.name}</p>

                          <div className="mt-2.5 space-y-1">
                            {c.reqs.slice(0, 3).map((r, i) => (
                              <p key={i} className="truncate text-xs text-muted-foreground flex items-center gap-1.5">
                                <span className="size-1 rounded-full bg-primary" /> {r}
                              </p>
                            ))}
                            {c.reqs.length > 3 && (
                              <p className="text-[11px] text-muted-foreground font-medium">
                                +{c.reqs.length - 3} more requirements
                              </p>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => startChallenge(c.name, c.days, c.reqs)}
                          disabled={isCurrent}
                          className={cn(
                            "mt-4 h-9 w-full rounded-[10px] border font-medium text-xs transition-colors",
                            isCurrent
                              ? "border-primary bg-accent text-accent-foreground opacity-90"
                              : "bg-elevated hover:bg-elevated/80",
                          )}
                        >
                          {isCurrent ? "Active" : "Start challenge"}
                        </button>
                      </div>
                    );
                  })}

                  {/* Quick Add Custom Card */}
                  <button
                    onClick={() => setIsCreateOpen(true)}
                    className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-elevated/30 p-4 text-center transition-all hover:border-primary hover:bg-primary/5 min-h-[140px]"
                  >
                    <div className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary">
                      <Plus className="size-4" />
                    </div>
                    <p className="mt-2 text-xs font-semibold">Create Another</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">Add custom rules</p>
                  </button>
                </div>
              )}
            </div>
          )}
        </Panel>

        {/* History Panel */}
        <Panel>
          <SectionHeader title="History" icon={History} />
          {history.length === 0 ? (
            <EmptyState text="No past challenges completed yet. Complete your first challenge to see it recorded here." />
          ) : (
            <div className="space-y-1">
              {history.map((h, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b last:border-b-0 text-sm">
                  <span className="truncate pr-2">{h.name}</span>
                  <Tag tone={h.status === "Completed" ? "success" : "muted"}>{h.status}</Tag>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* Create Custom Challenge Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" /> Create Custom Challenge
            </DialogTitle>
            <DialogDescription>
              Set your target duration, difficulty, and the daily requirements you must complete every day.
            </DialogDescription>
            <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-success/30 bg-success/10 px-2.5 py-1 text-xs text-success font-medium">
              <Database className="size-3.5 shrink-0" />
              <span>Automatically saved and synced directly to MongoDB Atlas ('challenges' collection).</span>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* 1. Challenge Name */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Challenge Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g., 30-Day Deep Focus, Spartan Routine"
                className="h-10 w-full rounded-[10px] border bg-background px-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {/* 2. Duration Days */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Target Duration (Days) <span className="text-danger">*</span>
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {[7, 14, 21, 30, 60, 75, 100].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setCustomDays(d)}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-xs font-medium border transition-colors",
                      customDays === d
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-elevated hover:bg-accent",
                    )}
                  >
                    {d} days
                  </button>
                ))}
              </div>
              <input
                type="number"
                min={1}
                max={365}
                value={customDays}
                onChange={(e) => setCustomDays(Math.max(1, parseInt(e.target.value) || 1))}
                className="h-10 w-full rounded-[10px] border bg-background px-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {/* 3. Difficulty Level */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Difficulty Level</label>
              <div className="grid grid-cols-3 gap-2">
                {(["Easy", "Medium", "Hard"] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setCustomLevel(lvl)}
                    className={cn(
                      "flex h-9 items-center justify-center rounded-lg border text-xs font-medium transition-all",
                      customLevel === lvl
                        ? lvl === "Easy"
                          ? "border-success bg-success/15 text-success font-semibold"
                          : lvl === "Medium"
                            ? "border-warning bg-warning/15 text-warning font-semibold"
                            : "border-danger bg-danger/15 text-danger font-semibold"
                        : "border-border bg-elevated text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Daily Requirements Builder */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Daily Requirements ({customReqs.length}) <span className="text-danger">*</span>
                  </label>
                  {customReqs.length > 1 && (
                    <button
                      type="button"
                      onClick={handleShuffleCustomReqs}
                      title="Shuffle requirement order"
                      className="flex items-center gap-1 rounded-md border border-border/70 bg-elevated/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-elevated transition-colors"
                    >
                      <Shuffle className="size-3 text-primary" /> Shuffle
                    </button>
                  )}
                </div>
                <span className="text-[11px] text-muted-foreground">Drag or move to reorder</span>
              </div>

              {/* Requirement Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newReqInput}
                  onChange={(e) => setNewReqInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddReq();
                    }
                  }}
                  placeholder="e.g. Read 15 pages, 20-min run..."
                  className="h-10 flex-1 rounded-[10px] border bg-background px-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                />
                <button
                  type="button"
                  onClick={() => handleAddReq()}
                  className="flex h-10 items-center justify-center gap-1 rounded-[10px] bg-elevated px-3 text-xs font-medium border hover:bg-card hover:text-primary transition-colors"
                >
                  <Plus className="size-3.5" /> Add
                </button>
              </div>

              {/* Suggestions chips */}
              <div className="mt-2.5">
                <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Quick Suggestions:</p>
                <div className="flex flex-wrap gap-1">
                  {SUGGESTIONS.filter((s) => !customReqs.includes(s)).slice(0, 6).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleAddReq(s)}
                      className="rounded-full border border-border/80 bg-elevated/40 px-2.5 py-0.5 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
                    >
                      + {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Current Requirements List */}
              <div className="mt-3 max-h-48 space-y-1.5 overflow-y-auto rounded-xl border bg-elevated/40 p-2">
                {customReqs.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    No requirements added yet. Type a rule or select a suggestion above.
                  </p>
                ) : (
                  customReqs.map((req, idx) => (
                    <div
                      key={idx}
                      draggable
                      onDragStart={(e) => {
                        setDraggedCustomReqIdx(idx);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggedCustomReqIdx !== null && draggedCustomReqIdx !== idx) {
                          moveCustomReq(draggedCustomReqIdx, idx);
                          setDraggedCustomReqIdx(null);
                        }
                      }}
                      onDragEnd={() => setDraggedCustomReqIdx(null)}
                      className={cn(
                        "group flex items-center justify-between rounded-lg bg-card px-2.5 py-1.5 text-xs border shadow-2xs transition-all",
                        draggedCustomReqIdx === idx ? "opacity-40 border-primary" : "hover:border-border/80",
                      )}
                    >
                      <span className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                        <span title="Drag to reorder" className="shrink-0 flex items-center">
                          <GripVertical className="size-3 text-muted-foreground/50 hover:text-foreground cursor-grab active:cursor-grabbing" />
                        </span>
                        <CheckCircle2 className="size-3.5 text-primary shrink-0" />
                        <span className="font-medium truncate">{req}</span>
                      </span>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveCustomReq(idx, idx - 1)}
                          title="Move up"
                          className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-25 disabled:pointer-events-none transition-colors"
                        >
                          <ChevronUp className="size-3" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === customReqs.length - 1}
                          onClick={() => moveCustomReq(idx, idx + 1)}
                          title="Move down"
                          className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-25 disabled:pointer-events-none transition-colors"
                        >
                          <ChevronDown className="size-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveReq(idx)}
                          className="text-muted-foreground hover:text-danger p-0.5 rounded transition-colors ml-1"
                          title="Remove requirement"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="h-10 rounded-[10px] border px-4 text-xs font-medium text-muted-foreground hover:bg-elevated transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSaveCustom(false)}
              className="h-10 rounded-[10px] border border-primary/30 bg-primary/10 px-4 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
            >
              Save to Catalog
            </button>
            <button
              type="button"
              onClick={() => handleSaveCustom(true)}
              className="flex h-10 items-center justify-center gap-1.5 rounded-[10px] bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover transition-colors"
            >
              Save & Start Now <ChevronRight className="size-4" />
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
