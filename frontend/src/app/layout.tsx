import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PrepMind AI — Adaptive Interview Prep",
  description: "AI that interviews you like a real one.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
