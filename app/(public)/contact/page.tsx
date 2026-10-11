"use client";

import { useState, type FormEvent } from "react";
import { Mail, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Breadcrumbs } from "@/components/shared/page-header";
import { useApiQuery } from "@/hooks/use-api";
import { getPublicPaymentConfig } from "@/lib/services/deposits";
import { ADMIN_EMAIL, DEFAULT_WHATSAPP_NUMBER } from "@/lib/constants";
import { normalizePhoneKE } from "@/lib/utils";

const TELEGRAM_USERNAME = "nasir";

const contactMethods = [
  { id: "email", label: "Email", icon: Mail, description: "Open your email app" },
  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle, description: "Open WhatsApp" },
  { id: "telegram", label: "Telegram", icon: Send, description: "Open Telegram" },
] as const;

type ContactMethod = (typeof contactMethods)[number]["id"];

export default function ContactPage() {
  const paymentConfig = useApiQuery(["public", "payment-config"], getPublicPaymentConfig);
  const [selectedMethod, setSelectedMethod] = useState<ContactMethod>("whatsapp");
  const contact = paymentConfig.data?.contact;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const subject = String(data.get("subject") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();
    const preparedMessage = `Hello Zentra support,\n\n${message}\n\nName: ${name}\nReply email: ${email}`;

    let destination: string;
    if (selectedMethod === "email") {
      const emailSubject = encodeURIComponent(`Zentra support: ${subject}`);
      destination = `mailto:${contact?.adminEmail ?? ADMIN_EMAIL}?subject=${emailSubject}&body=${encodeURIComponent(preparedMessage)}`;
    } else if (selectedMethod === "whatsapp") {
      const number = normalizePhoneKE(contact?.whatsappNumber ?? DEFAULT_WHATSAPP_NUMBER);
      destination = `https://wa.me/${number}?text=${encodeURIComponent(`${subject}\n\n${preparedMessage}`)}`;
    } else {
      destination = `https://t.me/${TELEGRAM_USERNAME}?text=${encodeURIComponent(`${subject}\n\n${preparedMessage}`)}`;
    }

    window.location.assign(destination);
  }

  return (
    <div>
      <section className="gradient-hero relative overflow-hidden border-b border-border">
        <div className="grid-pattern absolute inset-0 opacity-60" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <div className="max-w-2xl space-y-5">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">Support</p>
            <h1 className="text-3xl font-extrabold tracking-tight text-balance text-white sm:text-5xl">
              Talk to the Zentra team
            </h1>
            <p className="text-sm leading-relaxed text-white/70 sm:text-base">
              Fill in your details, choose where to send your message, and we will open it for you.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Contact" }]} className="mb-8" />

        <Card className="shadow-xs">
          <CardContent className="space-y-6 p-6 sm:p-8">
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold">Choose how you want to contact us</legend>
              <div className="grid gap-3 sm:grid-cols-3">
                {contactMethods.map((method) => {
                  const Icon = method.icon;
                  const selected = selectedMethod === method.id;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setSelectedMethod(method.id)}
                      className={`flex min-h-24 flex-col items-start justify-center gap-2 rounded-lg border p-4 text-left transition-colors ${
                        selected
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-card text-muted-foreground hover:bg-muted/50"
                      }`}
                    >
                      <span className="flex items-center gap-2 font-semibold">
                        <Icon className="size-4 text-primary" />
                        {method.label}
                      </span>
                      <span className="text-xs">{method.description}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contact-name">Your name</Label>
                  <Input id="contact-name" name="name" autoComplete="name" required minLength={2} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-email">Your email</Label>
                  <Input
                    id="contact-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-subject">Subject</Label>
                <Input id="contact-subject" name="subject" required maxLength={120} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-message">Message</Label>
                <Textarea
                  id="contact-message"
                  name="message"
                  rows={6}
                  required
                  minLength={15}
                  maxLength={2000}
                  placeholder="Tell us how we can help..."
                />
              </div>

              <Button type="submit" className="w-full sm:w-auto">
                Continue to {contactMethods.find((method) => method.id === selectedMethod)?.label}
                <Send />
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
