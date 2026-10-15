import { describe, it, expect, afterAll } from "vitest";
import { handleApiRequest } from "@/server/api-handler";
import { getTrackerDb, getChallengesCollection } from "@/lib/mongodb";

describe("Challenges MongoDB Integration", { timeout: 20000 }, () => {
  const testUserId = "vitest_user_challenges_999";

  afterAll(async () => {
    try {
      const db = await getTrackerDb();
      await db.collection("challenges").deleteMany({ userId: testUserId });
      await db.collection("tracker").deleteMany({ userId: testUserId });
    } catch {}
  });

  it("saves a custom challenge into MongoDB challenges collection", async () => {
    const payload = {
      userId: testUserId,
      challenge: {
        id: "cust_vitest_123",
        name: "30-Day Beast Mode",
        days: 30,
        level: "Hard",
        reqs: ["Drink 3L Water", "100 Pushups", "Read 15 Pages"],
        createdAt: new Date().toISOString(),
      },
    };

    const req = new Request("http://localhost:8080/api/challenges/custom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const res = await handleApiRequest(req);
    expect(res).not.toBeNull();
    expect(res?.status).toBe(200);

    const data = await res?.json();
    expect(data.success).toBe(true);
    expect(data.challenge.name).toBe("30-Day Beast Mode");
    expect(data.challenge.days).toBe(30);

    // Verify in MongoDB challenges collection
    const col = await getChallengesCollection();
    const doc = await col.findOne({ userId: testUserId, id: "cust_vitest_123", type: "custom" });
    expect(doc).not.toBeNull();
    expect(doc?.name).toBe("30-Day Beast Mode");
    expect(doc?.reqs).toContain("100 Pushups");
  });

  it("saves active challenge progress and streak into MongoDB", async () => {
    const payload = {
      userId: testUserId,
      activeName: "30-Day Beast Mode",
      totalDays: 30,
      day: 3,
      streak: 3,
      checked: ["Drink 3L Water", "100 Pushups"],
      activeReqs: ["Drink 3L Water", "100 Pushups", "Read 15 Pages"],
      history: [{ name: "75 Hard · Day 12/75", status: "Paused" }],
    };

    const req = new Request("http://localhost:8080/api/challenges/take", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const res = await handleApiRequest(req);
    expect(res?.status).toBe(200);

    const data = await res?.json();
    expect(data.success).toBe(true);

    // Verify active progress document in challenges collection
    const col = await getChallengesCollection();
    const doc = await col.findOne({ userId: testUserId, type: "active_progress" });
    expect(doc).not.toBeNull();
    expect(doc?.activeName).toBe("30-Day Beast Mode");
    expect(doc?.day).toBe(3);
    expect(doc?.streak).toBe(3);
    expect(doc?.checked).toContain("100 Pushups");
  });

  it("fetches both custom challenges and active progress via GET /api/challenges", async () => {
    const req = new Request(`http://localhost:8080/api/challenges?userId=${testUserId}`, {
      method: "GET",
    });

    const res = await handleApiRequest(req);
    expect(res?.status).toBe(200);

    const data = await res?.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.customList)).toBe(true);
    expect(data.customList.length).toBeGreaterThan(0);
    expect(data.customList[0].name).toBe("30-Day Beast Mode");

    expect(data.activeChallenge).not.toBeNull();
    expect(data.activeChallenge.activeName).toBe("30-Day Beast Mode");
    expect(data.activeChallenge.day).toBe(3);
  });

  it("deletes a custom challenge from MongoDB", async () => {
    const req = new Request("http://localhost:8080/api/challenges/custom/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: testUserId, id: "cust_vitest_123" }),
    });

    const res = await handleApiRequest(req);
    expect(res?.status).toBe(200);

    const data = await res?.json();
    expect(data.success).toBe(true);

    // Verify deletion in MongoDB
    const col = await getChallengesCollection();
    const doc = await col.findOne({ userId: testUserId, id: "cust_vitest_123", type: "custom" });
    expect(doc).toBeNull();
  });
});
