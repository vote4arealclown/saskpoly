import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SaskPoly - Saskatchewan Prediction Market",
  description: "Bet on Saskatchewan sports and events",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-black text-white">
        <Providers>
          <Navbar />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-zinc-800 py-8 text-center text-sm text-zinc-500">
            <p>SaskPoly - Saskatchewan&apos;s Prediction Market</p>
            <p className="mt-1">Built for darts, leagues, and local events</p>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
