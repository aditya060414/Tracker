import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export function Logo({ className, size = 32, showText = false }: LogoProps) {
  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-200 hover:scale-105"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="logo-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4F46E5" />
            <stop offset="50%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
          <linearGradient id="logo-star" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
          <filter id="logo-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#0f172a" floodOpacity="0.35" />
          </filter>
        </defs>

        {/* Base Squircle */}
        <rect width="64" height="64" rx="16" fill="url(#logo-bg)" />
        <rect
          x="0.75"
          y="0.75"
          width="62.5"
          height="62.5"
          rx="15.25"
          stroke="white"
          strokeOpacity="0.25"
          fill="none"
        />

        {/* Modern Bold "L" */}
        <path
          d="M16 14C16 11.7909 17.7909 10 20 10H25C26.6569 10 28 11.3431 28 13V38C28 39.1046 28.8954 40 30 40H47C48.6569 40 50 41.3431 50 43V48C50 50.2091 48.2091 52 46 52H20C17.7909 52 16 50.2091 16 48V14Z"
          fill="white"
          filter="url(#logo-shadow)"
        />

        {/* Milestone North Star */}
        <path
          d="M44 10C44 17 48.5 21 55.5 21C48.5 21 44 25 44 32C44 25 39.5 21 32.5 21C39.5 21 44 17 44 10Z"
          fill="url(#logo-star)"
          filter="url(#logo-shadow)"
        />
        <circle cx="44" cy="21" r="2.2" fill="white" />
      </svg>
      {showText && <span className="font-display text-lg font-bold tracking-tight">Lifeboard</span>}
    </div>
  );
}
