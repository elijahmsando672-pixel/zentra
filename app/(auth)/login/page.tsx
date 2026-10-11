"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, PasswordInput } from "@/components/forms/form-inputs";
import { login } from "@/lib/services/auth";
import { normalizePhoneKE } from "@/lib/utils";

const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "Enter your phone number or email.")
    .refine((value) => {
      if (value.includes("@")) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      const phone = normalizePhoneKE(value);
      return phone.length === 12 && phone.startsWith("254");
    }, "Enter a valid Kenyan phone number or email."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [remember, setRemember] = React.useState(true);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "" },
  });

  const onSubmit = async (values: LoginValues) => {
    const res = await login(values.identifier, values.password);
    if (!res.ok) {
      toast.error(res.message);
      Object.entries(res.fieldErrors ?? {}).forEach(([field, message]) => {
        setError(field as keyof LoginValues, { message });
      });
      return;
    }
    toast.success(`Welcome back, ${res.data.user.fullName.split(" ")[0]}`);
    router.push("/dashboard");
  };

  return (
    <div className="animate-fade-up">
      <Card>
        <CardHeader className="gap-1.5 pt-6">
          <CardTitle className="text-2xl font-extrabold tracking-tight">Welcome back</CardTitle>
          <CardDescription>Log in to continue building your next level.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="identifier">Phone or email</Label>
              <Input
                id="identifier"
                autoComplete="username"
                placeholder="0712 345 678 or you@example.com"
                aria-invalid={!!errors.identifier}
                {...register("identifier")}
              />
              <FieldError message={errors.identifier?.message} />
            </div>

            <PasswordInput
              id="password"
              label="Password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={watch("password")}
              onChange={(value) => setValue("password", value, { shouldValidate: true })}
              error={errors.password?.message}
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Label htmlFor="remember" className="cursor-pointer gap-2">
                <Checkbox
                  id="remember"
                  checked={remember}
                  onCheckedChange={(checked) => setRemember(checked === true)}
                />
                Remember me
              </Label>
              <Link
                href="/forgot-password"
                className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Logging in…" : "Log in"}
            </Button>
          </form>

          <div className="rounded-sm border border-dashed border-border px-4 py-3 text-center text-sm text-muted-foreground">
            New to Zentra?{" "}
            <Link
              href="/register"
              className="font-bold text-primary underline-offset-4 hover:underline"
            >
              Create an account
            </Link>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            <Link
              href="/admin/login"
              className="font-semibold underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              Staff? Log in to admin
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
