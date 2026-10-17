import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch {
      // Fallback if randomUUID fails or context is restricted
    }
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Safely polyfill window.crypto.randomUUID if missing in browser context
if (typeof window !== "undefined") {
  try {
    if (!window.crypto) {
      (window as unknown as { crypto: unknown }).crypto = {};
    }
    if (typeof window.crypto.randomUUID !== "function") {
      Object.defineProperty(window.crypto, "randomUUID", {
        value: generateId,
        writable: true,
        configurable: true,
      });
    }
  } catch {
    // Ignore if window.crypto is non-configurable
  }
}

