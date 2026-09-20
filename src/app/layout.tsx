import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nitrasensor | Know Your Water is Safe to Drink",
  description: "Get instant alerts when heavy rain pushes fertilizer and bacteria into your private well, so you can keep your family safe.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-slate-50 font-sans text-slate-900" suppressHydrationWarning>{children}</body>
    </html>
  );
}
