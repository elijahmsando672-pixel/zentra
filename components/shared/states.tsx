import * as React from "react";
import { AlertCircle, CheckCircle2, Inbox, Lock, RefreshCw, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/shared/logo";

interface StateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  className?: string;
}

function StateShell({ icon, title, description, action, secondaryAction, className }: StateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-card/60 px-6 py-14 text-center",
        className
      )}
    >
      {icon && <div className="text-muted-foreground [&_svg]:size-10">{icon}</div>}
      <div className="space-y-1.5">
        <p className="text-base font-bold">{title}</p>
        {description && (
          <p className="mx-auto max-w-sm text-sm text-muted-foreground leading-relaxed">{description}</p>
        )}
      </div>
      {(action || secondaryAction) && (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">{action}{secondaryAction}</div>
      )}
    </div>
  );
}

export function EmptyState(props: StateProps) {
  return <StateShell icon={props.icon ?? <Inbox />} {...props} />;
}

export function ErrorState({
  onRetry,
  ...props
}: StateProps & { onRetry?: () => void }) {
  if (props.description?.includes("Zentra session has expired")) {
    return <UnauthorizedState className={props.className} redirectTo={props.description.includes("staff session") ? "/admin/login" : "/login"} />;
  }
  return (
    <StateShell
      icon={props.icon ?? <AlertCircle />}
      {...props}
      action={
        props.action ?? (onRetry ? (
          <Button variant="outline" onClick={onRetry}>
            <RefreshCw /> Try again
          </Button>
        ) : undefined)
      }
    />
  );
}

export function SuccessState(props: StateProps) {
  return (
    <StateShell
      icon={
        <span className="relative flex items-center justify-center">
          <CheckCircle2 className="text-success [&_svg]:size-10" />
        </span>
      }
      {...props}
    />
  );
}

export function RestrictedState({ message, className }: { message?: string; className?: string }) {
  return (
    <StateShell
      icon={<ShieldAlert />}
      title="Account restricted"
      description={
        message ??
        "Some actions are unavailable while your account is under review. Please contact support if you need help."
      }
      className={className}
    />
  );
}

export function UnauthorizedState({ className, redirectTo = "/login" }: { className?: string; redirectTo?: string }) {
  return (
    <StateShell
      icon={<span className="flex size-12 items-center justify-center rounded-xl bg-primary/10"><LogoMark className="size-8" /></span>}
      title="Your Zentra session has expired"
      description="Sign in again to securely continue where you left off."
      className={className}
      action={
        <Button asChild>
          <a href={redirectTo}>Go to sign in</a>
        </Button>
      }
    />
  );
}

export function LoadingSkeleton({ className }: { className?: string }) {
  return <div className={cn("h-5 w-full animate-pulse-soft rounded-md bg-muted", className)} />;
}

export function CardSkeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-border bg-card p-5", className)}>
      <div className="space-y-3">
        <div className="h-4 w-1/3 animate-pulse-soft rounded-md bg-muted" />
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-3.5 animate-pulse-soft rounded-md bg-muted"
            style={{ width: `${85 - i * 12}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-1">
      <div className="flex gap-4 border-b border-border px-4 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-3 flex-1 animate-pulse-soft rounded-md bg-muted" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 border-b border-border/60 px-4 py-4 last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="h-3.5 flex-1 animate-pulse-soft rounded-md bg-muted" />
          ))}
        </div>
      ))}
    </div>
  );
}
