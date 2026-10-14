import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Search, Pin, LayoutGrid, List, ListPlus, Send } from "lucide-react";
import { PageHeader, Panel, Tag, EmptyState } from "@/components/common/ui";
import { useLocal } from "@/lib/use-local";
import { pageHead } from "@/lib/meta";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ideas")({
  head: pageHead("Ideas", "Capture ideas fast, tag them, pin the best and turn them into tasks."),
  component: Ideas,
});

type Idea = { id: string; text: string; tag: string; pinned: boolean; at: string };

function Ideas() {
  const [ideas, setIdeas] = useLocal<Idea[]>("ideas", []);
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const shown = ideas.filter((i) => (i.text + i.tag).toLowerCase().includes(q.toLowerCase())).sort((a, b) => Number(b.pinned) - Number(a.pinned));
  const capture = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    const tag = draft.match(/#(\w+)/)?.[1] ?? "Inbox";
    setIdeas([{ id: crypto.randomUUID(), text: draft.replace(/#\w+/g, "").trim(), tag, pinned: false, at: new Date().toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) }, ...ideas]);
    setDraft("");
  };
  return (
    <>
      <PageHeader title="Ideas" description="Capture first. Organize later." />
      <form onSubmit={capture} className="mb-4 flex gap-2">
        <label htmlFor="cap" className="sr-only">New idea</label>
        <input id="cap" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type an idea… add #tag to categorize" className="h-12 flex-1 rounded-[10px] border bg-card px-4 outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        <button aria-label="Save idea" className="grid size-12 place-items-center rounded-[10px] bg-primary text-primary-foreground hover:bg-primary-hover"><Send className="size-4" /></button>
      </form>
      <div className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <label htmlFor="q" className="sr-only">Search ideas</label>
          <input id="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="h-11 w-full rounded-[10px] border bg-background pr-3 pl-9 outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </div>
        <div className="flex rounded-[10px] border p-1">
          <button aria-label="Grid view" aria-pressed={view === "grid"} onClick={() => setView("grid")} className={cn("grid size-9 place-items-center rounded-md", view === "grid" && "bg-elevated")}><LayoutGrid className="size-4" /></button>
          <button aria-label="List view" aria-pressed={view === "list"} onClick={() => setView("list")} className={cn("grid size-9 place-items-center rounded-md", view === "list" && "bg-elevated")}><List className="size-4" /></button>
        </div>
      </div>
      {shown.length === 0 ? <EmptyState text={ideas.length === 0 ? "No ideas captured yet. Type an idea above and click send to get started!" : "No ideas match your search."} /> : (
        <div className={cn("gap-4", view === "grid" ? "grid sm:grid-cols-2 xl:grid-cols-3" : "flex flex-col")}>
          {shown.map((i) => (
            <Panel key={i.id} className={cn(i.pinned && "border-chart-5/60")}>
              <div className="mb-3 flex items-center justify-between">
                <Tag tone="primary">#{i.tag}</Tag>
                <button aria-label={i.pinned ? "Unpin" : "Pin"} aria-pressed={i.pinned} onClick={() => setIdeas(ideas.map((x) => (x.id === i.id ? { ...x, pinned: !x.pinned } : x)))} className={cn("grid size-9 place-items-center rounded-lg hover:bg-elevated", i.pinned ? "text-chart-5" : "text-muted-foreground")}><Pin className="size-4" /></button>
              </div>
              <p>{i.text}</p>
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span>{i.at}</span>
                <button onClick={() => toast.success("Converted to a task", { description: i.text.slice(0, 60) })} className="flex items-center gap-1 rounded-md px-2 py-1 hover:bg-elevated hover:text-foreground"><ListPlus className="size-3.5" /> Make task</button>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}
