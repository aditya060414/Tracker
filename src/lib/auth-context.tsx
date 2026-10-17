import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { fetchAllUserTrackerData, syncAllLocalDataToMongo } from "./use-local";

export interface AuthUser {
  id: string; // The MongoDB generated _id
  name: string;
  email: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string; user?: AuthUser }>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: AuthUser }>;
  logout: () => void;
  syncWithDatabase: () => Promise<boolean>;
  mongoStatus: { connected: boolean; database?: string } | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = "lifeboard_auth_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mongoStatus, setMongoStatus] = useState<{ connected: boolean; database?: string } | null>(null);

  // Load existing session on hydration and fetch latest data from MongoDB
  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AuthUser;
        if (parsed?.id && parsed?.email) {
          setUser(parsed);

          // Fetch fresh account details and tracker items from database in background
          fetchAllUserTrackerData(parsed.id, true).then(() => {
            window.dispatchEvent(new CustomEvent("lifeboard_auth_changed", { detail: { userId: parsed.id } }));
          });
        }
      }
    } catch (e) {
      console.warn("Failed to restore auth session:", e);
    } finally {
      setIsLoading(false);
    }

    // Check MongoDB connection status
    fetch("/api/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.connected === "boolean") {
          setMongoStatus({ connected: data.connected, database: data.database });
        }
      })
      .catch(() => {
        setMongoStatus({ connected: false });
      });
  }, []);

  const signup = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        const errorMsg = data?.error || "Signup failed. Please try again.";
        toast.error(errorMsg);
        return { success: false, error: errorMsg };
      }

      const newUser: AuthUser = data.user;
      setUser(newUser);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
      localStorage.setItem("profile-name", newUser.name);

      // Save all existing local data into this new user account in MongoDB
      await syncAllLocalDataToMongo(newUser.id);

      // Migrate guest challenges
      const guestId = localStorage.getItem("lifeboard_guest_id");
      if (guestId && guestId !== newUser.id) {
        await fetch("/api/challenges/migrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guestId, authUserId: newUser.id }),
        }).catch(() => {});
      }

      // Notify all components of auth change
      window.dispatchEvent(new CustomEvent("lifeboard_auth_changed", { detail: { userId: newUser.id } }));

      toast.success(`Welcome to Lifeboard, ${newUser.name}!`, {
        description: "Your account was created and all tracker details are saved to MongoDB.",
      });

      return { success: true, user: newUser };
    } catch (err: any) {
      const errorMsg = err?.message || "Network error. Please try again.";
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        const errorMsg = data?.error || "Login failed. Please check your credentials.";
        toast.error(errorMsg);
        return { success: false, error: errorMsg };
      }

      const loggedUser: AuthUser = data.user;
      setUser(loggedUser);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(loggedUser));
      localStorage.setItem("profile-name", loggedUser.name);

      // 1. Fetch all details and history from database for this account
      const remoteData = await fetchAllUserTrackerData(loggedUser.id, true);

      // 2. If user had guest items that don't exist remotely, upload them
      const guestId = localStorage.getItem("lifeboard_guest_id");
      if (guestId && guestId !== loggedUser.id) {
        await fetch("/api/challenges/migrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guestId, authUserId: loggedUser.id }),
        }).catch(() => {});
        await syncAllLocalDataToMongo(loggedUser.id);
      }

      // 3. Notify all components of the account login
      window.dispatchEvent(new CustomEvent("lifeboard_auth_changed", { detail: { userId: loggedUser.id } }));

      const keysFoundCount = Object.keys(remoteData || {}).length;
      toast.success(`Welcome back, ${loggedUser.name}!`, {
        description: keysFoundCount > 0
          ? `Loaded ${keysFoundCount} tracked items and logs from database.`
          : `Signed in as ${loggedUser.email}. All tracker data is synced.`,
      });

      return { success: true, user: loggedUser };
    } catch (err: any) {
      const errorMsg = err?.message || "Network error. Please try again.";
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("lifeboard_auth_changed", { detail: { userId: null } }));
    toast.info("Signed out successfully.");
  };

  const syncWithDatabase = async () => {
    const currentUserId = user?.id || localStorage.getItem("lifeboard_guest_id");
    if (!currentUserId) return false;

    try {
      const uploadOk = await syncAllLocalDataToMongo(currentUserId);
      const remoteData = await fetchAllUserTrackerData(currentUserId, true);
      window.dispatchEvent(new CustomEvent("lifeboard_auth_changed", { detail: { userId: currentUserId } }));
      toast.success("Synchronized with MongoDB database!", {
        description: `${Object.keys(remoteData || {}).length} tracker items synced with cloud.`,
      });
      return uploadOk;
    } catch {
      toast.error("Failed to sync with database.");
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signup, login, logout, syncWithDatabase, mongoStatus }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
