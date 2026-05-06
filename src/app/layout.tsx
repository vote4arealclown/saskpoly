import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/navbar";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

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
  description: "Trade on real-world outcomes with transparent odds, secure payments, and audited resolutions.",
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
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-3HY7KY3V7N"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-3HY7KY3V7N');
          `}
        </Script>
      </head>
      <body className="min-h-full flex flex-col bg-black text-white">
        <Providers>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Analytics />
          <SpeedInsights />
          <footer className="border-t border-zinc-800 py-10">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
                <div>
                  <h4 className="font-semibold text-white mb-3">Platform</h4>
                  <ul className="space-y-2 text-sm text-zinc-400">
                    <li><a href="/markets" className="hover:text-emerald-400 transition">Markets</a></li>
                    <li><a href="/create" className="hover:text-emerald-400 transition">Create Market</a></li>
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
      </body>
    </html>
  );
}
