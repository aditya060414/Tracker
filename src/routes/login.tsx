import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { User, Mail, Lock, Eye, EyeOff, ArrowRight, Database, CheckCircle2, ShieldCheck, LogIn, UserPlus } from "lucide-react";
import { Panel, SectionHeader, Tag } from "@/components/common/ui";
import { useAuth } from "@/lib/auth-context";
import { pageHead } from "@/lib/meta";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/common/Logo";

export const Route = createFileRoute("/login")({
  head: pageHead("Sign In / Sign Up", "Access your personal Lifeboard tracker."),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, signup, login, logout, isLoading, mongoStatus, syncWithDatabase } = useAuth();

  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsSubmitting(true);

    if (mode === "signup") {
      if (!name.trim()) {
        setErrorMsg("Please enter your name.");
        setIsSubmitting(false);
        return;
      }
      if (!email.trim() || !email.includes("@")) {
        setErrorMsg("Please enter a valid email address.");
        setIsSubmitting(false);
        return;
      }
      if (password.length < 6) {
        setErrorMsg("Password must be at least 6 characters.");
        setIsSubmitting(false);
        return;
      }

      const res = await signup(name.trim(), email.trim(), password);
      setIsSubmitting(false);
      if (res.success) {
        navigate({ to: "/" });
      } else if (res.error) {
        setErrorMsg(res.error);
      }
    } else {
      if (!email.trim() || !password) {
        setErrorMsg("Please enter both email and password.");
        setIsSubmitting(false);
        return;
      }

      const res = await login(email.trim(), password);
      setIsSubmitting(false);
      if (res.success) {
        navigate({ to: "/" });
      } else if (res.error) {
        setErrorMsg(res.error);
      }
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-140px)] max-w-lg flex-col justify-center py-6">
      {/* Brand Header */}
      <div className="mb-6 text-center">
        <Logo size={48} className="mx-auto mb-3" />
        <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
          {mode === "signup" ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {mode === "signup"
            ? "Sign up with your name, email, and password to create your personal tracker."
            : "Sign in with your email and password to access your personal tracker."}
        </p>

        {/* Sync Status Pill */}
        <div className="mt-3 flex items-center justify-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border",
              mongoStatus?.connected
                ? "border-success/30 bg-success/10 text-success"
                : "border-warning/30 bg-warning/10 text-warning",
            )}
          >
            <span className={cn("size-2 rounded-full", mongoStatus?.connected ? "bg-success" : "bg-warning animate-pulse")} />
            {mongoStatus?.connected ? "Cloud Sync: Active" : "Connecting to Cloud..."}
          </span>
        </div>
      </div>

      {/* Already logged in state */}
      {user ? (
        <Panel className="relative overflow-hidden border-primary/40 bg-card p-6 shadow-xl">
          <div className="bg-gradient-challenge absolute inset-x-0 top-0 h-1.5" />
          <div className="text-center">
            <span className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-success/15 text-success">
              <CheckCircle2 className="size-6" />
            </span>
            <h2 className="text-lg font-semibold">You are currently signed in</h2>
            <p className="mt-1 font-medium text-foreground">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>

            <div className="my-4 rounded-xl border bg-elevated/60 p-3 text-left">
              <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Unique Account ID:
              </p>
              <p className="mt-1 font-mono text-xs font-semibold text-primary break-all select-all">
                {user.id}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                All your goals, habits, work tasks, and financial records are securely linked directly to this account.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => navigate({ to: "/" })}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-primary font-medium text-primary-foreground hover:bg-primary-hover"
              >
                Go to Dashboard <ArrowRight className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => syncWithDatabase()}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-[10px] border border-primary/40 bg-accent/30 text-xs font-semibold text-primary hover:bg-accent transition-colors"
              >
                <Database className="size-3.5" /> Sync All Data with Database
              </button>
              <button
                onClick={logout}
                className="h-10 w-full rounded-[10px] border text-xs font-medium text-muted-foreground hover:bg-elevated hover:text-foreground"
              >
                Sign out / Switch account
              </button>
            </div>
          </div>
        </Panel>
      ) : (
        /* Auth Form Card */
        <Panel className="border-border bg-card p-6 shadow-xl">
          {/* Mode Switcher Tabs */}
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-elevated p-1">
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setErrorMsg("");
              }}
              className={cn(
                "flex h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-medium transition-all",
                mode === "signup" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <UserPlus className="size-3.5" /> Sign Up
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setErrorMsg("");
              }}
              className={cn(
                "flex h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-medium transition-all",
                mode === "login" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <LogIn className="size-3.5" /> Sign In
            </button>
          </div>

          {errorMsg && (
            <div className="mb-4 rounded-lg border border-danger/40 bg-danger/10 p-3 text-xs text-danger">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. Name input (Signup only) */}
            {mode === "signup" && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Your Full Name <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <User className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                    className="h-11 w-full rounded-[10px] border bg-background pr-3 pl-10 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>
            )}

            {/* 2. Email input */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Email Address <span className="text-danger">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="h-11 w-full rounded-[10px] border bg-background pr-3 pl-10 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>

            {/* 3. Password input */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground">
                  Password <span className="text-danger">*</span>
                </label>
                {mode === "signup" && (
                  <span className="text-[11px] text-muted-foreground">Min. 6 characters</span>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "signup" ? "Create a strong password" : "Enter your password"}
                  required
                  className="h-11 w-full rounded-[10px] border bg-background pr-10 pl-10 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-primary font-medium text-primary-foreground shadow-md transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Connecting...</span>
              ) : mode === "signup" ? (
                <>
                  Create Account <ArrowRight className="size-4" />
                </>
              ) : (
                <>
                  Sign In <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle footer */}
          <div className="mt-5 border-t pt-4 text-center text-xs text-muted-foreground">
            {mode === "signup" ? (
              <p>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setErrorMsg("");
                  }}
                  className="font-medium text-primary hover:underline"
                >
                  Sign in
                </button>
              </p>
            ) : (
              <p>
                Don't have an account yet?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setErrorMsg("");
                  }}
                  className="font-medium text-primary hover:underline"
                >
                  Create one now
                </button>
              </p>
            )}
          </div>
        </Panel>
      )}

      {/* Feature notice */}
      <div className="mt-6 flex items-center justify-center gap-3 text-center text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <ShieldCheck className="size-3.5 text-success" /> Encrypted Credentials
        </span>
        <span>•</span>
        <span className="flex items-center gap-1">
          <CheckCircle2 className="size-3.5 text-primary" /> Private Data Isolation
        </span>
      </div>
    </div>
  );
}
