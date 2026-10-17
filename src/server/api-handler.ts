import {
  createUser,
  authenticateUser,
  getUserById,
  getUserTrackerData,
  setUserTrackerItem,
  syncUserTrackerData,
  checkMongoStatus,
  saveCustomChallenge,
  getCustomChallenges,
  deleteCustomChallenge,
  saveActiveChallenge,
  getActiveChallenge,
  migrateGuestChallenges,
} from "../lib/mongodb";
import { sanitizeHistoryLogs } from "../lib/daily-history";


export async function handleApiRequest(req: Request): Promise<Response | null> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  if (!pathname.startsWith("/api/")) {
    return null;
  }

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    // 1. Health / status check
    if (pathname === "/api/status" && req.method === "GET") {
      const status = await checkMongoStatus();
      return new Response(JSON.stringify(status), { headers: corsHeaders });
    }

    // 2. Signup: asks name, then email and password
    if (pathname === "/api/auth/signup" && req.method === "POST") {
      const body = (await req.json()) as { name?: string; email?: string; password?: string };
      const { name, email, password } = body;
      if (!name || !email || !password) {
        return new Response(
          JSON.stringify({ success: false, error: "Name, email, and password are required." }),
          { headers: corsHeaders, status: 400 },
        );
      }
      const result = await createUser(name, email, password);
      return new Response(JSON.stringify(result), {
        headers: corsHeaders,
        status: result.success ? 201 : 400,
      });
    }

    // 3. Login: asks email and password
    if (pathname === "/api/auth/login" && req.method === "POST") {
      const body = (await req.json()) as { email?: string; password?: string };
      const { email, password } = body;
      if (!email || !password) {
        return new Response(
          JSON.stringify({ success: false, error: "Email and password are required." }),
          { headers: corsHeaders, status: 400 },
        );
      }
      const result = await authenticateUser(email, password);
      return new Response(JSON.stringify(result), {
        headers: corsHeaders,
        status: result.success ? 200 : 401,
      });
    }

    // 4. Current user details by Mongo ID
    if (pathname === "/api/auth/me" && req.method === "GET") {
      const userId = url.searchParams.get("userId");
      if (!userId) {
        return new Response(JSON.stringify({ error: "Missing userId" }), { headers: corsHeaders, status: 400 });
      }
      const user = await getUserById(userId);
      return new Response(JSON.stringify({ success: !!user, user }), { headers: corsHeaders });
    }

    // 5. Get user tracker data linked by MongoDB userId
    if (pathname === "/api/tracker" && req.method === "GET") {
      const userId = url.searchParams.get("userId");
      if (!userId) {
        return new Response(JSON.stringify({ error: "Missing userId" }), { headers: corsHeaders, status: 400 });
      }
      const data = await getUserTrackerData(userId);
      if (data && data["daily-history-logs"]) {
        data["daily-history-logs"] = sanitizeHistoryLogs(data["daily-history-logs"] as any, { removePastDays: true });
      }
      return new Response(JSON.stringify({ success: true, data }), { headers: corsHeaders });
    }

    // 6. Set user tracker item linked by MongoDB userId
    if (pathname === "/api/tracker" && req.method === "POST") {
      const body = (await req.json()) as { userId?: string; key?: string; value?: unknown };
      let { userId, key, value } = body;
      if (!userId || !key) {
        return new Response(JSON.stringify({ error: "userId and key are required" }), {
          headers: corsHeaders,
          status: 400,
        });
      }
      if (key === "daily-history-logs") {
        value = sanitizeHistoryLogs(value as any, { removePastDays: true });
      }
      const success = await setUserTrackerItem(userId, key, value);
      return new Response(JSON.stringify({ success }), { headers: corsHeaders });
    }

    // 7. Bulk sync tracker data linked by MongoDB userId
    if (pathname === "/api/tracker/sync" && req.method === "POST") {
      const body = (await req.json()) as { userId?: string; data?: Record<string, unknown> };
      const { userId, data } = body;
      if (!userId || !data) {
        return new Response(JSON.stringify({ error: "userId and data are required" }), {
          headers: corsHeaders,
          status: 400,
        });
      }
      if (data["daily-history-logs"]) {
        data["daily-history-logs"] = sanitizeHistoryLogs(data["daily-history-logs"] as any, { removePastDays: true });
      }
      const success = await syncUserTrackerData(userId, data);
      return new Response(JSON.stringify({ success }), { headers: corsHeaders });
    }

    // 8. Challenges - Fetch custom challenges and active progress from MongoDB
    if (pathname === "/api/challenges" && req.method === "GET") {
      const userId = url.searchParams.get("userId");
      if (!userId) {
        return new Response(JSON.stringify({ error: "Missing userId" }), { headers: corsHeaders, status: 400 });
      }
      const [customList, activeChallenge] = await Promise.all([
        getCustomChallenges(userId),
        getActiveChallenge(userId),
      ]);
      return new Response(JSON.stringify({ success: true, customList, activeChallenge }), { headers: corsHeaders });
    }

    // 9. Challenges - Save custom challenge to MongoDB 'challenges' collection
    if (pathname === "/api/challenges/custom" && req.method === "POST") {
      const body = (await req.json()) as { userId?: string; challenge?: any };
      const { userId, challenge } = body;
      if (!userId || !challenge || !challenge.name) {
        return new Response(JSON.stringify({ success: false, error: "userId and valid challenge are required" }), {
          headers: corsHeaders,
          status: 400,
        });
      }
      const result = await saveCustomChallenge(userId, challenge);
      return new Response(JSON.stringify(result), { headers: corsHeaders, status: result.success ? 200 : 500 });
    }

    // 10. Challenges - Delete custom challenge from MongoDB
    if (
      (pathname === "/api/challenges/custom/delete" || pathname === "/api/challenges/custom") &&
      (req.method === "POST" || req.method === "DELETE")
    ) {
      const body = (await req.json()) as { userId?: string; id?: string };
      const { userId, id } = body;
      if (!userId || !id) {
        return new Response(JSON.stringify({ success: false, error: "userId and challenge id are required" }), {
          headers: corsHeaders,
          status: 400,
        });
      }
      const success = await deleteCustomChallenge(userId, id);
      return new Response(JSON.stringify({ success }), { headers: corsHeaders });
    }

    // 11. Challenges - Save taken/active challenge and streak progress to MongoDB
    if (
      (pathname === "/api/challenges/take" || pathname === "/api/challenges/active") &&
      req.method === "POST"
    ) {
      const body = (await req.json()) as {
        userId?: string;
        activeName?: string;
        totalDays?: number;
        day?: number;
        streak?: number;
        checked?: string[];
        activeReqs?: string[];
        history?: any[];
      };
      const { userId, activeName, totalDays, day, streak, checked, activeReqs, history } = body;
      if (!userId || !activeName) {
        return new Response(JSON.stringify({ success: false, error: "userId and activeName are required" }), {
          headers: corsHeaders,
          status: 400,
        });
      }
      const success = await saveActiveChallenge(userId, {
        activeName,
        totalDays: totalDays ?? 30,
        day: day ?? 1,
        streak: streak ?? 0,
        checked: checked ?? [],
        activeReqs: activeReqs ?? [],
        history: history ?? [],
      });
      return new Response(JSON.stringify({ success }), { headers: corsHeaders });
    }

    // 12. Migrate guest challenge data to authenticated user
    if (pathname === "/api/challenges/migrate" && req.method === "POST") {
      const body = (await req.json()) as { guestId?: string; authUserId?: string };
      const { guestId, authUserId } = body;
      if (!guestId || !authUserId) {
        return new Response(JSON.stringify({ success: false, error: "guestId and authUserId are required" }), {
          headers: corsHeaders,
          status: 400,
        });
      }
      const success = await migrateGuestChallenges(guestId, authUserId);
      return new Response(JSON.stringify({ success }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: `Not found: ${pathname}` }), { headers: corsHeaders, status: 404 });
  } catch (err: any) {
    console.error("[API Handler] Error handling request:", err);
    return new Response(JSON.stringify({ error: err?.message || "Internal server error" }), {
      headers: corsHeaders,
      status: 500,
    });
  }
}
