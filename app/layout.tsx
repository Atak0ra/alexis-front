import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const bodyFont = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Alexis, agent de développement",
  description: "Une idée. Un projet livré. Alexis écrit le code, exécute les tests, et livre le résultat sur votre dépôt.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${bodyFont.variable} ${monoFont.variable} h-full`}>
      <body className="h-full bg-surface font-sans text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
