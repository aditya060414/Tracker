import {
  createUser,
  authenticateUser,
  getUserById,
  getUserTrackerData,
  setUserTrackerItem,
  syncUserTrackerData,
  checkMongoStatus,
} from "../lib/mongodb";

export async function handleApiRequest(req: Request): Promise<Response | null> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  if (!pathname.startsWith("/api/")) {
    return null;
  }

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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
      return new Response(JSON.stringify({ success: true, data }), { headers: corsHeaders });
    }

    // 6. Set user tracker item linked by MongoDB userId
    if (pathname === "/api/tracker" && req.method === "POST") {
      const body = (await req.json()) as { userId?: string; key?: string; value?: unknown };
      const { userId, key, value } = body;
      if (!userId || !key) {
        return new Response(JSON.stringify({ error: "userId and key are required" }), {
          headers: corsHeaders,
          status: 400,
        });
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
      const success = await syncUserTrackerData(userId, data);
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
