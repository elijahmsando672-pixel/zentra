import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import { Providers } from "@/app/providers";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["500", "700", "800"],
});

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "Zentra — Investment Clarity & Team Rewards",
    template: "%s · Zentra",
  },
  description:
    "Compare investment plans with transparent projections. Track earnings, manage withdrawals, and build team rewards with Zentra.",
  applicationName: "Zentra",
  keywords: ["Zentra", "investment", "wallet", "M-Pesa", "rewards", "KES"],
};

export const viewport: Viewport = {
  themeColor: "#0e3b2e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${bricolage.variable} ${figtree.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
