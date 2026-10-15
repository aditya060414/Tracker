import { useEffect, useState, useRef } from "react";

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

/**
 * Persisted state scoped to the user ID and automatically synced with MongoDB.
 * Works seamlessly for both authenticated users and guest sessions.
 */
export function useLocal<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  const activeUserIdRef = useRef<string | null>(null);

  const getScopedKey = (userId: string | null) => {
    // If authenticated user with a Mongo ID, use scoped key; otherwise use base key
    if (userId && !userId.startsWith("guest_")) {
      return `u_${userId}_${key}`;
    }
    return key;
  };

  useEffect(() => {
    const userId = getEffectiveUserId();
    activeUserIdRef.current = userId;
    const scopedKey = getScopedKey(userId);

    // 1. Read from localStorage first for fast hydration
    try {
      const raw = localStorage.getItem(scopedKey);
      if (raw !== null) {
        setValue(JSON.parse(raw));
      } else if (scopedKey !== key) {
        // Fallback to unscoped key if user just logged in or migrated
        const unscopedRaw = localStorage.getItem(key);
        if (unscopedRaw !== null) {
          setValue(JSON.parse(unscopedRaw));
        } else {
          setValue(initial);
        }
      } else {
        setValue(initial);
      }
    } catch {
      setValue(initial);
    }
    setReady(true);

    // 2. Fetch remote linked data from MongoDB
    if (userId) {
      fetch(`/api/tracker?userId=${encodeURIComponent(userId)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.success && data.data && key in data.data) {
            const remoteVal = data.data[key] as T;
            if (remoteVal !== undefined) {
              setValue(remoteVal);
              try {
                localStorage.setItem(scopedKey, JSON.stringify(remoteVal));
              } catch {}
            }
          }
        })
        .catch(() => {
          // Offline or network error; keep local value
        });
    }
  }, [key]);

  useEffect(() => {
    if (!ready) return;
    const userId = activeUserIdRef.current || getEffectiveUserId();
    const scopedKey = getScopedKey(userId);

    // Save locally
    try {
      localStorage.setItem(scopedKey, JSON.stringify(value));
    } catch {}

    // If we have a user ID (auth or guest), sync remotely in background to MongoDB
    if (!userId) {
      return undefined;
    }

    const timeout = setTimeout(() => {
      fetch("/api/tracker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, key, value }),
      }).catch(() => {
        // ignore background sync errors
      });
    }, 500);

    return () => clearTimeout(timeout);
  }, [key, value, ready]);

  return [value, setValue] as const;
}
