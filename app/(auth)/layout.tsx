import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/shared/logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <div className="gradient-hero absolute inset-0" aria-hidden />
      <div className="dot-pattern absolute inset-0 opacity-[0.5] [mask-image:linear-gradient(to_right,black,transparent_60%)]" aria-hidden />
      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-4 py-5 sm:px-8">
          <Link href="/" aria-label="Zentra home">
            <Logo />
          </Link>
          <Link
            href="/"
            className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Back to home
          </Link>
        </header>
        <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6">
          <div className="w-full max-w-md">{children}</div>
        </main>
        <footer className="px-4 pb-6 text-center text-xs text-muted-foreground sm:px-8">
          Keep your password and verification codes private. Zentra support will never ask you to share them.
        </footer>
      </div>
    </div>
  );
}
