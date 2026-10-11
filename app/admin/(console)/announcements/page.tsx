"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bell, Megaphone, Plus, Trash2, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DemoDataBadge } from "@/components/shared/demo-data-badge";
import { EmptyState, ErrorState, CardSkeleton } from "@/components/shared/states";
import { FieldError } from "@/components/forms/form-inputs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useApiQuery } from "@/hooks/use-api";
import {
  deleteAnnouncement,
  getAnnouncements,
  publishAnnouncement,
} from "@/lib/services/announcements";
import { cn, formatDateTime, relativeTime } from "@/lib/utils";
import type { Announcement } from "@/lib/types";

const SEVERITY_META = {
  info: { label: "Info", className: "bg-info-soft text-info" },
  warning: { label: "Warning", className: "bg-warning-soft text-warning" },
  success: { label: "Success", className: "bg-success-soft text-success" },
} as const;

export default function AdminAnnouncementsPage() {
  const announcements = useApiQuery(["admin", "announcements"], getAnnouncements);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [severity, setSeverity] = React.useState<Announcement["severity"]>("info");
  const [audience, setAudience] = React.useState("All members");
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string> | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = React.useState<Announcement | null>(null);

  const publish = useMutation({
    mutationFn: publishAnnouncement,
  });
  const remove = useMutation({
    mutationFn: deleteAnnouncement,
  });

  const list = announcements.data ?? [];
  const total = list.length;

  const handlePublish = async () => {
    const res = await publish.mutateAsync({ title, body, severity, audience });
    if (!res.ok) {
      setFieldErrors(res.fieldErrors);
      toast.error(res.message);
      return;
    }
    toast.success("Announcement published");
    setFieldErrors(undefined);
    setTitle("");
    setBody("");
    setSeverity("info");
    setAudience("All members");
    setCreateOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const res = await remove.mutateAsync(deleteTarget.id);
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    toast.success("Announcement deleted");
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Announcements"
        description="Publish and manage notices shown to members across the platform."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Announcements" }]}
        actions={
          <>
            <DemoDataBadge />
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus />
                  New announcement
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New announcement</DialogTitle>
                  <DialogDescription>
                    Published notices appear in the member announcements feed immediately.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="ann-title">Title</Label>
                    <Input
                      id="ann-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Scheduled maintenance"
                      aria-invalid={!!fieldErrors?.title}
                    />
                    <FieldError message={fieldErrors?.title} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ann-body">Message</Label>
                    <Textarea
                      id="ann-body"
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="What should members know?"
                      aria-invalid={!!fieldErrors?.body}
                    />
                    <FieldError message={fieldErrors?.body} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Severity</Label>
                      <Select value={severity} onValueChange={(v) => setSeverity(v as Announcement["severity"])}>
                        <SelectTrigger>
                          <SelectValue placeholder="Severity" />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(SEVERITY_META) as Announcement["severity"][]).map((s) => (
                            <SelectItem key={s} value={s}>
                              {SEVERITY_META[s].label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ann-audience">Audience</Label>
                      <Input
                        id="ann-audience"
                        value={audience}
                        onChange={(e) => setAudience(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => void handlePublish()} disabled={publish.isPending}>
                    {publish.isPending ? "Publishing…" : "Publish"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      <StatCard
        label="Total published"
        value={total}
        icon={<Bell />}
        loading={announcements.isLoading}
        supporting="across all audiences"
      />

      {announcements.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} lines={4} />
          ))}
        </div>
      ) : announcements.error ? (
        <ErrorState
          title="Could not load announcements"
          description={announcements.error.message}
          onRetry={() => void announcements.refetch()}
        />
      ) : list.length === 0 ? (
        <EmptyState
          icon={<Megaphone />}
          title="No announcements yet"
          description="Publish your first announcement to reach members."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((ann) => (
            <Card key={ann.id} className="flex flex-col animate-fade-up">
              <CardContent className="flex flex-1 flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <Badge className={cn("border-transparent", SEVERITY_META[ann.severity].className)}>
                    {SEVERITY_META[ann.severity].label}
                  </Badge>
                  <AlertDialog
                    open={deleteTarget?.id === ann.id}
                    onOpenChange={(open) => !open && setDeleteTarget(null)}
                  >
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:text-danger"
                        aria-label={`Delete ${ann.title}`}
                        onClick={() => setDeleteTarget(ann)}
                      >
                        <Trash2 />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this announcement?</AlertDialogTitle>
                        <AlertDialogDescription>
                          “{ann.title}” will be removed for all members. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          disabled={remove.isPending}
                          onClick={(e) => {
                            e.preventDefault();
                            void handleDelete();
                          }}
                        >
                          {remove.isPending ? "Deleting…" : "Delete"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                <div className="min-w-0 space-y-1">
                  <h3 className="font-bold tracking-tight text-balance">{ann.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{ann.body}</p>
                </div>
                <div className="mt-auto space-y-1.5 border-t border-border pt-3">
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="size-3.5" />
                    {ann.audience}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(ann.publishedAt)}
                    <span className="mx-1">·</span>
                    {relativeTime(ann.publishedAt)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
