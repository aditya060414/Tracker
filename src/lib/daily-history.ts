export type DailyGoalItem = {
  id: string;
  text: string;
  done: boolean;
  time?: string;
};

export type DailyFocusSessionItem = {
  id: string;
  name: string;
  minutes: number;
  tag?: string;
  time?: string;
};

export type DailySpecialTask = {
  title: string;
  done: boolean;
};

export type DailyChallengeSnapshot = {
  activeName: string;
  day: number;
  totalDays: number;
  streak: number;
  completedToday?: boolean;
  checkedCount?: number;
  totalCount?: number;
};

export type DailyLog = {
  date: string; // YYYY-MM-DD format
  updatedAt: number;
  goals: DailyGoalItem[];
  goalsDone: number;
  goalsTotal: number;
  completionPct: number; // 0-100
  focusMinutes: number;
  focusSessions: DailyFocusSessionItem[];
  specialTask?: DailySpecialTask | null;
  challenge?: DailyChallengeSnapshot;
  spent?: number;
  notes?: string;
  mood?: "great" | "good" | "neutral" | "tired" | "rough";
};

export type DailyHistoryMap = Record<string, DailyLog>;

/**
 * Returns date string in YYYY-MM-DD local format
 */
export function formatDateKey(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parse YYYY-MM-DD back into local Date
 */
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y || 2026, (m || 1) - 1, d || 1);
}

/**
 * Get date string offset by days (+1 for tomorrow, -1 for yesterday)
 */
export function getOffsetDateKey(baseDateKey: string, dayOffset: number): string {
  const d = parseDateKey(baseDateKey);
  d.setDate(d.getDate() + dayOffset);
  return formatDateKey(d);
}

export function getTodayDateKey(): string {
  return formatDateKey(new Date());
}

export function getYesterdayDateKey(): string {
  return getOffsetDateKey(getTodayDateKey(), -1);
}

export function isToday(key: string): boolean {
  return key === getTodayDateKey();
}

export function isYesterday(key: string): boolean {
  return key === getYesterdayDateKey();
}

export function isFuture(key: string): boolean {
  return key > getTodayDateKey();
}

/**
 * Human readable title for dates
 */
export function formatFriendlyDate(dateKey: string): string {
  if (isToday(dateKey)) return "Today";
  if (isYesterday(dateKey)) return "Yesterday";
  
  const d = parseDateKey(dateKey);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Full readable date with day of week
 */
export function formatLongDate(dateKey: string): string {
  const d = parseDateKey(dateKey);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Helper to calculate completion percentage
 */
export function calcPct(done: number, total: number): number {
  if (!total || total <= 0) return 0;
  return Math.round((done / total) * 100);
}

/**
 * Clean initial state for everyday history (no static mock data)
 */
export function getDefaultHistorySeed(): DailyHistoryMap {
  return {};
}

/**
 * Checks if a log object contains legacy mock seed data
 */
export function isLegacyMockLog(log: unknown): boolean {
  if (!log || typeof log !== "object") return false;
  const str = JSON.stringify(log);
  return (
    str.includes("Complete Q4 priority planning") ||
    str.includes("Design system token review") ||
    str.includes("Deliverables implementation") ||
    str.includes("MongoDB indexing and query tuning") ||
    str.includes("Morning run & hydration") ||
    str.includes("Finalize quarterly objectives roadmap") ||
    str.includes("High energy day! Hit 80% completion") ||
    str.includes("yg-1") ||
    str.includes("fs-y1") ||
    str.includes("fs-2d1") ||
    str.includes("fs-3d1") ||
    str.includes("fs-4d1") ||
    str.includes("3dg-1") ||
    str.includes("4dg-1")
  );
}

/**
 * Strips legacy static mock logs and dates before today
 */
export function sanitizeHistoryLogs(
  history: DailyHistoryMap | null | undefined,
  options: { removePastDays?: boolean } = { removePastDays: true }
): DailyHistoryMap {
  if (!history || typeof history !== "object") return {};
  const todayKey = getTodayDateKey();
  const cleaned: DailyHistoryMap = {};

  for (const [dateKey, log] of Object.entries(history)) {
    if (!log || typeof log !== "object") continue;
    if (isLegacyMockLog(log)) continue;
    // When removePastDays is enabled, or if date is strictly before our launch date baseline, remove it
    if (options.removePastDays && dateKey < todayKey) continue;
    if (dateKey < "2026-10-17") continue;

    cleaned[dateKey] = log;
  }

  return cleaned;
}

