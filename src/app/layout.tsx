import type { Metadata, Viewport } from "next";
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
  title: "SaskPoly - Predictions with Friends",
  description: "Make predictions on sports and stocks with your friends. Earn points, climb the leaderboard, and prove you know best.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SaskPoly",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#000000",
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
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="min-h-full flex flex-col bg-black text-white">
        <Providers>
          <Navbar />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-zinc-800 py-10">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
                <div>
                  <h4 className="font-semibold text-white mb-3">Platform</h4>
                  <ul className="space-y-2 text-sm text-zinc-400">
                    <li><a href="/predictions" className="hover:text-emerald-400 transition">Predictions</a></li>
                    <li><a href="/leaderboard" className="hover:text-emerald-400 transition">Leaderboard</a></li>
                    <li><a href="/tools/vig" className="hover:text-emerald-400 transition">Vig Calculator</a></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-3">Company</h4>
                  <ul className="space-y-2 text-sm text-zinc-400">
                    <li><a href="/contact" className="hover:text-emerald-400 transition">Contact</a></li>
                    <li><a href="/privacy" className="hover:text-emerald-400 transition">Privacy Policy</a></li>
                    <li><a href="/terms" className="hover:text-emerald-400 transition">Terms of Service</a></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-3">Support</h4>
                  <ul className="space-y-2 text-sm text-zinc-400">
                    <li><a href="/contact" className="hover:text-emerald-400 transition">Help Center</a></li>
                    <li><a href="/contact" className="hover:text-emerald-400 transition">Report an Issue</a></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-3">Investors</h4>
                  <ul className="space-y-2 text-sm text-zinc-400">
                    <li><a href="/contact" className="hover:text-emerald-400 transition">Investor Relations</a></li>
                  </ul>
                </div>
              </div>
              <div className="border-t border-zinc-800 pt-6">
                <p className="text-xs text-zinc-600 text-center leading-relaxed max-w-3xl mx-auto mb-4">
                  Must be 18 or older to participate. Predictions involve risk of loss.
                  Only participate with funds you can afford to lose. Not investment advice.
                  Currently open to Saskatchewan and Alberta residents only.
                  Participant funds held in segregated accounts.
                </p>
                <p className="text-center text-sm text-zinc-500">
                  &copy; {new Date().getFullYear()} SaskPoly. All rights reserved.
                </p>
              </div>
            </div>
          </footer>
        </Providers>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
