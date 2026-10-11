import Link from "next/link";
import { AtSign, Globe, MessagesSquare } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { APP_TAGLINE, FOOTER_LINKS } from "@/lib/constants";

export function PublicFooter() {
  return (
    <footer className="gradient-navy relative text-white">
      <div className="grid-pattern absolute inset-0 opacity-40" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div className="max-w-sm space-y-4">
            <Logo light />
            <p className="text-sm leading-relaxed text-white/60">{APP_TAGLINE}</p>
            <div className="flex gap-2">
              {[MessagesSquare, AtSign, Globe].map((Icon, i) => (
                <span
                  key={i}
                  className="flex size-9 cursor-pointer items-center justify-center rounded-md border border-white/10 bg-white/5 text-white/70 transition-colors hover:bg-white/10"
                  aria-hidden
                >
                  <Icon className="size-4" />
                </span>
              ))}
            </div>
          </div>

          {(
            [
              ["Product", FOOTER_LINKS.product],
              ["Company", FOOTER_LINKS.company],
              ["Support", FOOTER_LINKS.support],
              ["Legal", FOOTER_LINKS.legal],
            ] as const
          ).map(([heading, links]) => (
            <div key={heading}>
              <p className="text-xs font-bold tracking-widest text-white/40 uppercase">{heading}</p>
              <ul className="mt-4 space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/70 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-white/10 pt-6">
          <p className="text-xs text-white/40">&copy; 2026 Zentra</p>
        </div>
      </div>
    </footer>
  );
}
