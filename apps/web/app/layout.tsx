import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "AIOS — Votre entreprise, pilotée par une équipe d'IA",
  description:
    "Donnez vos objectifs. Une équipe d'agents IA construit, gère et fait grandir votre entreprise.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#6C5CE7",
          colorBackground: "#121218",
          colorText: "#F4F4F6",
          colorInputBackground: "#1A1A22",
          borderRadius: "8px",
        },
      }}
    >
      <html lang="fr" className={`dark ${sans.variable} ${display.variable} ${mono.variable}`}>
        <body className="font-sans antialiased">{children}</body>
      </html>
    </ClerkProvider>
  );
}
