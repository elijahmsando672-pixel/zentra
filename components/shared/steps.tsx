import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StepDef {
  label: string;
  description?: string;
}

export function StepIndicator({
  steps,
  current,
  className,
}: {
  steps: StepDef[];
  current: number;
  className?: string;
}) {
  return (
    <ol className={cn("flex w-full items-start gap-2", className)} aria-label="Progress">
      {steps.map((step, i) => {
        const state = i < current ? "done" : i === current ? "current" : "upcoming";
        return (
          <li key={step.label} className="relative flex min-w-0 flex-1 flex-col items-center gap-2">
            {i > 0 && (
              <span
                aria-hidden
                className={cn(
                  "absolute top-4 right-1/2 h-px w-full",
                  i <= current ? "bg-primary" : "bg-border"
                )}
              />
            )}
            <span
              aria-hidden
              className={cn(
                "relative z-10 flex size-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors",
                state === "done" && "border-primary bg-primary text-primary-foreground",
                state === "current" && "border-brand-deep bg-card text-brand-deep dark:border-primary dark:text-primary",
                state === "upcoming" && "border-border bg-card text-muted-foreground"
              )}
            >
              {state === "done" ? <Check className="size-4" strokeWidth={3} /> : i + 1}
            </span>
            <span className="min-w-0 text-center">
              <span
                className={cn(
                  "block truncate text-xs font-bold",
                  state === "upcoming" ? "text-muted-foreground" : "text-foreground"
                )}
              >
                {step.label}
              </span>
              {step.description && (
                <span className="mt-0.5 hidden truncate text-[11px] text-muted-foreground sm:block">
                  {step.description}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
