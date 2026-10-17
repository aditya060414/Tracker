import { useEffect, useState, useRef } from "react";
import { sanitizeHistoryLogs } from "./daily-history";

/**
 * Returns the effective user identifier for MongoDB sync.
 * If logged in, returns the authenticated MongoDB user ID.
 * If not logged in, returns or generates a persistent device guest ID.
 */
export function getEffectiveUserId(): string {
  if (typeof window === "undefined" || !window.localStorage) return "guest_user";
  try {
    const raw = localStorage.getItem("lifeboard_auth_user");
    if (raw) {
      const u = JSON.parse(raw);
      if (u?.id) return u.id;
    }
  } catch {}

  let guestId = localStorage.getItem("lifeboard_guest_id");
  if (!guestId) {
    guestId = "guest_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now().toString(36);
    try {
      localStorage.setItem("lifeboard_guest_id", guestId);
    } catch {}
  }
  return guestId;
}

export function getScopedKey(userId: string | null, key: string): string {
  if (userId && !userId.startsWith("guest_")) {
    return `u_${userId}_${key}`;
  }
  return key;
}

// Module-level deduplication cache
let cachedUserData: Record<string, unknown> | null = null;
let cachedForUserId: string | null = null;
let inFlightPromise: Promise<Record<string, unknown>> | null = null;

/**
 * Fetch all tracker details for a user from MongoDB.
 * Deduplicates in-flight requests so all components sharing a page reuse a single network call.
 */
export async function fetchAllUserTrackerData(userId: string, force = false): Promise<Record<string, unknown>> {
  if (typeof window === "undefined") return {};
  if (!userId) return {};

  if (!force && cachedUserData && cachedForUserId === userId) {
    return cachedUserData;
  }

  if (inFlightPromise && !force && cachedForUserId === userId) {
    return inFlightPromise;
  }

  cachedForUserId = userId;
  inFlightPromise = fetch(`/api/tracker?userId=${encodeURIComponent(userId)}`)
    .then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data?.success && data.data) {
        cachedUserData = data.data;

        // Populate localStorage with all remote keys for instant hydration
        try {
          for (let [k, v] of Object.entries(data.data)) {
            if (k === "daily-history-logs") {
              v = sanitizeHistoryLogs(v as any, { removePastDays: true });
              data.data[k] = v;
            }
            const scopedKey = getScopedKey(userId, k);
            localStorage.setItem(scopedKey, JSON.stringify(v));
            localStorage.setItem(k, JSON.stringify(v));
          }
        } catch {}

        return data.data as Record<string, unknown>;
      }
      return {};
    })
    .catch((err) => {
      console.warn("[MongoDB Sync] Could not fetch tracker data:", err);
      return cachedUserData || {};
    })
    .finally(() => {
      inFlightPromise = null;
    });

  return inFlightPromise;
}

/**
 * Upload all current local tracker data to MongoDB for the user.
 */
export async function syncAllLocalDataToMongo(userId?: string): Promise<boolean> {
  if (typeof window === "undefined" || !window.localStorage) return false;
  const targetUserId = userId || getEffectiveUserId();
  if (!targetUserId) return false;

  const allKnownKeys = [
    "goals",
    "daily-history-logs",
    "budget",
    "transactions",
    "work-tasks",
    "work-projects",
    "work-focus-sessions",
    "special-task",
    "profile-name",
    "gym-exercises",
    "gym-done",
    "gym-trained-days",
    "gym-prs",
    "water",
    "habits",
    "wellness-note",
    "health-steps",
    "health-sleep",
    "ideas",
    "sched-overdue",
    "sched-upcoming",
    "sched-events",
    "planning-objectives",
    "planning-outcomes",
    "planning-matrix",
    "planning-milestones",
    "planning-reflection",
    "planning-today-plan",
    "notif",
    "challenge-name",
    "challenge-day",
    "challenge-total-days",
    "challenge-streak",
    "challenge-checked",
    "challenge-active-reqs",
    "challenge-history",
    "challenge-custom-list",
  ];

  const payload: Record<string, unknown> = {};
  for (const k of allKnownKeys) {
    const scopedKey = getScopedKey(targetUserId, k);
    let raw = localStorage.getItem(scopedKey);
    if (raw === null && scopedKey !== k) {
      raw = localStorage.getItem(k);
    }
    if (raw !== null) {
      try {
        payload[k] = JSON.parse(raw);
      } catch {
        payload[k] = raw;
      }
    }
  }

  if (Object.keys(payload).length === 0) return true;

  try {
    const res = await fetch("/api/tracker/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: targetUserId, data: payload }),
    });
    return res.ok;
  } catch (err) {
    console.error("[MongoDB Sync] Error syncing local data to MongoDB:", err);
    return false;
  }
}

/**
 * Persisted state scoped to the user ID and automatically synced with MongoDB.
 * Safeguards against overwriting database data with blank defaults on fresh logins.
 */
export function useLocal<T>(key: string, initial: T) {
  const [value, setValueState] = useState<T>(initial);
  const isDirtyRef = useRef(false);
  const remoteFetchedRef = useRef(false);
  const activeUserIdRef = useRef<string>(getEffectiveUserId());

  // Custom setter that marks dirty state so only actual user edits are saved
  const setValue = (newValOrFn: T | ((prev: T) => T)) => {
    isDirtyRef.current = true;
    setValueState((prev) => {
      const resolved = typeof newValOrFn === "function" ? (newValOrFn as (p: T) => T)(prev) : newValOrFn;
      return resolved;
    });
  };

  const hydrateState = (userId: string) => {
    activeUserIdRef.current = userId;
    const scopedKey = getScopedKey(userId, key);

    // 1. Read from localStorage first for instant render
    let localFound = false;
    try {
      const raw = localStorage.getItem(scopedKey);
      if (raw !== null) {
        setValueState(JSON.parse(raw));
        localFound = true;
      } else if (scopedKey !== key) {
        const unscopedRaw = localStorage.getItem(key);
        if (unscopedRaw !== null) {
          setValueState(JSON.parse(unscopedRaw));
          localFound = true;
        }
      }
    } catch {}

    // 2. Fetch remote linked data from MongoDB
    if (userId) {
      fetchAllUserTrackerData(userId)
        .then((data) => {
          if (data && key in data) {
            const remoteVal = data[key] as T;
            if (remoteVal !== undefined) {
              setValueState(remoteVal);
              try {
                localStorage.setItem(scopedKey, JSON.stringify(remoteVal));
                localStorage.setItem(key, JSON.stringify(remoteVal));
              } catch {}
            }
          } else if (localFound) {
            // Key does not exist in DB yet, but user has local data; upload it
            try {
              const currentRaw = localStorage.getItem(scopedKey) || localStorage.getItem(key);
              if (currentRaw) {
                const parsedVal = JSON.parse(currentRaw);
                fetch("/api/tracker", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ userId, key, value: parsedVal }),
                }).catch(() => {});
              }
            } catch {}
          }
        })
        .finally(() => {
          remoteFetchedRef.current = true;
        });
    } else {
      remoteFetchedRef.current = true;
    }
  };

  // Initial mount
  useEffect(() => {
    const userId = getEffectiveUserId();
    hydrateState(userId);

    // Listen for auth/account changes to re-hydrate from database
    const handleAuthChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ userId?: string }>;
      const newUserId = customEvent.detail?.userId || getEffectiveUserId();
      isDirtyRef.current = false;
      remoteFetchedRef.current = false;
      hydrateState(newUserId);
    };

    window.addEventListener("lifeboard_auth_changed", handleAuthChange);
    return () => {
      window.removeEventListener("lifeboard_auth_changed", handleAuthChange);
    };
  }, [key]);

  // Persist to localStorage and MongoDB on changes
  useEffect(() => {
    const userId = activeUserIdRef.current || getEffectiveUserId();
    const scopedKey = getScopedKey(userId, key);

    // Always update localStorage
    try {
      localStorage.setItem(scopedKey, JSON.stringify(value));
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}

    // Prevent clobbering existing DB data before the initial remote read has resolved
    if (!remoteFetchedRef.current && !isDirtyRef.current) {
      return undefined;
    }

    if (!userId) return undefined;

    // Debounced remote save to MongoDB
    const timeout = setTimeout(() => {
      fetch("/api/tracker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, key, value }),
      })
        .then(() => {
          // Update cache
          if (cachedUserData && cachedForUserId === userId) {
            cachedUserData[key] = value;
          }
        })
        .catch(() => {});
    }, 400);

    return () => clearTimeout(timeout);
  }, [key, value]);

  return [value, setValue] as const;
}
