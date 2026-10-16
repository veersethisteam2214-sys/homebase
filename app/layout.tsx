import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Homebase — Your day, with intention",
  description: "Your private daily planner, goals, morning routine and assignment tracker.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
