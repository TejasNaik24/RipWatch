import type { Metadata } from "next";
import { IBM_Plex_Mono, Public_Sans } from "next/font/google";
import TopBar from "@/components/TopBar";
import "./globals.css";

// Public Sans is the US Web Design System's typeface for public-service products.
// IBM Plex Mono is used only for timestamps, camera IDs and numbers.
const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "RipWatch",
  description: "Rip current detection for beach cameras",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${publicSans.variable} ${plexMono.variable} antialiased`}>
      <body className="flex min-h-dvh flex-col">
        <TopBar />
        {children}
      </body>
    </html>
  );
}
