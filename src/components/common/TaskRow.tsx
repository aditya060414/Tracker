import { Check } from "lucide-react";
import { Tag } from "./ui";
import { cn } from "@/lib/utils";

export type Priority = "high" | "medium" | "low";
export type Task = { id: string; title: string; priority: Priority; due: string; done: boolean; tracked?: string };

const tone = { high: "danger", medium: "warning", low: "muted" } as const;

export function TaskRow({ task, onToggle }: { task: Task; onToggle: () => void }) {
  return (
    <div className="flex min-h-12 items-center gap-3 rounded-lg px-2 hover:bg-elevated">
      <button onClick={onToggle} aria-label={`Mark ${task.title} ${task.done ? "not done" : "done"}`} className={cn("grid size-5 shrink-0 place-items-center rounded-md border-2", task.done ? "border-success bg-success text-background" : "border-border")}>
        {task.done && <Check className="size-3.5" strokeWidth={3} />}
      </button>
      <span className={cn("min-w-0 flex-1 truncate", task.done && "text-muted-foreground line-through")}>{task.title}</span>
      {task.tracked && <span className="hidden text-xs text-muted-foreground tabular-nums sm:inline">{task.tracked}</span>}
      <Tag tone={tone[task.priority]}>{task.priority}</Tag>
      <span className="w-20 text-right text-xs text-muted-foreground">{task.due}</span>
    </div>
  );
}
