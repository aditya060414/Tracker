import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Dumbbell, CalendarDays, Medal, History, Check, Plus, Trash2 } from "lucide-react";
import { PageHeader, Panel, SectionHeader, StatCard, Tag, Row, EmptyState } from "@/components/common/ui";
import { useLocal } from "@/lib/use-local";
import { pageHead } from "@/lib/meta";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/gym")({
  head: pageHead("Gym", "Workout of the day, weekly training calendar, personal records and history."),
  component: Gym,
});

type Exercise = { id: string; name: string; sets: number; reps: number; kg: number; rest: string };
type PR = { id: string; exercise: string; weight: string };

const days = ["M", "T", "W", "T", "F", "S", "S"];

function Gym() {
  const [exercises, setExercises] = useLocal<Exercise[]>("gym-exercises", []);
  const [doneSets, setDoneSets] = useLocal<string[]>("gym-done", []);
  const [trained, setTrained] = useLocal<boolean[]>("gym-trained-days", [false, false, false, false, false, false, false]);
  const [prs, setPrs] = useLocal<PR[]>("gym-prs", []);

  // Exercise form
  const [showExForm, setShowExForm] = useState(false);
  const [exName, setExName] = useState("");
  const [exSets, setExSets] = useState(3);
  const [exReps, setExReps] = useState(10);
  const [exKg, setExKg] = useState(20);
  const [exRest, setExRest] = useState("1:30");

  // PR form
  const [showPrForm, setShowPrForm] = useState(false);
  const [prName, setPrName] = useState("");
  const [prWeight, setPrWeight] = useState("");

  const addExercise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!exName.trim()) return;
    setExercises([
      ...exercises,
      {
        id: crypto.randomUUID(),
        name: exName.trim(),
        sets: exSets,
        reps: exReps,
        kg: exKg,
        rest: exRest.trim() || "1:30",
      },
    ]);
    setExName("");
    setShowExForm(false);
  };

  const addPr = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prName.trim() || !prWeight.trim()) return;
    setPrs([
      ...prs,
      {
        id: crypto.randomUUID(),
        exercise: prName.trim(),
        weight: prWeight.trim(),
      },
    ]);
    setPrName("");
    setPrWeight("");
    setShowPrForm(false);
  };

  const toggleDayTrained = (index: number) => {
    const next = [...trained];
    next[index] = !next[index];
    setTrained(next);
  };

  const trainedCount = trained.filter(Boolean).length;
  const completedCount = exercises.filter((e) => doneSets.includes(e.id)).length;

  return (
    <>
      <PageHeader
        title="Gym"
        description="Train consistently. Track what matters."
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => setShowExForm(!showExForm)}
              className="flex items-center gap-1.5 rounded-[10px] bg-primary px-3.5 py-2 text-xs font-medium text-primary-foreground hover:bg-primary-hover"
            >
              <Plus className="size-4" /> Add exercise
            </button>
            <button
              onClick={() => setShowPrForm(!showPrForm)}
              className="flex items-center gap-1.5 rounded-[10px] border px-3.5 py-2 text-xs font-medium hover:bg-elevated"
            >
              <Plus className="size-4" /> Log PR
            </button>
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={Dumbbell}
          label="Workouts this week"
          value={`${trainedCount} / 5`}
          tone={trainedCount >= 3 ? "success" : "primary"}
        />
        <StatCard
          icon={CalendarDays}
          label="Exercises completed"
          value={`${completedCount} / ${exercises.length}`}
        />
        <StatCard icon={Medal} label="PRs recorded" value={prs.length} tone="warning" />
        <StatCard
          icon={History}
          label="Routine size"
          value={`${exercises.length} exercises`}
        />
      </div>

      {showExForm && (
        <Panel className="mb-4">
          <SectionHeader title="Add new exercise to routine" icon={Dumbbell} />
          <form onSubmit={addExercise} className="flex flex-wrap items-center gap-2 text-xs">
            <input
              value={exName}
              onChange={(e) => setExName(e.target.value)}
              placeholder="Exercise name (e.g. Bench press)"
              className="h-9 min-w-44 flex-1 rounded-md border bg-background px-2"
              required
            />
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Sets:</span>
              <input
                type="number"
                min="1"
                value={exSets}
                onChange={(e) => setExSets(Number(e.target.value))}
                className="h-9 w-14 rounded-md border bg-background px-2"
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Reps:</span>
              <input
                type="number"
                min="1"
                value={exReps}
                onChange={(e) => setExReps(Number(e.target.value))}
                className="h-9 w-14 rounded-md border bg-background px-2"
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Kg:</span>
              <input
                type="number"
                min="0"
                step="0.5"
                value={exKg}
                onChange={(e) => setExKg(Number(e.target.value))}
                className="h-9 w-16 rounded-md border bg-background px-2"
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Rest:</span>
              <input
                value={exRest}
                onChange={(e) => setExRest(e.target.value)}
                placeholder="1:30"
                className="h-9 w-16 rounded-md border bg-background px-2"
              />
            </div>
            <button type="submit" className="h-9 rounded-md bg-primary px-3 font-medium text-primary-foreground hover:bg-primary-hover">
              Save
            </button>
            <button type="button" onClick={() => setShowExForm(false)} className="h-9 rounded-md border px-2.5 hover:bg-elevated">
              Cancel
            </button>
          </form>
        </Panel>
      )}

      {showPrForm && (
        <Panel className="mb-4">
          <SectionHeader title="Log Personal Record (PR)" icon={Medal} />
          <form onSubmit={addPr} className="flex flex-wrap items-center gap-2 text-xs">
            <input
              value={prName}
              onChange={(e) => setPrName(e.target.value)}
              placeholder="Exercise (e.g. Deadlift)"
              className="h-9 min-w-40 flex-1 rounded-md border bg-background px-2"
              required
            />
            <input
              value={prWeight}
              onChange={(e) => setPrWeight(e.target.value)}
              placeholder="Weight/time (e.g. 140 kg or 24:12)"
              className="h-9 w-44 rounded-md border bg-background px-2"
              required
            />
            <button type="submit" className="h-9 rounded-md bg-primary px-3 font-medium text-primary-foreground hover:bg-primary-hover">
              Save PR
            </button>
            <button type="button" onClick={() => setShowPrForm(false)} className="h-9 rounded-md border px-2.5 hover:bg-elevated">
              Cancel
            </button>
          </form>
        </Panel>
      )}

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Panel>
          <SectionHeader
            title="Today's Workout Routine"
            icon={Dumbbell}
            action={
              exercises.length > 0 ? (
                <button
                  onClick={() => setDoneSets([])}
                  className="text-xs text-muted-foreground hover:underline"
                >
                  Reset checklist
                </button>
              ) : null
            }
          />
          {exercises.length === 0 ? (
            <EmptyState text="No exercises added yet. Click 'Add exercise' above to build your workout routine." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="py-2 pl-2 font-medium">Exercise</th>
                    <th>Sets</th>
                    <th>Reps</th>
                    <th>Weight</th>
                    <th>Rest</th>
                    <th className="text-right">Done</th>
                    <th className="sr-only">Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {exercises.map((e) => {
                    const isDone = doneSets.includes(e.id);
                    return (
                      <tr key={e.id} className="group border-t">
                        <td className={cn("py-3 pl-2 font-medium", isDone && "text-muted-foreground line-through")}>
                          {e.name}
                        </td>
                        <td className="tabular-nums">{e.sets}</td>
                        <td className="tabular-nums">{e.reps}</td>
                        <td className="tabular-nums">{e.kg} kg</td>
                        <td className="tabular-nums">{e.rest}</td>
                        <td className="text-right">
                          <button
                            aria-label={`Mark ${e.name} ${isDone ? "not done" : "done"}`}
                            onClick={() =>
                              setDoneSets(isDone ? doneSets.filter((x) => x !== e.id) : [...doneSets, e.id])
                            }
                            className={cn(
                              "grid size-9 place-items-center rounded-lg border",
                              isDone ? "border-success bg-success/15 text-success" : "hover:bg-elevated",
                            )}
                          >
                            <Check className="size-4" />
                          </button>
                        </td>
                        <td className="text-right pl-2">
                          <button
                            onClick={() => {
                              setExercises(exercises.filter((x) => x.id !== e.id));
                              setDoneSets(doneSets.filter((x) => x !== e.id));
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-danger"
                            aria-label={`Delete ${e.name}`}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <div className="space-y-4">
          <Panel>
            <SectionHeader title="This week's attendance" icon={CalendarDays} />
            <p className="mb-2 text-xs text-muted-foreground">Click a day to toggle training:</p>
            <div className="grid grid-cols-7 gap-2">
              {days.map((d, i) => (
                <div key={i} className="text-center">
                  <p className="mb-1 text-xs text-muted-foreground">{d}</p>
                  <button
                    onClick={() => toggleDayTrained(i)}
                    className={cn(
                      "grid aspect-square w-full place-items-center rounded-lg text-xs transition-colors",
                      trained[i] ? "bg-success/20 font-bold text-success" : "bg-elevated text-muted-foreground hover:bg-elevated/80",
                    )}
                    aria-label={`${d}: ${trained[i] ? "Trained" : "Rest"}`}
                  >
                    {trained[i] ? <Check className="size-4" /> : "–"}
                  </button>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <SectionHeader title="Personal records" icon={Medal} />
            {prs.length === 0 ? (
              <EmptyState text="No PRs recorded yet. Click 'Log PR' above to track your personal bests." />
            ) : (
              <div className="space-y-1">
                {prs.map((p) => (
                  <Row key={p.id} className="group">
                    <span>{p.exercise}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold tabular-nums">{p.weight}</span>
                      <button
                        onClick={() => setPrs(prs.filter((x) => x.id !== p.id))}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-danger"
                        aria-label="Delete"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  </Row>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
