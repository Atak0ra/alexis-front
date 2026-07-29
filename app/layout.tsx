import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
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

// Wordmark et titres uniquement — délibérément distinct du mono (réservé au
// code/IDs/coûts) et du body (Inter). Geometric mais avec du caractère
// (a/y à double approche) : lisible comme "précis", pas comme la police
// système par défaut.
const displayFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Alexis, agent de développement",
  description: "Une idée. Un projet livré. Alexis écrit le code, exécute les tests, et livre le résultat sur votre dépôt.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${bodyFont.variable} ${monoFont.variable} ${displayFont.variable} h-full`}>
      <body className="h-full bg-surface font-sans text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
