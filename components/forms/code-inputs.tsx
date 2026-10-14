"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { FieldError } from "@/components/forms/form-inputs";

export function OtpInput({
  value,
  onChange,
  length = 6,
  error,
  disabled,
  onComplete,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  error?: string;
  disabled?: boolean;
  onComplete?: (value: string) => void;
  label?: string;
}) {
  const refs = React.useRef<(HTMLInputElement | null)[]>([]);
  const slotsFromValue = React.useCallback(
    (v: string) => v.replace(/\D/g, "").padEnd(length, " ").slice(0, length).split(""),
    [length]
  );
  const [slots, setSlots] = React.useState<string[]>(() => slotsFromValue(value));
  const chars = slots;

  React.useEffect(() => {
    const current = slots.join("").replace(/\s/g, "");
    if (current !== value.replace(/\D/g, "")) setSlots(slotsFromValue(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, length]);

  React.useEffect(() => {
    if (value.replace(/\D/g, "").length === length && onComplete) onComplete(value.replace(/\D/g, ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, length]);

  const commit = (next: string[]) => {
    setSlots(next);
    onChange(next.join("").replace(/\s/g, ""));
  };

  const setChar = (index: number, char: string) => {
    const next = slots.slice();
    next[index] = char || " ";
    commit(next);
  };

  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-semibold">{label}</p>}
      <div className="flex justify-center gap-2.5" role="group" aria-label={label ?? "Verification code"}>
        {Array.from({ length }).map((_, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            value={chars[i]?.trim() ?? ""}
            disabled={disabled}
            inputMode="numeric"
            maxLength={1}
            aria-label={`Digit ${i + 1}`}
            aria-invalid={!!error}
            className={cn(
              "numeric size-12 rounded-md border bg-card text-center text-lg font-extrabold shadow-xs transition-all outline-none",
              "focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[3px]",
              error ? "border-danger" : "border-input",
              disabled && "opacity-50",
              chars[i]?.trim() && !error && "border-primary"
            )}
            onChange={(e) => {
              const digit = e.target.value.replace(/\D/g, "").slice(-1);
              setChar(i, digit);
              if (digit && i < length - 1) refs.current[i + 1]?.focus();
            }}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !chars[i]?.trim() && i > 0) {
                refs.current[i - 1]?.focus();
              }
            }}
            onPaste={(e) => {
              e.preventDefault();
              const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
              if (pasted) {
                commit(pasted.padEnd(length, " ").slice(0, length).split(""));
                refs.current[Math.min(pasted.length, length - 1)]?.focus();
              }
            }}
          />
        ))}
      </div>
      <FieldError message={error} />
    </div>
  );
}

export function TransactionPinInput({
  value,
  onChange,
  error,
  disabled,
  label = "Transaction PIN",
  masked = true,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  label?: string;
  masked?: boolean;
}) {
  const refs = React.useRef<(HTMLInputElement | null)[]>([]);
  const length = 4;
  const slotsFromValue = (v: string) => v.replace(/\D/g, "").padEnd(length, " ").slice(0, length).split("");
  const [slots, setSlots] = React.useState<string[]>(() => slotsFromValue(value));
  const chars = slots;

  React.useEffect(() => {
    const current = slots.join("").replace(/\s/g, "");
    if (current !== value.replace(/\D/g, "")) setSlots(slotsFromValue(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, length]);

  const commit = (next: string[]) => {
    setSlots(next);
    onChange(next.join("").replace(/\s/g, ""));
  };

  const setChar = (index: number, char: string) => {
    const next = slots.slice();
    next[index] = char || " ";
    commit(next);
  };

  return (
    <div className="space-y-3">
      <p className="text-center text-sm font-semibold">{label}</p>
      <div className="flex justify-center gap-3" role="group" aria-label={label}>
        {Array.from({ length }).map((_, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            value={masked ? (chars[i]?.trim() ? "•" : "") : (chars[i]?.trim() ?? "")}
            disabled={disabled}
            inputMode="numeric"
            type="password"
            maxLength={1}
            autoComplete="off"
            aria-label={`PIN digit ${i + 1}`}
            aria-invalid={!!error}
            className={cn(
              "numeric size-13 rounded-md border bg-card text-center text-xl font-extrabold shadow-xs transition-all outline-none",
              "focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[3px]",
              error ? "border-danger" : "border-input",
              disabled && "opacity-50",
              chars[i]?.trim() && !error && "border-primary"
            )}
            onChange={(e) => {
              const digit = e.target.value.replace(/\D/g, "").slice(-1);
              setChar(i, digit);
              if (digit && i < length - 1) refs.current[i + 1]?.focus();
            }}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !chars[i]?.trim() && i > 0) {
                refs.current[i - 1]?.focus();
              }
            }}
          />
        ))}
      </div>
      <FieldError message={error} />
    </div>
  );
}
