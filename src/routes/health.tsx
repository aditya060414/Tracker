import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Moon, Droplets, Footprints, ListChecks, NotebookPen, Minus, Plus, Info } from "lucide-react";
import { PageHeader, Panel, SectionHeader, StatCard, ProgressBar } from "@/components/common/ui";
import { useLocal } from "@/lib/use-local";
import { pageHead } from "@/lib/meta";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/health")({
  head: pageHead("Health", "Track sleep, water, activity and daily wellness habits."),
  component: Health,
});

const defaultSleep = [
  { d: "Mon", h: 0 },
  { d: "Tue", h: 0 },
  { d: "Wed", h: 0 },
  { d: "Thu", h: 0 },
  { d: "Fri", h: 0 },
  { d: "Sat", h: 0 },
  { d: "Sun", h: 0 },
];
const habitList = ["Meditate 10 min", "Stretch", "No screens after 22:00", "Take vitamins", "Walk outside"];

function Health() {
  const [water, setWater] = useLocal("water", 0);
  const [habits, setHabits] = useLocal<string[]>("habits", []);
  const [note, setNote] = useLocal("wellness-note", "");
  const [steps, setSteps] = useLocal("health-steps", 0);
  const [sleep, setSleep] = useLocal("health-sleep", defaultSleep);
  const [logSleepDay, setLogSleepDay] = useState("Mon");
  const [logSleepHours, setLogSleepHours] = useState("");

  const activeSleepDays = sleep.filter((s) => s.h > 0);
  const avgSleep = activeSleepDays.length ? (activeSleepDays.reduce((a, b) => a + b.h, 0) / activeSleepDays.length).toFixed(1) : null;
  const lastRecordedSleep = activeSleepDays.length ? activeSleepDays[activeSleepDays.length - 1]?.h : 0;

  const handleSaveSleep = (e: React.FormEvent) => {
    e.preventDefault();
    const h = parseFloat(logSleepHours);
    if (isNaN(h) || h < 0 || h > 24) return;
    setSleep(sleep.map((s) => (s.d === logSleepDay ? { ...s, h } : s)));
    setLogSleepHours("");
  };

  return (
    <>
      <PageHeader title="Health" description="Your own wellness log — simple, private, consistent." />
      <p className="mb-4 flex items-center gap-2 rounded-lg bg-elevated px-3 py-2 text-[13px] text-muted-foreground">
        <Info className="size-4 shrink-0" /> Lifeboard tracks information you enter. It does not provide medical advice or diagnoses.
      </p>

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          icon={Moon}
          label="Sleep logged"
          value={lastRecordedSleep ? `${lastRecordedSleep}h` : "0h"}
          hint={avgSleep ? `Avg ${avgSleep}h` : "No sleep logged"}
        />
        <StatCard
          icon={Footprints}
          label="Steps today"
          value={steps.toLocaleString()}
          hint={steps >= 10000 ? "Goal met! 🎉" : "Goal: 10,000"}
          tone={steps >= 10000 ? "success" : "primary"}
        />
        <div className="col-span-2 lg:col-span-1">
          <StatCard icon={Droplets} label="Water (glasses)" value={`${water} / 8`} tone="primary" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <SectionHeader title="Water intake" icon={Droplets} />
          <div className="flex items-center gap-4">
            <button aria-label="Remove a glass" onClick={() => setWater(Math.max(0, water - 1))} className="grid size-11 place-items-center rounded-[10px] border hover:bg-elevated">
              <Minus className="size-4" />
            </button>
            <div className="flex-1">
              <ProgressBar value={(water / 8) * 100} label="Water intake" />
            </div>
            <button aria-label="Add a glass" onClick={() => setWater(water + 1)} className="grid size-11 place-items-center rounded-[10px] bg-primary text-primary-foreground hover:bg-primary-hover">
              <Plus className="size-4" />
            </button>
          </div>
        </Panel>

        <Panel>
          <SectionHeader
            title="Steps tracker"
            icon={Footprints}
            action={
              <button onClick={() => setSteps(0)} className="text-xs text-muted-foreground hover:underline">
                Reset
              </button>
            }
          />
          <div className="flex items-center gap-2">
            <button onClick={() => setSteps(Math.max(0, steps - 500))} className="h-10 rounded-lg border px-3 text-xs font-medium hover:bg-elevated">
              -500
            </button>
            <div className="flex-1">
              <ProgressBar value={(steps / 10000) * 100} label="Steps progress" tone={steps >= 10000 ? "success" : "primary"} />
            </div>
            <button onClick={() => setSteps(steps + 1000)} className="h-10 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary-hover">
              +1,000
            </button>
          </div>
        </Panel>

        <Panel>
          <SectionHeader title="Habit checklist" icon={ListChecks} />
          <div className="flex flex-wrap gap-2">
            {habitList.map((h) => {
              const on = habits.includes(h);
              return (
                <button
                  key={h}
                  aria-pressed={on}
                  onClick={() => setHabits(on ? habits.filter((x) => x !== h) : [...habits, h])}
                  className={cn("min-h-10 rounded-full border px-4 text-[13px] transition-colors", on ? "border-success bg-success/15 text-success" : "hover:bg-elevated")}
                >
                  {on ? "✓ " : ""}{h}
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel>
          <SectionHeader title="Sleep this week (hours)" icon={Moon} />
          <form onSubmit={handleSaveSleep} className="mb-3 flex items-center gap-2 text-xs">
            <select value={logSleepDay} onChange={(e) => setLogSleepDay(e.target.value)} className="h-9 rounded-md border bg-background px-2">
              {sleep.map((s) => (
                <option key={s.d} value={s.d}>{s.d}</option>
              ))}
            </select>
            <input
              type="number"
              step="0.5"
              min="0"
              max="24"
              value={logSleepHours}
              onChange={(e) => setLogSleepHours(e.target.value)}
              placeholder="Hours (e.g. 7.5)"
              className="h-9 w-32 rounded-md border bg-background px-2"
            />
            <button type="submit" className="h-9 rounded-md bg-secondary px-3 font-medium hover:bg-elevated">
              Log
            </button>
          </form>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sleep}>
                <XAxis dataKey="d" stroke="var(--muted-foreground)" fontSize={12} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 12]} stroke="var(--muted-foreground)" fontSize={12} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 10 }} />
                <Line dataKey="h" name="Hours" stroke="var(--chart-1)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel className="lg:col-span-2">
          <SectionHeader title="Wellness notes" icon={NotebookPen} />
          <label htmlFor="note" className="sr-only">Wellness note</label>
          <textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={5}
            placeholder="How are you feeling today? Any reflections on nutrition, energy, or mood..."
            className="w-full rounded-[10px] border bg-background p-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </Panel>
      </div>
    </>
  );
}
