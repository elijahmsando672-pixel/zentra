"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Bell, Check, CheckCheck, Inbox, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/shared/states";
import { DemoDataBadge } from "@/components/shared/demo-data-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, relativeTime } from "@/lib/utils";
import { useApiQuery } from "@/hooks/use-api";
import {
  deleteNotification,
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/services/notifications";
import { NOTIFICATION_META } from "@/lib/constants";
import type { AppNotification, NotificationCategory } from "@/lib/types";
import { toast } from "sonner";

type CategoryFilter = NotificationCategory | "all";

export default function NotificationsPage() {
  const router = useRouter();
  const [category, setCategory] = React.useState<CategoryFilter>("all");
  const [hiddenIds, setHiddenIds] = React.useState<Set<string>>(new Set());
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [markingAll, setMarkingAll] = React.useState(false);

  const {
    data: notifications,
    isLoading,
    error,
    refetch,
  } = useApiQuery(["notifications"], () => getNotifications());

  const { data: unread } = useApiQuery(["notifications", "unread-count"], getUnreadCount);

  const items = React.useMemo(
    () => (notifications ?? []).filter((n) => !hiddenIds.has(n.id)),
    [notifications, hiddenIds]
  );

  const counts = React.useMemo(() => {
    const map: Record<string, number> = { all: items.length };
    for (const n of items) map[n.category] = (map[n.category] ?? 0) + 1;
    return map;
  }, [items]);

  const filtered = React.useMemo(
    () => (category === "all" ? items : items.filter((n) => n.category === category)),
    [items, category]
  );

  const unreadCount = unread?.count ?? 0;

  const handleMarkAll = async () => {
    setMarkingAll(true);
    const res = await markAllNotificationsRead();
    setMarkingAll(false);
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    toast.success("All notifications marked as read");
  };

  const handleMarkRead = async (id: string) => {
    setBusyId(id);
    const res = await markNotificationRead(id);
    setBusyId(null);
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    toast.success("Marked as read");
  };

  const handleOpen = async (notification: AppNotification) => {
    if (!notification.read) {
      const res = await markNotificationRead(notification.id);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
    }
    if (notification.actionHref) router.push(notification.actionHref);
  };

  const handleDelete = async (id: string) => {
    setHiddenIds((prev) => new Set(prev).add(id));
    const res = await deleteNotification(id);
    if (!res.ok) {
      setHiddenIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.error(res.message);
      return;
    }
    toast.success("Notification deleted");
  };

  const filters: { key: CategoryFilter; label: string; icon?: React.ReactNode }[] = [
    { key: "all", label: "All" },
    ...(Object.entries(NOTIFICATION_META) as [
      NotificationCategory,
      { label: string; icon: typeof Bell },
    ][]).map(([key, meta]) => ({
      key: key as CategoryFilter,
      label: meta.label,
      icon: <meta.icon className="size-3.5" />,
    })),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Transaction alerts, team activity, security notices and promotions in one feed."
        actions={
          <>
            <Badge variant={unreadCount > 0 ? "default" : "outline"} className="gap-1.5">
              {unreadCount} unread
            </Badge>
            <Button
              variant="outline"
              onClick={() => void handleMarkAll()}
              disabled={unreadCount === 0 || markingAll}
            >
              <CheckCheck />
              {markingAll ? "Marking…" : "Mark all read"}
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Notification categories">
        {filters.map((f) => {
          const active = category === f.key;
          const count = counts[f.key] ?? 0;
          return (
            <Button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={active}
              size="sm"
              variant={active ? "default" : "outline"}
              onClick={() => setCategory(f.key)}
              className="gap-1.5"
            >
              {f.icon}
              {f.label}
              <span
                className={cn(
                  "numeric text-xs",
                  active ? "text-primary-foreground/80" : "text-muted-foreground"
                )}
              >
                {count}
              </span>
            </Button>
          );
        })}
      </div>

      {error ? (
        <ErrorState
          title="Notifications unavailable"
          description={error.message}
          onRetry={() => void refetch()}
        />
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3.5 rounded-lg border border-border bg-card p-4 shadow-xs"
            >
              <div className="size-10 shrink-0 animate-pulse-soft rounded-md bg-muted" />
              <div className="flex-1 space-y-2">
                <LoadingSkeleton className="h-3.5 w-1/3" />
                <LoadingSkeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={category === "all" ? <Inbox /> : <Bell />}
          title={category === "all" ? "You are all caught up" : "Nothing here yet"}
          description={
            category === "all"
              ? "New alerts about deposits, withdrawals, rewards and security will appear here."
              : `No ${NOTIFICATION_META[category as NotificationCategory].label.toLowerCase()} notifications right now.`
          }
          action={
            category === "all" ? undefined : (
              <Button variant="outline" onClick={() => setCategory("all")}>
                View all notifications
              </Button>
            )
          }
        />
      ) : (
        <ul className="space-y-3">
          {filtered.map((notification) => {
            const meta = NOTIFICATION_META[notification.category];
            const Icon = meta.icon;
            const unreadRow = !notification.read;
            return (
              <li
                key={notification.id}
                className={cn(
                  "group relative flex gap-3.5 rounded-lg border border-border bg-card p-4 shadow-xs transition-colors",
                  unreadRow && "border-l-2 border-l-primary bg-primary/5"
                )}
              >
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-md",
                    unreadRow ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                  )}
                  aria-hidden
                >
                  <Icon className="size-4.5" />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {unreadRow && (
                      <span
                        className="size-2 shrink-0 rounded-full bg-primary"
                        aria-label="Unread"
                      />
                    )}
                    <p className="text-sm font-bold">{notification.title}</p>
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      {meta.label}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                    {notification.body}
                  </p>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    {relativeTime(notification.at)}
                  </p>
                </div>

                <div className="flex shrink-0 items-start gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                  {unreadRow && (
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Mark ${notification.title} as read`}
                      disabled={busyId === notification.id}
                      onClick={() => void handleMarkRead(notification.id)}
                    >
                      <Check />
                    </Button>
                  )}
                  {notification.actionHref && (
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={notification.actionLabel ?? `Open ${notification.title}`}
                      onClick={() => void handleOpen(notification)}
                    >
                      <ArrowUpRight />
                    </Button>
                  )}
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="text-danger"
                    aria-label={`Delete ${notification.title}`}
                    onClick={() => void handleDelete(notification.id)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <DemoDataBadge label="Sample activity" />
        <span>Some notifications may be sample activity; account notices reflect your recorded events.</span>
      </div>
    </div>
  );
}
