import { describe, it, expect } from "vitest";
import {
  formatDateKey,
  parseDateKey,
  getOffsetDateKey,
  getTodayDateKey,
  getYesterdayDateKey,
  isToday,
  isYesterday,
  formatFriendlyDate,
  calcPct,
  getDefaultHistorySeed,
  isLegacyMockLog,
  sanitizeHistoryLogs,
  type DailyLog,
} from "@/lib/daily-history";

describe("Daily History and Everyday Logs System", () => {
  it("correctly formats and parses date keys in YYYY-MM-DD", () => {
    const fixedDate = new Date(2026, 9, 17); // Oct 17, 2026
    const key = formatDateKey(fixedDate);
    expect(key).toBe("2026-10-17");

    const parsed = parseDateKey(key);
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(9);
    expect(parsed.getDate()).toBe(17);
  });

  it("calculates offset days accurately for yesterday and previous days", () => {
    const today = "2026-10-17";
    const yesterday = getOffsetDateKey(today, -1);
    expect(yesterday).toBe("2026-10-16");

    const twoDaysAgo = getOffsetDateKey(today, -2);
    expect(twoDaysAgo).toBe("2026-10-15");

    const tomorrow = getOffsetDateKey(today, 1);
    expect(tomorrow).toBe("2026-10-18");
  });

  it("detects today and yesterday accurately", () => {
    const todayKey = getTodayDateKey();
    const yesterdayKey = getYesterdayDateKey();

    expect(isToday(todayKey)).toBe(true);
    expect(isToday(yesterdayKey)).toBe(false);

    expect(isYesterday(yesterdayKey)).toBe(true);
    expect(isYesterday(todayKey)).toBe(false);

    expect(formatFriendlyDate(todayKey)).toBe("Today");
    expect(formatFriendlyDate(yesterdayKey)).toBe("Yesterday");
  });

  it("calculates completion percentages correctly", () => {
    expect(calcPct(0, 0)).toBe(0);
    expect(calcPct(3, 5)).toBe(60);
    expect(calcPct(4, 5)).toBe(80);
    expect(calcPct(5, 5)).toBe(100);
  });

  it("starts history cleanly with empty map without static seed mock data", () => {
    const seed = getDefaultHistorySeed();
    expect(seed).toEqual({});
    expect(Object.keys(seed).length).toBe(0);
  });

  it("identifies legacy mock logs with isLegacyMockLog", () => {
    const mockLog = {
      goals: [{ text: "Complete Q4 priority planning", done: true }],
      notes: "High energy day! Hit 80% completion and crossed 90 minutes of deep focus.",
    };
    expect(isLegacyMockLog(mockLog)).toBe(true);

    const realUserLog = {
      goals: [{ text: "Work on BisonMooves", done: false }],
      notes: "Focused on daily execution and core milestones.",
    };
    expect(isLegacyMockLog(realUserLog)).toBe(false);
  });

  it("sanitizes history map by purging mock entries and previous days to start fresh from today", () => {
    const todayKey = getTodayDateKey();
    const yesterdayKey = getYesterdayDateKey();

    const dirtyHistory: Record<string, any> = {
      [yesterdayKey]: {
        date: yesterdayKey,
        goals: [{ id: "yg-1", text: "Complete Q4 priority planning", done: true }],
        notes: "High energy day! Hit 80% completion",
      },
      "2026-10-15": {
        date: "2026-10-15",
        goals: [{ id: "2dg-1", text: "Deliverables implementation", done: true }],
      },
      [todayKey]: {
        date: todayKey,
        goals: [{ id: "u1", text: "Real goal for today", done: false }],
        notes: "Real today progress",
      },
    };

    const sanitized = sanitizeHistoryLogs(dirtyHistory, { removePastDays: true });
    expect(Object.keys(sanitized)).toEqual([todayKey]);
    expect(sanitized[yesterdayKey]).toBeUndefined();
    expect(sanitized["2026-10-15"]).toBeUndefined();
    expect(sanitized[todayKey].goals[0].text).toBe("Real goal for today");
  });

  it("allows archiving and updating past logs with retrospective goals", () => {
    const historyMap: Record<string, DailyLog> = {};
    const dateKey = "2026-10-18";

    const log: DailyLog = {
      date: dateKey,
      updatedAt: Date.now(),
      goals: [
        { id: "p1", text: "Ship architecture review", done: true },
        { id: "p2", text: "Complete cardio 45m", done: true },
      ],
      goalsDone: 2,
      goalsTotal: 2,
      completionPct: 100,
      focusMinutes: 75,
      focusSessions: [{ id: "f1", name: "Architecture", minutes: 75 }],
      notes: "100% completion day",
    };

    historyMap[dateKey] = log;

    expect(historyMap[dateKey]).toBeDefined();
    expect(historyMap[dateKey].completionPct).toBe(100);
    expect(historyMap[dateKey].goalsDone).toBe(2);
    expect(historyMap[dateKey].notes).toBe("100% completion day");
  });
});

