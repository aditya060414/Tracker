import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

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
  mongoStatus: { connected: boolean; database?: string } | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = "lifeboard_auth_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mongoStatus, setMongoStatus] = useState<{ connected: boolean; database?: string } | null>(null);

  // Load existing session on hydration
  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AuthUser;
        if (parsed?.id && parsed?.email) {
          setUser(parsed);
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

      // Migrate any guest challenges/data to this authenticated user account
      const guestId = localStorage.getItem("lifeboard_guest_id");
      if (guestId && guestId !== newUser.id) {
        fetch("/api/challenges/migrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guestId, authUserId: newUser.id }),
        }).catch(() => {});
      }

      toast.success(`Welcome to Lifeboard, ${newUser.name}!`, {
        description: "Your account has been created and synced successfully.",
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

      // Migrate any guest challenges/data to this authenticated user account
      const guestId = localStorage.getItem("lifeboard_guest_id");
      if (guestId && guestId !== loggedUser.id) {
        fetch("/api/challenges/migrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guestId, authUserId: loggedUser.id }),
        }).catch(() => {});
      }

      toast.success(`Welcome back, ${loggedUser.name}!`, {
        description: `Signed in as ${loggedUser.email}`,
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
    toast.info("Logged out successfully.");
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signup, login, logout, mongoStatus }}>
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
