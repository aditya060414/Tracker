import { describe, it, expect, beforeAll } from "vitest";
import {
  setUserTrackerItem,
  getUserTrackerData,
  syncUserTrackerData,
  createUser,
  authenticateUser,
  getTrackerCollection,
} from "@/lib/mongodb";

describe("Database Complete Save and Fetch Integration", () => {
  const testUserId = `test_account_${Date.now()}`;
  const testEmail = `test_${Date.now()}@lifeboard.local`;
  const testPassword = "securePassword123";

  it("creates an account in the database and retrieves account details", async () => {
    const signupRes = await createUser("Aditya", testEmail, testPassword);
    expect(signupRes.success).toBe(true);
    expect(signupRes.user?.id).toBeDefined();
    expect(signupRes.user?.email).toBe(testEmail);

    // Verify authentication succeeds
    const loginRes = await authenticateUser(testEmail, testPassword);
    expect(loginRes.success).toBe(true);
    expect(loginRes.user?.id).toBe(signupRes.user?.id);
  });

  it("saves individual tracker items (goals, everyday history, gym, work) in MongoDB", { timeout: 25000 }, async () => {
    // 1. Save goals
    const goals = [
      { id: "g1", text: "Morning run", done: true, time: "07:00" },
      { id: "g2", text: "Architecture review", done: false, time: "11:00" },
    ];
    const saveGoalRes = await setUserTrackerItem(testUserId, "goals", goals);
    expect(saveGoalRes).toBe(true);

    // 2. Save daily history log
    const dailyHistory = {
      "2026-10-17": {
        date: "2026-10-17",
        updatedAt: Date.now(),
        goals,
        goalsDone: 1,
        goalsTotal: 2,
        completionPct: 50,
        focusMinutes: 90,
        focusSessions: [{ id: "fs1", name: "Deep Work", minutes: 90 }],
        notes: "Solid momentum today",
      },
    };
    const saveHistoryRes = await setUserTrackerItem(testUserId, "daily-history-logs", dailyHistory);
    expect(saveHistoryRes).toBe(true);

    // 3. Save work tasks & budget
    await setUserTrackerItem(testUserId, "budget", 5000);
    await setUserTrackerItem(testUserId, "work-tasks", [
      { id: "wt1", title: "Review PR", priority: "high", due: "Today", done: true },
    ]);

    // 4. Fetch details from DB and verify exact matches
    const fetchedData = await getUserTrackerData(testUserId);
    expect(fetchedData).toBeDefined();
    expect(fetchedData["goals"]).toEqual(goals);
    expect(fetchedData["daily-history-logs"]).toEqual(dailyHistory);
    expect(fetchedData["budget"]).toBe(5000);
    expect((fetchedData["work-tasks"] as any[])[0]?.title).toBe("Review PR");
  });

  it("bulk syncs all tracker state to MongoDB and retrieves it completely", { timeout: 25000 }, async () => {
    const completeTrackerState = {
      "goals": [{ id: "bg1", text: "Bulk goal", done: true }],
      "budget": 3500,
      "transactions": [{ id: "tx1", name: "Groceries", cat: "Food", amount: -400, date: "2026-10-17" }],
      "gym-exercises": [{ id: "ge1", name: "Bench press", sets: 3, reps: 10, weight: 80 }],
      "health-sleep": [{ d: "Mon", h: 8 }],
      "challenge-name": "75 Days of Discipline",
      "challenge-day": 15,
      "challenge-streak": 15,
      "profile-name": "Aditya Singh",
      "special-task": { title: "Deploy to production", done: true },
    };

    const syncOk = await syncUserTrackerData(testUserId, completeTrackerState);
    expect(syncOk).toBe(true);

    // Fetch details from MongoDB
    const dataFromDb = await getUserTrackerData(testUserId);
    expect(dataFromDb["challenge-day"]).toBe(15);
    expect(dataFromDb["challenge-streak"]).toBe(15);
    expect(dataFromDb["profile-name"]).toBe("Aditya Singh");
    expect((dataFromDb["transactions"] as any[])[0]?.amount).toBe(-400);
    expect((dataFromDb["gym-exercises"] as any[])[0]?.name).toBe("Bench press");
    expect((dataFromDb["special-task"] as any)?.title).toBe("Deploy to production");
  });

  it("guarantees isolation: User A cannot see User B's tracker data", { timeout: 25000 }, async () => {
    const userA = `user_A_${Date.now()}`;
    const userB = `user_B_${Date.now()}`;

    await setUserTrackerItem(userA, "budget", 10000);
    await setUserTrackerItem(userB, "budget", 2000);

    const dataA = await getUserTrackerData(userA);
    const dataB = await getUserTrackerData(userB);

    expect(dataA["budget"]).toBe(10000);
    expect(dataB["budget"]).toBe(2000);
    expect(dataA["budget"]).not.toBe(dataB["budget"]);
  });
});
