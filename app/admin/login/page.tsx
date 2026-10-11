"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, PasswordInput } from "@/components/forms/form-inputs";
import { LogoMark } from "@/components/shared/logo";
import { adminLogin } from "@/lib/services/auth";

const adminSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your work email.")
    .refine(
      (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      "Enter a valid work email."
    ),
  password: z.string().min(4, "Password must be at least 4 characters."),
});

type AdminValues = z.infer<typeof adminSchema>;

const CONSOLE_AREAS = [
  "User operations, KYC and verification queues",
  "Deposits, withdrawals and ledger review",
  "Risk flags, support tickets and announcements",
];

export default function AdminLoginPage() {
  const router = useRouter();
  const [formError, setFormError] = React.useState<string>();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AdminValues>({
    resolver: zodResolver(adminSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: AdminValues) => {
    setFormError(undefined);
    const res = await adminLogin(values.email, values.password);
    if (!res.ok) {
      toast.error(res.message);
      setFormError(res.message);
      return;
    }
    toast.success(`Welcome, ${res.data.staffName}`);
    router.push("/admin");
  };

  return (
    <div className="grid min-h-screen w-full bg-background lg:grid-cols-2">
      <aside className="gradient-navy relative hidden overflow-hidden p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="grid-pattern absolute inset-0 opacity-40" aria-hidden />
        <div className="relative flex items-center gap-2.5">
          <LogoMark className="size-9" />
          <span className="text-lg font-extrabold tracking-tight">Zentra</span>
        </div>

        <div className="relative max-w-md space-y-5">
          <div className="space-y-2">
            <h1 className="text-4xl font-extrabold tracking-tight">Zentra Admin</h1>
            <p className="text-sm text-white/60">Operations console</p>
          </div>
          <ul className="space-y-2.5 text-sm text-white/70">
            {CONSOLE_AREAS.map((area) => (
              <li key={area} className="flex items-start gap-2.5">
                <span
                  aria-hidden
                  className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary"
                />
                {area}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/40">
          Staff access is verified against Zentra&apos;s operations database.
        </p>
      </aside>

      <main className="relative flex min-h-screen flex-col px-4 py-6 sm:px-8 lg:min-h-0">
        <header className="flex items-center justify-between lg:justify-end">
          <span className="flex items-center gap-2.5 lg:hidden">
            <LogoMark className="size-8" />
            <span className="text-base font-extrabold tracking-tight">Zentra Admin</span>
          </span>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to site
          </Link>
        </header>

        <div className="flex flex-1 items-center justify-center py-8">
          <Card className="animate-fade-up w-full max-w-md">
            <CardHeader className="gap-1.5 pt-6">
              <CardTitle className="text-2xl font-extrabold tracking-tight">
                Staff sign in
              </CardTitle>
              <CardDescription>
                Use your work credentials to open the operations console.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="admin-email">Work email</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    autoComplete="username"
                    placeholder="you@company.com"
                    aria-invalid={!!errors.email}
                    {...register("email")}
                  />
                  <FieldError message={errors.email?.message} />
                </div>

                <PasswordInput
                  id="admin-password"
                  label="Password"
                  autoComplete="current-password"
                  placeholder="Your console password"
                  value={watch("password")}
                  onChange={(value) => setValue("password", value, { shouldValidate: true })}
                  error={errors.password?.message}
                />

                <FieldError message={formError} />

                <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Signing in…" : "Sign in to console"}
                </Button>
              </form>

            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
