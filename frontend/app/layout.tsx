import type { Metadata } from "next";
import "./globals.css";
import NavLinks from "./NavLinks";
import KeepAlive from "@/components/KeepAlive";

export const metadata: Metadata = {
  title: "TailorMind",
  description: "Targeted opportunity discovery and application engine",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <KeepAlive />
        <header className="bg-slate-900 text-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
            <a href="/dashboard" className="text-lg font-bold tracking-tight">
              TailorMind
            </a>
            <NavLinks />
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
