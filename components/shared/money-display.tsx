"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn, formatKES } from "@/lib/utils";

interface MoneyDisplayProps {
  amount: number;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "hero";
  hideable?: boolean;
  sign?: boolean;
  decimals?: number;
  mutedPrefix?: boolean;
}

const sizeClasses = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl",
  xl: "text-3xl",
  hero: "text-4xl sm:text-5xl",
} as const;

export function MoneyDisplay({
  amount,
  className,
  size = "md",
  hideable = false,
  sign = false,
  decimals = 2,
  mutedPrefix = true,
}: MoneyDisplayProps) {
  const [hidden, setHidden] = React.useState(false);

  const formatted = formatKES(amount, { decimals, sign });
  const [prefix, ...rest] = formatted.split(" ");

  return (
    <span className={cn("inline-flex items-center gap-2", sizeClasses[size], className)}>
      <span className="numeric inline-flex items-baseline gap-1 font-bold tracking-tight">
        {hidden && hideable ? (
          <span aria-label="Amount hidden">••••••</span>
        ) : (
          <>
            {mutedPrefix && (
              <span
                className={cn(
                  "font-semibold",
                  size === "hero" || size === "xl" ? "text-[0.55em] opacity-60" : "text-[0.7em] opacity-60"
                )}
              >
                {prefix}
              </span>
            )}
            <span>{rest.join(" ")}</span>
          </>
        )}
      </span>
      {hideable && (
        <button
          type="button"
          onClick={() => setHidden((h) => !h)}
          className="rounded-xs p-1 text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
          aria-label={hidden ? "Show balance" : "Hide balance"}
        >
          {hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      )}
    </span>
  );
}
