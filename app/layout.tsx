import type { Metadata } from "next";
import localFont from "next/font/local";
import { AnalyticsProvider } from "@/components/analytics-provider";
import { siteUrl } from "@/lib/env";
import "./globals.css";

const helvena = localFont({
  src: [
    { path: "./fonts/helvena/Helvena-Extralight.woff2", weight: "200", style: "normal" },
    { path: "./fonts/helvena/Helvena-Light.woff2", weight: "300", style: "normal" },
    { path: "./fonts/helvena/Helvena-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/helvena/Helvena-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/helvena/Helvena-Semibold.woff2", weight: "600", style: "normal" },
    { path: "./fonts/helvena/Helvena-Bold.woff2", weight: "700", style: "normal" },
    { path: "./fonts/helvena/Helvena-Extrabold.woff2", weight: "800", style: "normal" },
    { path: "./fonts/helvena/Helvena-Black.woff2", weight: "900", style: "normal" },
  ],
  variable: "--font-helvena",
  display: "swap",
});

const bethany = localFont({
  src: "./fonts/bethany/BethanyElingston.otf",
  weight: "400",
  style: "normal",
  variable: "--font-bethany",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Dot On The Map", template: "%s | Dot On The Map" },
  description: "Travel journals, itineraries, and photos by Jeremie.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Dot On The Map",
    description: "Travel journals, itineraries, and photos by Jeremie.",
    type: "website",
    url: siteUrl,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${helvena.variable} ${bethany.variable} h-full antialiased`}>
      <body className="min-h-full bg-background font-sans text-foreground">
        <AnalyticsProvider>
          {children}
        </AnalyticsProvider>
      </body>
    </html>
  );
}
