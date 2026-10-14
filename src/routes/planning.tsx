import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Mountain, CalendarRange, Sun, Grid2x2, Flag, NotebookPen, Plus, Trash2, Check } from "lucide-react";
import { PageHeader, Panel, SectionHeader, ProgressBar, Tag, EmptyState } from "@/components/common/ui";
import { useLocal } from "@/lib/use-local";
import { pageHead } from "@/lib/meta";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/planning")({
  head: pageHead("Planning", "Monthly objectives, weekly outcomes, daily plans and a priority matrix."),
  component: Planning,
});

export type Goal = { id: string; text: string; done: boolean; time?: string | undefined };
type Objective = { id: string; name: string; pct: number };
type TimeBlock = { id: string; time: string; text: string };
type Milestone = { id: string; date: string; title: string };

const matrixCategories = [
  { key: "ui", label: "Urgent & important", tone: "danger" as const },
  { key: "iu", label: "Important, not urgent", tone: "primary" as const },
  { key: "un", label: "Urgent, not important", tone: "warning" as const },
  { key: "nn", label: "Neither", tone: "muted" as const },
];

function Planning() {
  const [objectives, setObjectives] = useLocal<Objective[]>("planning-objectives", []);
  const [outcomes, setOutcomes] = useLocal<string[]>("planning-outcomes", []);
  const [goals, setGoals] = useLocal<Goal[]>("goals", []);
  const [legacyTodayPlan, setLegacyTodayPlan] = useLocal<TimeBlock[]>("planning-today-plan", []);
  const [matrix, setMatrix] = useLocal<Record<string, string[]>>("planning-matrix", {
    ui: [],
    iu: [],
    un: [],
    nn: [],
  });
  const [milestones, setMilestones] = useLocal<Milestone[]>("planning-milestones", []);
  const [reflection, setReflection] = useLocal("planning-reflection", "");

  // Form states
  const [newObjName, setNewObjName] = useState("");
  const [newObjPct, setNewObjPct] = useState(0);
  const [showObjForm, setShowObjForm] = useState(false);

  const [newOutcome, setNewOutcome] = useState("");
  const [newPlanTime, setNewPlanTime] = useState("");
  const [newPlanText, setNewPlanText] = useState("");

  const [matrixInput, setMatrixInput] = useState("");
  const [matrixTarget, setMatrixTarget] = useState("ui");

  const [newMilestoneDate, setNewMilestoneDate] = useState("");
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");

  // Seamlessly migrate any legacy planning-today-plan items into shared goals
  useEffect(() => {
    if (legacyTodayPlan.length > 0) {
      const toMigrate: Goal[] = legacyTodayPlan
        .filter((tp) => !goals.some((g) => g.text === tp.text))
        .map((tp) => ({
          id: tp.id || crypto.randomUUID(),
          text: tp.text,
          done: false,
          time: tp.time !== "Anytime" ? tp.time : undefined,
        }));
      if (toMigrate.length > 0) {
        setGoals([...goals, ...toMigrate]);
      }
      setLegacyTodayPlan([]);
    }
  }, [legacyTodayPlan, goals, setGoals, setLegacyTodayPlan]);

  const addObjective = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newObjName.trim()) return;
    setObjectives([
      ...objectives,
      {
        id: crypto.randomUUID(),
        name: newObjName.trim(),
        pct: Math.min(100, Math.max(0, newObjPct)),
      },
    ]);
    setNewObjName("");
    setNewObjPct(0);
    setShowObjForm(false);
  };

  const addOutcome = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOutcome.trim()) return;
    setOutcomes([...outcomes, newOutcome.trim()]);
    setNewOutcome("");
  };

  const addPlanGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanText.trim()) return;
    setGoals([
      ...goals,
      {
        id: crypto.randomUUID(),
        text: newPlanText.trim(),
        done: false,
        time: newPlanTime.trim() || undefined,
      },
    ]);
    setNewPlanText("");
    setNewPlanTime("");
  };

  const removeGoal = (id: string) => {
    setGoals(goals.filter((g) => g.id !== id));
  };

  const addMatrixItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matrixInput.trim()) return;
    const current = matrix[matrixTarget] || [];
    setMatrix({
      ...matrix,
      [matrixTarget]: [...current, matrixInput.trim()],
    });
    setMatrixInput("");
  };

  const removeMatrixItem = (catKey: string, idx: number) => {
    const current = matrix[catKey] || [];
    setMatrix({
      ...matrix,
      [catKey]: current.filter((_, i) => i !== idx),
    });
  };

  const addMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestoneTitle.trim()) return;
    setMilestones([
      ...milestones,
      {
        id: crypto.randomUUID(),
        date: newMilestoneDate.trim() || "Soon",
        title: newMilestoneTitle.trim(),
      },
    ]);
    setNewMilestoneTitle("");
    setNewMilestoneDate("");
  };

  return (
    <>
      <PageHeader title="Planning" description="From long-term goals to today's next step." />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Monthly objectives */}
        <Panel>
          <SectionHeader
            title="Monthly objectives"
            icon={Mountain}
            action={
              <button
                onClick={() => setShowObjForm(!showObjForm)}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Plus className="size-3.5" /> Add
              </button>
            }
          />

          {showObjForm && (
            <form onSubmit={addObjective} className="mb-4 space-y-2 rounded-lg border bg-elevated/40 p-2.5 text-xs">
              <input
                value={newObjName}
                onChange={(e) => setNewObjName(e.target.value)}
                placeholder="Objective title"
                className="h-8 w-full rounded border bg-background px-2"
                required
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={newObjPct}
                  onChange={(e) => setNewObjPct(Number(e.target.value))}
                  placeholder="Progress %"
                  className="h-8 w-24 rounded border bg-background px-2"
                />
                <button type="submit" className="flex-1 rounded bg-primary py-1 font-medium text-primary-foreground">
                  Save
                </button>
              </div>
            </form>
          )}

          {objectives.length === 0 ? (
            <EmptyState text="No monthly objectives set yet." />
          ) : (
            <div className="space-y-4">
              {objectives.map((o) => (
                <div key={o.id} className="group relative">
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span>{o.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{o.pct}%</span>
                      <button
                        onClick={() => setObjectives(objectives.filter((x) => x.id !== o.id))}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-danger"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  </div>
                  <ProgressBar value={o.pct} label={o.name} />
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Weekly outcomes */}
        <Panel>
          <SectionHeader title="This week's outcomes" icon={CalendarRange} action={<Tag tone="primary">Weekly</Tag>} />
          <form onSubmit={addOutcome} className="mb-3 flex gap-2">
            <input
              value={newOutcome}
              onChange={(e) => setNewOutcome(e.target.value)}
              placeholder="Add key outcome..."
              className="h-9 flex-1 rounded-md border bg-background px-2.5 text-xs outline-none"
            />
            <button type="submit" className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground">
              <Plus className="size-4" />
            </button>
          </form>

          {outcomes.length === 0 ? (
            <EmptyState text="No outcomes planned for this week yet." />
          ) : (
            <ul className="space-y-2 text-sm">
              {outcomes.map((item, idx) => (
                <li key={idx} className="group flex items-center justify-between gap-2 border-b pb-1.5 last:border-b-0">
                  <span className="flex-1">• {item}</span>
                  <button
                    onClick={() => setOutcomes(outcomes.filter((_, i) => i !== idx))}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-danger"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Today's daily goals (Synced with Dashboard) */}
        <Panel>
          <SectionHeader
            title="Today's daily goals"
            icon={Sun}
            action={
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium">
                  {goals.filter((g) => g.done).length}/{goals.length} done
                </span>
                <Tag tone="success">Daily</Tag>
              </div>
            }
          />
          <form onSubmit={addPlanGoal} className="mb-3 flex gap-2">
            <input
              value={newPlanTime}
              onChange={(e) => setNewPlanTime(e.target.value)}
              placeholder="09:00"
              className="h-9 w-20 rounded-md border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <input
              value={newPlanText}
              onChange={(e) => setNewPlanText(e.target.value)}
              placeholder="Add daily goal or plan..."
              className="h-9 flex-1 rounded-md border bg-background px-2.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            />
            <button
              type="submit"
              className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground hover:bg-primary-hover transition-colors"
              aria-label="Add daily goal"
            >
              <Plus className="size-4" />
            </button>
          </form>

          {goals.length === 0 ? (
            <EmptyState text="No daily goals set for today. Add one above or from the dashboard." />
          ) : (
            <ul className="space-y-1.5">
              {goals.map((g) => (
                <li
                  key={g.id}
                  className="group flex min-h-9 items-center justify-between rounded-lg px-2 hover:bg-elevated transition-colors"
                >
                  <label className="flex flex-1 cursor-pointer items-center gap-2.5 py-1">
                    <input
                      type="checkbox"
                      checked={g.done}
                      onChange={() =>
                        setGoals(goals.map((x) => (x.id === g.id ? { ...x, done: !x.done } : x)))
                      }
                      className="peer sr-only"
                    />
                    <span
                      className={cn(
                        "grid size-4.5 shrink-0 place-items-center rounded border-2 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring",
                        g.done ? "border-success bg-success text-background" : "border-border",
                      )}
                    >
                      {g.done && <Check className="size-3" strokeWidth={3} />}
                    </span>
                    {g.time && (
                      <span className="rounded bg-elevated px-1.5 py-0.5 text-[11px] font-mono text-muted-foreground tabular-nums">
                        {g.time}
                      </span>
                    )}
                    <span className={cn("text-sm flex-1", g.done && "text-muted-foreground line-through")}>
                      {g.text}
                    </span>
                  </label>
                  <button
                    onClick={() => removeGoal(g.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-danger transition-opacity"
                    aria-label={`Delete ${g.text}`}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Priority matrix */}
        <Panel className="lg:col-span-2">
          <SectionHeader title="Priority matrix" icon={Grid2x2} />
          <form onSubmit={addMatrixItem} className="mb-4 flex flex-wrap gap-2 text-xs">
            <input
              value={matrixInput}
              onChange={(e) => setMatrixInput(e.target.value)}
              placeholder="Add item to quadrant..."
              className="h-9 min-w-48 flex-1 rounded-md border bg-background px-2.5"
            />
            <select
              value={matrixTarget}
              onChange={(e) => setMatrixTarget(e.target.value)}
              className="h-9 rounded-md border bg-background px-2"
            >
              {matrixCategories.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
            <button type="submit" className="flex h-9 items-center gap-1 rounded-md bg-primary px-3 text-primary-foreground">
              <Plus className="size-3.5" /> Add to matrix
            </button>
          </form>

          <div className="grid gap-3 sm:grid-cols-2">
            {matrixCategories.map((q) => {
              const items = matrix[q.key] || [];
              return (
                <div key={q.key} className="rounded-xl bg-elevated p-4">
                  <Tag tone={q.tone}>{q.label}</Tag>
                  {items.length === 0 ? (
                    <p className="mt-3 text-xs text-muted-foreground italic">No items</p>
                  ) : (
                    <ul className="mt-3 space-y-1.5 text-xs">
                      {items.map((i, idx) => (
                        <li key={idx} className="group flex items-center justify-between">
                          <span>• {i}</span>
                          <button
                            onClick={() => removeMatrixItem(q.key, idx)}
                            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-danger"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>

        <div className="space-y-4">
          {/* Milestones */}
          <Panel>
            <SectionHeader title="Milestones" icon={Flag} />
            <form onSubmit={addMilestone} className="mb-3 flex gap-2">
              <input
                value={newMilestoneDate}
                onChange={(e) => setNewMilestoneDate(e.target.value)}
                placeholder="Date"
                className="h-8 w-20 rounded border bg-background px-2 text-xs"
              />
              <input
                value={newMilestoneTitle}
                onChange={(e) => setNewMilestoneTitle(e.target.value)}
                placeholder="Milestone"
                className="h-8 flex-1 rounded border bg-background px-2 text-xs"
              />
              <button type="submit" className="h-8 rounded bg-primary px-2.5 text-xs text-primary-foreground">
                <Plus className="size-3.5" />
              </button>
            </form>

            {milestones.length === 0 ? (
              <EmptyState text="No upcoming milestones set." />
            ) : (
              <div className="space-y-1.5 text-sm">
                {milestones.map((m) => (
                  <div key={m.id} className="group flex items-center justify-between py-1 border-b last:border-b-0">
                    <span>{m.title}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{m.date}</span>
                      <button
                        onClick={() => setMilestones(milestones.filter((x) => x.id !== m.id))}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-danger"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* Weekly reflection */}
          <Panel>
            <SectionHeader title="Weekly reflection" icon={NotebookPen} />
            <textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              rows={4}
              placeholder="What went well? What will you change next week? Reflect on your progress..."
              className="w-full rounded-lg border bg-background p-2.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </Panel>
        </div>
      </div>
    </>
  );
}
