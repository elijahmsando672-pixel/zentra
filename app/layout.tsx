import type { Metadata, Viewport } from "next";
import { Manrope, Inter } from "next/font/google";
import { Providers } from "@/app/providers";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "Zentra — Build Your Next Level",
    template: "%s · Zentra",
  },
  description:
    "Discover products, manage your wallet, track your progress, and unlock rewards in one powerful platform.",
  applicationName: "Zentra",
  keywords: ["Zentra", "wallet", "M-Pesa", "investments", "rewards"],
};

export const viewport: Viewport = {
  themeColor: "#071426",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${manrope.variable} ${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
