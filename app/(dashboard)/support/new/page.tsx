"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Clock, Send } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/forms/form-inputs";
import { PageHeader } from "@/components/shared/page-header";
import { createTicket, type CreateTicketInput } from "@/lib/services/support";
import { titleCase } from "@/lib/utils";
import { toast } from "sonner";

const CATEGORIES: CreateTicketInput["category"][] = [
  "deposits",
  "withdrawals",
  "investments",
  "account",
  "rewards",
  "other",
];

const PRIORITIES: CreateTicketInput["priority"][] = ["low", "normal", "high"];

export default function NewTicketPage() {
  const router = useRouter();

  const [subject, setSubject] = React.useState("");
  const [category, setCategory] = React.useState<CreateTicketInput["category"]>("deposits");
  const [priority, setPriority] = React.useState<CreateTicketInput["priority"]>("normal");
  const [message, setMessage] = React.useState("");
  const [attachment, setAttachment] = React.useState("");
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [pending, setPending] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const errors: Record<string, string> = {};
    if (subject.trim().length < 6) errors.subject = "At least 6 characters.";
    if (message.trim().length < 15) errors.message = "At least 15 characters.";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setPending(true);
    const res = await createTicket({
      subject: subject.trim(),
      category,
      priority,
      message: message.trim(),
    });
    setPending(false);

    if (!res.ok) {
      toast.error(res.message);
      setFieldErrors(res.fieldErrors ?? {});
      return;
    }

    toast.success("Ticket created", { description: res.data.reference });
    router.push(`/support/${res.data.id}`);
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="Open a ticket"
        description="Tell us what is happening and the support team will pick it up."
        breadcrumbs={[{ label: "Support", href: "/support" }, { label: "Open a ticket" }]}
      />

      <Alert variant="info">
        <Clock />
        <AlertTitle>Response times</AlertTitle>
        <AlertDescription>Our team will respond as soon as possible.</AlertDescription>
      </Alert>

      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-3" noValidate>
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ticket details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Withdrawal still pending after 24 hours"
                  aria-invalid={!!fieldErrors.subject}
                />
                <FieldError message={fieldErrors.subject} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={category}
                    onValueChange={(v) => setCategory(v as CreateTicketInput["category"])}
                  >
                    <SelectTrigger id="category" aria-label="Category">
                      <SelectValue placeholder="Choose a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {titleCase(c)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={priority}
                    onValueChange={(v) => setPriority(v as CreateTicketInput["priority"])}
                  >
                    <SelectTrigger id="priority" aria-label="Priority">
                      <SelectValue placeholder="Choose a priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {titleCase(p)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={7}
                  placeholder="Describe the issue, including any reference numbers and the amounts involved."
                  aria-invalid={!!fieldErrors.message}
                />
                <FieldError message={fieldErrors.message} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="attachments">Attachment names (optional)</Label>
                <Input
                  id="attachments"
                  value={attachment}
                  onChange={(e) => setAttachment(e.target.value)}
                  placeholder="e.g. screenshot-mpesa.png, statement.pdf"
                />
                <p className="text-xs text-muted-foreground">
                  Names are shown for context. File upload is not available on this form.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Submitting…" : (<><Send /> Submit ticket</>)}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Before you submit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Include the transaction reference, amount, and approximate time so we can investigate faster.</p>
              <p>Withdrawal and deposit issues are fastest when you attach the M-Pesa confirmation details.</p>
              <p>You can continue the conversation from the ticket thread once it is created.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ticket categories</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <span key={c} className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
                  {titleCase(c)}
                </span>
              ))}
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
