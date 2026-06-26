import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  metadataBase: new URL("https://fellowsignal.xyz"),
  title: "Fellow Signal: the frontier Activate's scientists are building",
  description:
    "An intelligence layer on Activate Global's fellowship: 224 hard-tech ventures (2015-2025) mapped by science, industry, and impact, with funding outcomes and research-frontier signals.",
  openGraph: {
    title: "Fellow Signal",
    description: "An intelligence layer on the deep-tech founder frontier, from public data.",
    url: "https://fellowsignal.xyz",
    siteName: "Fellow Signal",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fellow Signal",
    description: "An intelligence layer on the deep-tech founder frontier, from public data.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
