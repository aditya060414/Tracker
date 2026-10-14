import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Briefcase, FolderKanban, Timer, PackageCheck, Plus, Trash2 } from "lucide-react";
import { PageHeader, Panel, SectionHeader, StatCard, ProgressBar, Row, Tag, EmptyState } from "@/components/common/ui";
import { TaskRow, type Task, type Priority } from "@/components/common/TaskRow";
import { useLocal } from "@/lib/use-local";
import { pageHead } from "@/lib/meta";

export const Route = createFileRoute("/work")({
  head: pageHead("Work", "Today's work tasks, projects, milestones and focus sessions."),
  component: Work,
});

type Project = { id: string; name: string; pct: number; next: string };
type FocusSession = { id: string; time: string; name: string; tag: string; minutes: number };

function Work() {
  const [tasks, setTasks] = useLocal<Task[]>("work-tasks", []);
  const [projects, setProjects] = useLocal<Project[]>("work-projects", []);
  const [sessions, setSessions] = useLocal<FocusSession[]>("work-focus-sessions", []);

  // Form states
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState<Priority>("medium");
  const [taskDue, setTaskDue] = useState("Today");

  const [projName, setProjName] = useState("");
  const [projPct, setProjPct] = useState(0);
  const [projNext, setProjNext] = useState("");
  const [showProjForm, setShowProjForm] = useState(false);

  const [sessTime, setSessTime] = useState("");
  const [sessName, setSessName] = useState("");
  const [sessTag, setSessTag] = useState("Deep work");
  const [sessMinutes, setSessMinutes] = useState(45);
  const [showSessForm, setShowSessForm] = useState(false);

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    setTasks([
      ...tasks,
      {
        id: crypto.randomUUID(),
        title: taskTitle.trim(),
        priority: taskPriority,
        due: taskDue.trim() || "Today",
        done: false,
      },
    ]);
    setTaskTitle("");
  };

  const addProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projName.trim()) return;
    setProjects([
      ...projects,
      {
        id: crypto.randomUUID(),
        name: projName.trim(),
        pct: Math.min(100, Math.max(0, projPct)),
        next: projNext.trim() || "Next milestone",
      },
    ]);
    setProjName("");
    setProjPct(0);
    setProjNext("");
    setShowProjForm(false);
  };

  const addSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessName.trim()) return;
    setSessions([
      ...sessions,
      {
        id: crypto.randomUUID(),
        time: sessTime.trim() || `${sessMinutes} min session`,
        name: sessName.trim(),
        tag: sessTag.trim() || "Deep work",
        minutes: sessMinutes,
      },
    ]);
    setSessName("");
    setSessTime("");
    setShowSessForm(false);
  };

  const totalFocusMinutes = sessions.reduce((acc, s) => acc + s.minutes, 0);
  const focusTimeDisplay =
    totalFocusMinutes >= 60
      ? `${Math.floor(totalFocusMinutes / 60)}h ${totalFocusMinutes % 60 ? `${totalFocusMinutes % 60}m` : ""}`
      : `${totalFocusMinutes}m`;

  const dueThisWeek = tasks.filter((t) => !t.done).length;

  return (
    <>
      <PageHeader title="Work" description="Focus on what moves the needle." />
      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Briefcase} label="Tasks open" value={tasks.filter((t) => !t.done).length} />
        <StatCard icon={Timer} label="Focus today" value={focusTimeDisplay} tone={totalFocusMinutes > 0 ? "success" : "primary"} />
        <StatCard icon={FolderKanban} label="Active projects" value={projects.length} />
        <StatCard icon={PackageCheck} label="Due tasks" value={dueThisWeek} tone={dueThisWeek > 0 ? "warning" : "primary"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Panel>
          <SectionHeader title="Today's work tasks" icon={Briefcase} />
          <form onSubmit={addTask} className="mb-3 flex flex-wrap gap-2">
            <input
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="Add a new work task..."
              className="h-11 min-w-[200px] flex-1 rounded-[10px] border bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <select
              value={taskPriority}
              onChange={(e) => setTaskPriority(e.target.value as Priority)}
              className="h-11 rounded-[10px] border bg-background px-3 outline-none"
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <input
              value={taskDue}
              onChange={(e) => setTaskDue(e.target.value)}
              placeholder="Due (e.g. Today)"
              className="h-11 w-28 rounded-[10px] border bg-background px-3 outline-none"
            />
            <button
              type="submit"
              className="flex h-11 items-center gap-1 rounded-[10px] bg-primary px-4 font-medium text-primary-foreground hover:bg-primary-hover"
            >
              <Plus className="size-4" /> Add
            </button>
          </form>

          {tasks.length === 0 ? (
            <EmptyState text="No work tasks yet. Add a task above to focus your day." />
          ) : (
            <div className="space-y-1">
              {tasks.map((t) => (
                <div key={t.id} className="group flex items-center justify-between">
                  <div className="flex-1">
                    <TaskRow
                      task={t}
                      onToggle={() =>
                        setTasks(tasks.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)))
                      }
                    />
                  </div>
                  <button
                    onClick={() => setTasks(tasks.filter((x) => x.id !== t.id))}
                    aria-label={`Delete ${t.title}`}
                    className="ml-1 opacity-0 group-hover:opacity-100 p-2 text-muted-foreground hover:text-danger"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel>
          <SectionHeader
            title="Projects"
            icon={FolderKanban}
            action={
              <button
                onClick={() => setShowProjForm(!showProjForm)}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Plus className="size-3.5" /> New
              </button>
            }
          />

          {showProjForm && (
            <form onSubmit={addProject} className="mb-4 space-y-2 rounded-lg border bg-elevated/40 p-3 text-xs">
              <input
                value={projName}
                onChange={(e) => setProjName(e.target.value)}
                placeholder="Project name"
                className="h-9 w-full rounded-md border bg-background px-2"
                required
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={projPct}
                  onChange={(e) => setProjPct(Number(e.target.value))}
                  placeholder="Progress %"
                  className="h-9 w-24 rounded-md border bg-background px-2"
                />
                <input
                  value={projNext}
                  onChange={(e) => setProjNext(e.target.value)}
                  placeholder="Next milestone / date"
                  className="h-9 flex-1 rounded-md border bg-background px-2"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowProjForm(false)}
                  className="rounded px-2.5 py-1 hover:bg-elevated"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded bg-primary px-3 py-1 font-medium text-primary-foreground hover:bg-primary-hover"
                >
                  Save project
                </button>
              </div>
            </form>
          )}

          {projects.length === 0 ? (
            <EmptyState text="No active projects. Click '+ New' above to track initiatives." />
          ) : (
            <div className="space-y-5">
              {projects.map((p) => (
                <div key={p.id} className="group relative">
                  <div className="mb-2 flex justify-between">
                    <span className="font-medium">{p.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground tabular-nums">{p.pct}%</span>
                      <button
                        onClick={() => setProjects(projects.filter((x) => x.id !== p.id))}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-danger"
                        aria-label={`Delete ${p.name}`}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                  <ProgressBar value={p.pct} label={p.name} />
                  <p className="mt-1.5 text-xs text-muted-foreground">Next: {p.next}</p>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel className="xl:col-span-2">
          <SectionHeader
            title="Focus sessions today"
            icon={Timer}
            action={
              <button
                onClick={() => setShowSessForm(!showSessForm)}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Plus className="size-3.5" /> Log session
              </button>
            }
          />

          {showSessForm && (
            <form onSubmit={addSession} className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border bg-elevated/40 p-3 text-xs">
              <input
                value={sessTime}
                onChange={(e) => setSessTime(e.target.value)}
                placeholder="Time (e.g. 09:00 – 10:30)"
                className="h-9 min-w-36 rounded-md border bg-background px-2"
              />
              <input
                value={sessName}
                onChange={(e) => setSessName(e.target.value)}
                placeholder="What did you focus on?"
                className="h-9 flex-1 min-w-44 rounded-md border bg-background px-2"
                required
              />
              <input
                value={sessTag}
                onChange={(e) => setSessTag(e.target.value)}
                placeholder="Tag (e.g. Deep work)"
                className="h-9 w-28 rounded-md border bg-background px-2"
              />
              <input
                type="number"
                min="5"
                step="5"
                value={sessMinutes}
                onChange={(e) => setSessMinutes(Number(e.target.value))}
                placeholder="Minutes"
                className="h-9 w-20 rounded-md border bg-background px-2"
              />
              <button
                type="submit"
                className="h-9 rounded-md bg-primary px-3 font-medium text-primary-foreground hover:bg-primary-hover"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setShowSessForm(false)}
                className="h-9 rounded-md px-2.5 hover:bg-elevated"
              >
                Cancel
              </button>
            </form>
          )}

          {sessions.length === 0 ? (
            <EmptyState text="No focus sessions logged today. Click 'Log session' to record your deep work." />
          ) : (
            <div className="space-y-1">
              {sessions.map((s) => (
                <Row key={s.id} className="group">
                  <span className="w-36 text-muted-foreground tabular-nums text-xs">{s.time}</span>
                  <span className="flex-1 font-medium">{s.name}</span>
                  <Tag tone="primary">{s.tag}</Tag>
                  <span className="ml-2 text-xs text-muted-foreground">{s.minutes}m</span>
                  <button
                    onClick={() => setSessions(sessions.filter((x) => x.id !== s.id))}
                    className="ml-2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-danger"
                    aria-label={`Delete ${s.name}`}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </Row>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
