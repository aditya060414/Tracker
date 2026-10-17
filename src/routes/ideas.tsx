import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Search,
  Pin,
  LayoutGrid,
  List,
  ListPlus,
  Send,
  Pencil,
  Trash2,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Sparkles,
  Lightbulb,
  FileText,
  Tag as TagIcon,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";
import { PageHeader, Panel, Tag, EmptyState } from "@/components/common/ui";
import { useLocal } from "@/lib/use-local";
import { pageHead } from "@/lib/meta";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ideas")({
  head: pageHead(
    "Ideas & Brainstorming",
    "Capture brainstorm titles, detailed notes, organize with tags, and turn insights into daily actionable tasks."
  ),
  component: Ideas,
});

export type Idea = {
  id: string;
  title: string;
  details?: string | undefined;
  /** Backwards compatibility for existing legacy ideas created with a single text field */
  text?: string | undefined;
  tag: string;
  pinned: boolean;
  at: string;
  updatedAt?: number | undefined;
};

type Goal = { id: string; text: string; done: boolean; time?: string | undefined };

const commonTags = ["Inbox", "Startup", "Product", "Operations", "Marketing", "Logistics", "Personal"];

function Ideas() {
  const [ideas, setIdeas] = useLocal<Idea[]>("ideas", []);
  const [goals, setGoals] = useLocal<Goal[]>("goals", []);
  const [q, setQ] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [view, setView] = useState<"grid" | "list">("grid");

  // New brainstorm composer state
  const [titleDraft, setTitleDraft] = useState("");
  const [detailsDraft, setDetailsDraft] = useState("");
  const [tagDraft, setTagDraft] = useState("Inbox");
  const [pinDraft, setPinDraft] = useState(false);
  const [isComposerExpanded, setIsComposerExpanded] = useState(false);

  // In-card editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDetails, setEditDetails] = useState("");
  const [editTag, setEditTag] = useState("Inbox");

  // Expanded cards for long details
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  // Unique tags for quick filtering
  const allTags = useMemo(() => {
    const set = new Set<string>();
    ideas.forEach((i) => {
      if (i.tag) set.add(i.tag);
    });
    return Array.from(set);
  }, [ideas]);

  const toggleExpand = (id: string) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCapture = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedTitle = titleDraft.trim();
    if (!trimmedTitle) {
      toast.error("Please enter a brainstorm title");
      return;
    }

    // Auto-extract tag if user typed #something in the title
    const tagMatch = trimmedTitle.match(/#(\w+)/);
    const resolvedTag = tagMatch?.[1] ? tagMatch[1] : tagDraft.trim().replace(/^#/, "") || "Inbox";
    const cleanedTitle = trimmedTitle.replace(/#\w+/g, "").trim();

    const newIdea: Idea = {
      id: crypto.randomUUID(),
      title: cleanedTitle || trimmedTitle,
      details: detailsDraft.trim() || undefined,
      text: cleanedTitle || trimmedTitle, // for backwards compatibility
      tag: resolvedTag,
      pinned: pinDraft,
      at: new Date().toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      updatedAt: Date.now(),
    };

    setIdeas([newIdea, ...ideas]);
    setTitleDraft("");
    setDetailsDraft("");
    setTagDraft("Inbox");
    setPinDraft(false);
    setIsComposerExpanded(false);
    toast.success("Brainstorm captured!", {
      description: `"${newIdea.title}" saved with #${newIdea.tag}`,
    });
  };

  const startEditing = (idea: Idea) => {
    setEditingId(idea.id);
    setEditTitle(idea.title || idea.text || "");
    setEditDetails(idea.details || "");
    setEditTag(idea.tag || "Inbox");
  };

  const saveEdit = (id: string) => {
    const trimmedTitle = editTitle.trim();
    if (!trimmedTitle) {
      toast.error("Brainstorm title cannot be empty");
      return;
    }

    const tagMatch = trimmedTitle.match(/#(\w+)/);
    const resolvedTag = tagMatch?.[1] ? tagMatch[1] : editTag.trim().replace(/^#/, "") || "Inbox";
    const cleanedTitle = trimmedTitle.replace(/#\w+/g, "").trim();

    setIdeas(
      ideas.map((x) =>
        x.id === id
          ? {
              ...x,
              title: cleanedTitle || trimmedTitle,
              text: cleanedTitle || trimmedTitle,
              details: editDetails.trim() || undefined,
              tag: resolvedTag,
              updatedAt: Date.now(),
            }
          : x
      )
    );

    setEditingId(null);
    toast.success("Brainstorm updated");
  };

  const deleteIdea = (id: string) => {
    const target = ideas.find((i) => i.id === id);
    setIdeas(ideas.filter((i) => i.id !== id));
    toast.success("Brainstorm removed", {
      action: target
        ? {
            label: "Undo",
            onClick: () => setIdeas((prev) => [target, ...prev]),
          }
        : undefined,
    });
  };

  const togglePin = (id: string) => {
    setIdeas(
      ideas.map((x) => (x.id === id ? { ...x, pinned: !x.pinned } : x))
    );
  };

  const convertToTask = (idea: Idea) => {
    const taskTitle = idea.title || idea.text || "New task";
    const newGoal: Goal = {
      id: crypto.randomUUID(),
      text: taskTitle,
      done: false,
    };
    setGoals([...goals, newGoal]);
    toast.success("Converted to a task", {
      description: `"${taskTitle}" added to today's goals list.`,
    });
  };

  const copyToClipboard = (idea: Idea) => {
    const title = idea.title || idea.text || "";
    const details = idea.details || "";
    const textToCopy = details ? `${title}\n\n${details}` : title;
    navigator.clipboard.writeText(textToCopy);
    toast.success("Copied to clipboard");
  };

  // Filter ideas based on search and tag
  const filteredIdeas = useMemo(() => {
    return ideas
      .filter((i) => {
        const title = i.title || i.text || "";
        const details = i.details || "";
        const tag = i.tag || "";
        const matchesQuery =
          !q.trim() ||
          (title + " " + details + " " + tag).toLowerCase().includes(q.toLowerCase());

        if (!matchesQuery) return false;

        if (selectedTag === "all") return true;
        if (selectedTag === "pinned") return i.pinned;
        return tag.toLowerCase() === selectedTag.toLowerCase();
      })
      .sort((a, b) => {
        // Pinned first
        if (a.pinned !== b.pinned) return Number(b.pinned) - Number(a.pinned);
        // Then newest
        return (b.updatedAt || 0) - (a.updatedAt || 0);
      });
  }, [ideas, q, selectedTag]);

  return (
    <>
      <PageHeader
        title="Ideas & Brainstorming"
        description="Brainstorm titles and capture detailed information, organize with tags, and convert into actionable daily tasks."
      />

      {/* Brainstorm Composer Panel */}
      <Panel className="mb-6 border-primary/20 bg-card shadow-sm transition-all">
        <form onSubmit={handleCapture}>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
                <Sparkles className="size-4" />
              </span>
              <span className="text-sm font-semibold tracking-tight">New Brainstorm</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPinDraft(!pinDraft)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                  pinDraft
                    ? "bg-amber-500/15 text-amber-500 hover:bg-amber-500/25"
                    : "text-muted-foreground hover:bg-elevated hover:text-foreground"
                )}
                title={pinDraft ? "Will be pinned to top" : "Pin to top"}
              >
                <Pin className={cn("size-3.5", pinDraft && "fill-current")} />
                <span>{pinDraft ? "Pinned" : "Pin"}</span>
              </button>
            </div>
          </div>

          {/* Title Input */}
          <div className="relative mb-3">
            <label htmlFor="brainstorm-title" className="sr-only">
              Brainstorm Title
            </label>
            <input
              id="brainstorm-title"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onFocus={() => setIsComposerExpanded(true)}
              placeholder="Brainstorm Title (e.g., BisonMooves - Store, Website redesign...)"
              className="h-11 w-full rounded-xl border bg-background/80 px-3.5 text-base font-medium outline-none transition-all placeholder:text-muted-foreground/60 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  handleCapture();
                }
              }}
            />
          </div>

          {/* Detailed Information Textarea */}
          {(isComposerExpanded || detailsDraft.length > 0) && (
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="brainstorm-details"
                  className="mb-1.5 block text-xs font-medium text-muted-foreground"
                >
                  Detailed Information & Brainstorm Notes
                </label>
                <textarea
                  id="brainstorm-details"
                  rows={4}
                  value={detailsDraft}
                  onChange={(e) => setDetailsDraft(e.target.value)}
                  placeholder="Write detailed information, execution steps, context, thoughts, bullet points, or links..."
                  className="w-full resize-y rounded-xl border bg-background/80 p-3.5 text-sm leading-relaxed outline-none transition-all placeholder:text-muted-foreground/60 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                      handleCapture();
                    }
                  }}
                />
              </div>

              {/* Tag Selection Row */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <TagIcon className="size-3.5" /> Tag:
                </span>
                <input
                  value={tagDraft}
                  onChange={(e) => setTagDraft(e.target.value)}
                  placeholder="Custom tag"
                  className="h-7 w-28 rounded-lg border bg-background px-2 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <div className="flex flex-wrap gap-1">
                  {commonTags.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTagDraft(t)}
                      className={cn(
                        "rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors",
                        tagDraft.toLowerCase() === t.toLowerCase()
                          ? "bg-primary text-primary-foreground"
                          : "bg-elevated text-muted-foreground hover:bg-elevated/80 hover:text-foreground"
                      )}
                    >
                      #{t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Composer Actions */}
          <div className="mt-3 flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setIsComposerExpanded(!isComposerExpanded)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <FileText className="size-3.5" />
              <span>
                {isComposerExpanded
                  ? "Collapse details"
                  : detailsDraft
                  ? "Show details"
                  : "+ Add detailed notes"}
              </span>
            </button>

            <div className="flex items-center gap-2">
              {(titleDraft || detailsDraft) && (
                <button
                  type="button"
                  onClick={() => {
                    setTitleDraft("");
                    setDetailsDraft("");
                    setIsComposerExpanded(false);
                  }}
                  className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-elevated hover:text-foreground"
                >
                  Clear
                </button>
              )}
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                <Send className="size-3.5" />
                <span>Save Brainstorm</span>
                <span className="hidden text-[10px] opacity-75 sm:inline">(Ctrl+Enter)</span>
              </button>
            </div>
          </div>
        </form>
      </Panel>

      {/* Controls & Filter Bar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <label htmlFor="search-ideas" className="sr-only">
            Search ideas
          </label>
          <input
            id="search-ideas"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search brainstorm titles, detailed notes, or tags..."
            className="h-10 w-full rounded-xl border bg-background pr-3 pl-9 text-sm outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border p-0.5">
            <button
              aria-label="Grid view"
              aria-pressed={view === "grid"}
              onClick={() => setView("grid")}
              className={cn(
                "grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors",
                view === "grid" && "bg-elevated text-foreground"
              )}
            >
              <LayoutGrid className="size-4" />
            </button>
            <button
              aria-label="List view"
              aria-pressed={view === "list"}
              onClick={() => setView("list")}
              className={cn(
                "grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors",
                view === "list" && "bg-elevated text-foreground"
              )}
            >
              <List className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Tag Filter Pills */}
      {ideas.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-1.5 text-xs">
          <button
            onClick={() => setSelectedTag("all")}
            className={cn(
              "rounded-lg px-2.5 py-1 font-medium transition-colors",
              selectedTag === "all"
                ? "bg-foreground text-background"
                : "bg-elevated text-muted-foreground hover:bg-elevated/80 hover:text-foreground"
            )}
          >
            All ({ideas.length})
          </button>
          {ideas.some((i) => i.pinned) && (
            <button
              onClick={() => setSelectedTag("pinned")}
              className={cn(
                "flex items-center gap-1 rounded-lg px-2.5 py-1 font-medium transition-colors",
                selectedTag === "pinned"
                  ? "bg-amber-500 text-white"
                  : "bg-elevated text-muted-foreground hover:bg-elevated/80 hover:text-foreground"
              )}
            >
              <Pin className="size-3 fill-current" />
              Pinned ({ideas.filter((i) => i.pinned).length})
            </button>
          )}
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={cn(
                "rounded-lg px-2.5 py-1 font-medium transition-colors",
                selectedTag.toLowerCase() === tag.toLowerCase()
                  ? "bg-primary text-primary-foreground"
                  : "bg-elevated text-muted-foreground hover:bg-elevated/80 hover:text-foreground"
              )}
            >
              #{tag} ({ideas.filter((i) => (i.tag || "").toLowerCase() === tag.toLowerCase()).length})
            </button>
          ))}
        </div>
      )}

      {/* Ideas Grid / List */}
      {filteredIdeas.length === 0 ? (
        <EmptyState
          text={
            ideas.length === 0
              ? "No brainstorms captured yet. Type a title above and add your detailed notes to get started!"
              : "No brainstorms match your search or filter."
          }
        />
      ) : (
        <div
          className={cn(
            "gap-4",
            view === "grid" ? "grid sm:grid-cols-2 xl:grid-cols-3" : "flex flex-col"
          )}
        >
          {filteredIdeas.map((i) => {
            const isEditing = editingId === i.id;
            const title = i.title || i.text || "Untitled Brainstorm";
            const details = i.details || "";
            const isExpanded = !!expandedCards[i.id];
            const isLongDetails = details.length > 200 || details.split("\n").length > 3;

            return (
              <Panel
                key={i.id}
                className={cn(
                  "group relative flex flex-col justify-between transition-all duration-200",
                  i.pinned
                    ? "border-amber-500/40 bg-gradient-to-b from-card to-amber-500/[0.03] shadow-sm ring-1 ring-amber-500/20"
                    : "hover:border-primary/40"
                )}
              >
                {isEditing ? (
                  /* In-Card Edit Form */
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Editing Brainstorm
                      </span>
                      <button
                        onClick={() => setEditingId(null)}
                        className="rounded p-1 text-muted-foreground hover:bg-elevated hover:text-foreground"
                      >
                        <X className="size-4" />
                      </button>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">
                        Brainstorm Title
                      </label>
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="h-9 w-full rounded-lg border bg-background px-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        placeholder="Brainstorm Title"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">
                        Detailed Information
                      </label>
                      <textarea
                        rows={4}
                        value={editDetails}
                        onChange={(e) => setEditDetails(e.target.value)}
                        className="w-full resize-y rounded-lg border bg-background p-2.5 text-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        placeholder="Write detailed notes, bullet points, context..."
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Tag:</span>
                      <input
                        value={editTag}
                        onChange={(e) => setEditTag(e.target.value)}
                        className="h-7 w-28 rounded-lg border bg-background px-2 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        placeholder="Tag"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-elevated hover:text-foreground"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => saveEdit(i.id)}
                        className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                      >
                        <Check className="size-3.5" />
                        Save Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Standard Card View */
                  <>
                    <div>
                      {/* Top Bar: Tag & Action Buttons */}
                      <div className="mb-3 flex items-center justify-between">
                        <Tag tone="primary">#{i.tag || "Inbox"}</Tag>

                        <div className="flex items-center gap-1">
                          {/* Pin Toggle */}
                          <button
                            aria-label={i.pinned ? "Unpin" : "Pin"}
                            aria-pressed={i.pinned}
                            onClick={() => togglePin(i.id)}
                            className={cn(
                              "grid size-8 place-items-center rounded-lg transition-colors",
                              i.pinned
                                ? "bg-amber-500/15 text-amber-500 hover:bg-amber-500/25"
                                : "text-muted-foreground hover:bg-elevated hover:text-foreground"
                            )}
                            title={i.pinned ? "Unpin" : "Pin to top"}
                          >
                            <Pin className={cn("size-3.5", i.pinned && "fill-current")} />
                          </button>

                          {/* Edit Button */}
                          <button
                            aria-label="Edit brainstorm"
                            onClick={() => startEditing(i)}
                            className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-elevated hover:text-foreground"
                            title="Edit brainstorm & details"
                          >
                            <Pencil className="size-3.5" />
                          </button>

                          {/* Delete Button */}
                          <button
                            aria-label="Delete brainstorm"
                            onClick={() => deleteIdea(i.id)}
                            className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-danger/15 hover:text-danger"
                            title="Delete"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Brainstorm Title */}
                      <h3 className="text-base font-semibold tracking-tight text-foreground sm:text-[17px]">
                        {title}
                      </h3>

                      {/* Detailed Information Section */}
                      {details ? (
                        <div className="mt-2.5">
                          <div
                            className={cn(
                              "rounded-xl border border-border/50 bg-background/50 p-3 text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap transition-all",
                              !isExpanded && isLongDetails && "max-h-24 overflow-hidden mask-fade-bottom"
                            )}
                          >
                            {details}
                          </div>

                          {isLongDetails && (
                            <button
                              onClick={() => toggleExpand(i.id)}
                              className="mt-1 flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="size-3" /> Show less
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="size-3" /> Show full details
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditing(i)}
                          className="mt-2 flex items-center gap-1 text-xs text-muted-foreground/60 transition-colors hover:text-primary"
                        >
                          <Pencil className="size-3" />
                          <span>+ Add detailed information</span>
                        </button>
                      )}
                    </div>

                    {/* Card Footer */}
                    <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3 text-xs text-muted-foreground">
                      <span className="tabular-nums">{i.at}</span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => copyToClipboard(i)}
                          className="flex items-center gap-1 rounded-md px-2 py-1 transition-colors hover:bg-elevated hover:text-foreground"
                          title="Copy title and details"
                        >
                          <Copy className="size-3.5" />
                          <span className="hidden sm:inline">Copy</span>
                        </button>

                        <button
                          onClick={() => convertToTask(i)}
                          className="flex items-center gap-1 rounded-md px-2 py-1 font-medium text-foreground transition-colors hover:bg-elevated hover:text-primary"
                          title="Convert this brainstorm into a daily task"
                        >
                          <ListPlus className="size-3.5" />
                          <span>Make task</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </Panel>
            );
          })}
        </div>
      )}
    </>
  );
}
