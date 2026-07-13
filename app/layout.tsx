import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter } from "next/font/google";
import "./globals.css";

const displayMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-display",
});

const bodySans = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Alexis",
  description: "Vos tickets Linear pilotent un agent de code, du ticket au PR.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${displayMono.variable} ${bodySans.variable}`}>
      <body className="bg-[radial-gradient(ellipse_at_top,_#FCF9F2_0%,_#F7F2E9_55%)] font-sans text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
