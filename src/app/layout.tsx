import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BolGuessr — Daily Football Moments Quiz",
  description: "A still image from a famous football moment. Identify the match. One puzzle per day.",
  icons: { icon: "/favicon.png" },
  openGraph: {
    title: "BolGuessr",
    description: "Identify the famous football moment from a single image.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen" suppressHydrationWarning>{children}</body>
    </html>
  );
}
