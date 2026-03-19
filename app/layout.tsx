import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SchemaLens | Your Schema, Decoded",
  description:
    "Paste your SQL schema and instantly get an interactive ERD, optimized JOIN queries, index suggestions, and a schema health report. SchemaLens reads your database and tells you what's wrong with it.",
  keywords: [
    "database",
    "schema",
    "ERD",
    "SQL",
    "visualizer",
    "query optimizer",
    "foreign key",
    "index",
  ],
  authors: [{ name: "AteebHussain", url: "https://github.com/AteebHussain" }],
  openGraph: {
    title: "SchemaLens — Paste your schema. See your database think.",
    description:
      "Interactive ERD visualization with AI-powered query optimization and schema health reports.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
