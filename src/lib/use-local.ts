import { useEffect, useState, useRef } from "react";

/**
 * Persisted state scoped to the authenticated user's MongoDB ID.
 * Automatically links data to the Mongo user ID and syncs with the MongoDB backend.
 */
export function useLocal<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  const activeUserIdRef = useRef<string | null>(null);

  // Helper to get current MongoDB user ID if logged in
  const getUserId = (): string | null => {
    if (typeof window === "undefined" || !window.localStorage) return null;
    try {
      const raw = localStorage.getItem("lifeboard_auth_user");
      if (raw) {
        const u = JSON.parse(raw);
        return u?.id || null;
      }
    } catch {}
    return null;
  };

  const getScopedKey = (userId: string | null) => {
    return userId ? `u_${userId}_${key}` : key;
  };

  useEffect(() => {
    const userId = getUserId();
    activeUserIdRef.current = userId;
    const scopedKey = getScopedKey(userId);

    // 1. Read from localStorage first for fast hydration
    try {
      const raw = localStorage.getItem(scopedKey);
      if (raw !== null) {
        setValue(JSON.parse(raw));
      } else {
        setValue(initial);
      }
    } catch {
      setValue(initial);
    }
    setReady(true);

    // 2. If logged in with MongoDB ID, also fetch remote linked data
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
    const userId = activeUserIdRef.current || getUserId();
    const scopedKey = getScopedKey(userId);

    // Save locally
    try {
      localStorage.setItem(scopedKey, JSON.stringify(value));
    } catch {}

    // If linked to MongoDB ID, sync remotely in background
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
