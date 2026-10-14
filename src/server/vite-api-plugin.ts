import type { Plugin } from "vite";
import { handleApiRequest } from "./api-handler";

export function apiDevServerPlugin(): Plugin {
  return {
    name: "lifeboard-api-server",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith("/api/")) {
          return next();
        }

        try {
          const protocol = req.headers["x-forwarded-proto"] || "http";
          const host = req.headers.host || "localhost:8080";
          const fullUrl = new URL(req.url, `${protocol}://${host}`);

          const headers = new Headers();
          for (const [key, val] of Object.entries(req.headers)) {
            if (val) {
              if (Array.isArray(val)) {
                val.forEach((v) => headers.append(key, v));
              } else {
                headers.set(key, val);
              }
            }
          }

          let body: Buffer | undefined;
          if (req.method !== "GET" && req.method !== "HEAD") {
            const chunks: Buffer[] = [];
            for await (const chunk of req) {
              chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
            }
            body = Buffer.concat(chunks);
          }

          const requestInit: RequestInit = {
            method: req.method || "GET",
            headers,
          };
          if (body && body.length > 0) {
            requestInit.body = new Uint8Array(body);
          }

          const webReq = new Request(fullUrl.toString(), requestInit);

          const webRes = await handleApiRequest(webReq);
          if (webRes) {
            res.statusCode = webRes.status;
            webRes.headers.forEach((val, key) => res.setHeader(key, val));
            const resBody = await webRes.text();
            res.end(resBody);
            return;
          }
          next();
        } catch (err: any) {
          if (err?.message === "aborted" || err?.name === "AbortError" || err?.code === "ECONNRESET") {
            return;
          }
          console.error("[Vite API Plugin] Error:", err);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: err?.message || "Internal server error" }));
          }
        }
      });
    },
  };
}
