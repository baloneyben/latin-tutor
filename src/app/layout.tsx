// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Latein-Trainer",
  description: "Latein-Vokabel- und Grammatiktrainer für iPad",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className="bg-slate-50 text-slate-900">
        <div className="min-h-screen flex flex-col items-center">
          <main className="w-full max-w-4xl px-4 py-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
