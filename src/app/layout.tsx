import type { Metadata } from "next";
import { DM_Serif_Display, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const dmSerifDisplay = DM_Serif_Display({
  variable: "--font-dm-serif-display",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "FitCal Challenge",
  description:
    "365 Tage Fitness-Challenge mit Tageszielen, Joker-Tagen und Video-Nachweisen.",
};

const monoFallback = JetBrains_Mono({
  variable: "--font-fitcal-mono-fallback",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${spaceGrotesk.variable} ${dmSerifDisplay.variable} ${monoFallback.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
