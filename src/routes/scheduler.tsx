import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarClock, AlertTriangle, Clock, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { PageHeader, Panel, SectionHeader, EmptyState } from "@/components/common/ui";
import { TaskRow, type Task, type Priority } from "@/components/common/TaskRow";
import { useLocal } from "@/lib/use-local";
import { pageHead } from "@/lib/meta";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/scheduler")({
  head: pageHead("Task Scheduler", "Calendar view of scheduled tasks, due dates, overdue and upcoming items."),
  component: Scheduler,
});

function Scheduler() {
  const [view, setView] = useState<"month" | "week" | "day">("month");
  const [today, setToday] = useState<Date | null>(null);
  const [od, setOd] = useLocal<Task[]>("sched-overdue", []);
  const [up, setUp] = useLocal<Task[]>("sched-upcoming", []);
  const [events, setEvents] = useLocal<Record<number, string[]>>("sched-events", {});

  // Add task inputs
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [taskPriority, setTaskPriority] = useState<Priority>("medium");
  const [taskTarget, setTaskTarget] = useState<"upcoming" | "overdue">("upcoming");
  const [showTaskForm, setShowTaskForm] = useState(false);

  // Quick event input for selected date
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [newEventTitle, setNewEventTitle] = useState("");

  useEffect(() => setToday(new Date()), []);
  const ref = today ?? new Date();
  const first = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const daysIn = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();

  const toggle = (list: Task[], set: (t: Task[]) => void, id: string) =>
    set(list.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  const removeTask = (list: Task[], set: (t: Task[]) => void, id: string) =>
    set(list.filter((t) => t.id !== id));

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    const newTask: Task = {
      id: crypto.randomUUID(),
      title: taskTitle.trim(),
      priority: taskPriority,
      due: taskDue.trim() || (taskTarget === "overdue" ? "Yesterday" : "Upcoming"),
      done: false,
    };
    if (taskTarget === "overdue") {
      setOd([...od, newTask]);
    } else {
      setUp([...up, newTask]);
    }
    setTaskTitle("");
    setTaskDue("");
    setShowTaskForm(false);
  };

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDay === null || !newEventTitle.trim()) return;
    const current = events[selectedDay] || [];
    setEvents({
      ...events,
      [selectedDay]: [...current, newEventTitle.trim()],
    });
    setNewEventTitle("");
  };

  const removeEvent = (day: number, index: number) => {
    const current = events[day] || [];
    const updated = current.filter((_, i) => i !== index);
    if (updated.length === 0) {
      const next = { ...events };
      delete next[day];
      setEvents(next);
    } else {
      setEvents({ ...events, [day]: updated });
    }
  };

  return (
    <>
      <PageHeader
        title="Task Scheduler"
        description="Plan your time, not just your tasks."
        actions={
          <button
            onClick={() => setShowTaskForm(!showTaskForm)}
            className="flex items-center gap-1 rounded-[10px] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
          >
            <Plus className="size-4" /> Schedule task
          </button>
        }
      />

      {showTaskForm && (
        <Panel className="mb-4">
          <SectionHeader title="Schedule a new task" icon={CalendarClock} />
          <form onSubmit={handleAddTask} className="flex flex-wrap items-center gap-2">
            <input
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="Task description"
              className="h-11 min-w-[220px] flex-1 rounded-[10px] border bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            />
            <select
              value={taskTarget}
              onChange={(e) => setTaskTarget(e.target.value as "upcoming" | "overdue")}
              className="h-11 rounded-[10px] border bg-background px-3 outline-none"
            >
              <option value="upcoming">Upcoming</option>
              <option value="overdue">Overdue</option>
            </select>
            <select
              value={taskPriority}
              onChange={(e) => setTaskPriority(e.target.value as Priority)}
              className="h-11 rounded-[10px] border bg-background px-3 outline-none"
            >
              <option value="high">High priority</option>
              <option value="medium">Medium priority</option>
              <option value="low">Low priority</option>
            </select>
            <input
              value={taskDue}
              onChange={(e) => setTaskDue(e.target.value)}
              placeholder="Due date / time (e.g. Fri 10:00)"
              className="h-11 min-w-36 rounded-[10px] border bg-background px-3 outline-none"
            />
            <button
              type="submit"
              className="h-11 rounded-[10px] bg-primary px-4 font-medium text-primary-foreground hover:bg-primary-hover"
            >
              Save task
            </button>
            <button
              type="button"
              onClick={() => setShowTaskForm(false)}
              className="h-11 rounded-[10px] border px-3 hover:bg-elevated"
            >
              Cancel
            </button>
          </form>
        </Panel>
      )}

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Panel>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button aria-label="Previous" className="grid size-9 place-items-center rounded-lg border hover:bg-elevated">
                <ChevronLeft className="size-4" />
              </button>
              <h2 className="font-display min-w-36 text-center text-lg font-semibold" suppressHydrationWarning>
                {ref.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
              </h2>
              <button aria-label="Next" className="grid size-9 place-items-center rounded-lg border hover:bg-elevated">
                <ChevronRight className="size-4" />
              </button>
            </div>
            <div className="flex rounded-lg bg-elevated p-1" role="tablist">
              {(["month", "week", "day"] as const).map((v) => (
                <button
                  key={v}
                  role="tab"
                  aria-selected={view === v}
                  onClick={() => setView(v)}
                  className={cn(
                    "rounded-md px-3 py-1 text-[13px] capitalize",
                    view === v ? "bg-card font-medium shadow-sm" : "text-muted-foreground",
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: offset }).map((_, i) => (
              <div key={`e${i}`} />
            ))}
            {Array.from({ length: daysIn }, (_, i) => i + 1).map((d) => {
              const isToday = d === ref.getDate();
              const isSelected = selectedDay === d;
              const dayEvents = events[d] || [];
              return (
                <div
                  key={d}
                  onClick={() => setSelectedDay(selectedDay === d ? null : d)}
                  className={cn(
                    "min-h-16 cursor-pointer rounded-lg border p-1.5 text-left transition-colors md:min-h-20",
                    isToday ? "border-primary bg-accent/40" : "bg-background hover:border-primary/50",
                    isSelected && "ring-2 ring-primary",
                  )}
                >
                  <span className={cn("text-xs", isToday ? "font-semibold text-primary" : "text-muted-foreground")}>
                    {d}
                  </span>
                  {dayEvents.map((e, idx) => (
                    <div
                      key={idx}
                      className="group/ev mt-1 flex items-center justify-between rounded bg-primary/15 px-1 text-[11px] text-accent-foreground"
                    >
                      <span className="truncate">{e}</span>
                      <button
                        onClick={(ev) => {
                          ev.stopPropagation();
                          removeEvent(d, idx);
                        }}
                        className="ml-1 hidden group-hover/ev:inline text-muted-foreground hover:text-danger"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {selectedDay !== null && (
            <form onSubmit={handleAddEvent} className="mt-4 flex items-center gap-2 rounded-lg border bg-elevated/40 p-2.5">
              <span className="text-xs font-medium">Add note/event for day {selectedDay}:</span>
              <input
                value={newEventTitle}
                onChange={(e) => setNewEventTitle(e.target.value)}
                placeholder="e.g. Doctor appt, Trip..."
                className="h-8 flex-1 rounded border bg-background px-2 text-xs"
                autoFocus
              />
              <button type="submit" className="h-8 rounded bg-primary px-3 text-xs font-medium text-primary-foreground">
                Add
              </button>
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="h-8 rounded border px-2 text-xs hover:bg-elevated"
              >
                Close
              </button>
            </form>
          )}
        </Panel>

        <div className="space-y-4">
          <Panel>
            <SectionHeader title="Overdue" icon={AlertTriangle} />
            {od.length === 0 ? (
              <EmptyState text="No overdue tasks. You're all caught up!" />
            ) : (
              <div className="space-y-1">
                {od.map((t) => (
                  <div key={t.id} className="group flex items-center justify-between">
                    <div className="flex-1">
                      <TaskRow task={t} onToggle={() => toggle(od, setOd, t.id)} />
                    </div>
                    <button
                      onClick={() => removeTask(od, setOd, t.id)}
                      className="p-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-danger"
                      aria-label="Delete"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel>
            <SectionHeader title="Upcoming" icon={Clock} action={<CalendarClock className="size-4 text-muted-foreground" />} />
            {up.length === 0 ? (
              <EmptyState text="No upcoming tasks scheduled." />
            ) : (
              <div className="space-y-1">
                {up.map((t) => (
                  <div key={t.id} className="group flex items-center justify-between">
                    <div className="flex-1">
                      <TaskRow task={t} onToggle={() => toggle(up, setUp, t.id)} />
                    </div>
                    <button
                      onClick={() => removeTask(up, setUp, t.id)}
                      className="p-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-danger"
                      aria-label="Delete"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
