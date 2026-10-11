"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, formatPhoneKE } from "@/lib/utils";

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-xs font-semibold text-danger">
      {message}
    </p>
  );
}

export function PhoneInput({
  value,
  onChange,
  label,
  error,
  placeholder = "0712 345 678",
  id = "phone",
  className,
  required,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  placeholder?: string;
  id?: string;
  className?: string;
  required?: boolean;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label htmlFor={id}>
          {label}
          {required && <span className="text-danger">*</span>}
        </Label>
      )}
      <div className="relative">
        <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-sm font-bold">
          🇰🇪 +254
        </span>
        <Input
          id={id}
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
            onChange(digits.length > 4 ? formatPhoneKE(digits) : digits);
          }}
          aria-invalid={!!error}
          className="pl-[76px] numeric"
        />
      </div>
      <FieldError message={error} />
    </div>
  );
}

export function CurrencyInput({
  value,
  onChange,
  label,
  error,
  hint,
  min,
  max,
  id = "amount",
  className,
  prefix = "KES",
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  hint?: string;
  min?: number;
  max?: number;
  id?: string;
  className?: string;
  prefix?: string;
}) {
  const display = value;
  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className="relative">
        <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-sm font-bold">
          {prefix}
        </span>
        <Input
          id={id}
          inputMode="decimal"
          placeholder="0"
          value={display}
          onChange={(e) => {
            const cleaned = e.target.value.replace(/[^0-9.]/g, "");
            const parts = cleaned.split(".");
            const normalized =
              parts.length > 2 ? `${parts[0]}.${parts.slice(1).join("")}` : cleaned;
            onChange(normalized);
          }}
          aria-invalid={!!error}
          className="numeric pl-14 pr-16 text-lg font-extrabold"
        />
        <span className="text-muted-foreground/70 pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-xs font-semibold">
          KES
        </span>
      </div>
      {(hint || error) && (
        <div className="flex items-start justify-between gap-3">
          <FieldError message={error} />
          {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      )}
      {(min !== undefined || max !== undefined) && !hint && !error && (
        <p className="text-xs text-muted-foreground">
          {min !== undefined && `Min KES ${min.toLocaleString()}`}
          {min !== undefined && max !== undefined && " · "}
          {max !== undefined && `Max KES ${max.toLocaleString()}`}
        </p>
      )}
    </div>
  );
}

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
}

export function getPasswordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password) || password.length >= 12) score++;
  if (!password) score = 0;
  const table = [
    { label: "Too weak", color: "#EF4444" },
    { label: "Weak", color: "#EF4444" },
    { label: "Fair", color: "#F59E0B" },
    { label: "Good", color: "#3B82F6" },
    { label: "Strong", color: "#18B97A" },
  ] as const;
  return { score: score as PasswordStrength["score"], ...table[score] };
}

export function PasswordInput({
  value,
  onChange,
  label,
  error,
  id = "password",
  className,
  autoComplete = "current-password",
  showStrength = false,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  id?: string;
  className?: string;
  autoComplete?: string;
  showStrength?: boolean;
  placeholder?: string;
}) {
  const [visible, setVisible] = React.useState(false);
  const strength = getPasswordStrength(value);

  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={!!error}
          className="pr-11"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? (
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 4.2A10.5 10.5 0 0112 4c5 0 9.3 3.1 11 8a11.8 11.8 0 01-2.4 3.9M6.6 6.6A11.8 11.8 0 001 12c1.7 4.9 6 8 11 8a10.5 10.5 0 004.3-.9" strokeLinecap="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
      {showStrength && value.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex gap-1.5" aria-hidden>
            {[1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="h-1 flex-1 rounded-full transition-colors"
                style={{ backgroundColor: i <= strength.score ? strength.color : "var(--color-border)" }}
              />
            ))}
          </div>
          <p className="text-xs font-semibold" style={{ color: strength.color }}>
            {strength.label}
          </p>
        </div>
      )}
      <FieldError message={error} />
    </div>
  );
}
