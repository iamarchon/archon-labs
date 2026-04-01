import type { Metadata } from "next";
import { Oswald, Manrope } from "next/font/google";
import "./globals.css";

const reviewBuild = "review-build-2026-03-31b";

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "DreamXI — IPL 2026 Fantasy",
  description: "Play IPL 2026 fantasy cricket. Pick your XI, win coins.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${oswald.variable} ${manrope.variable}`}>
      <body>
        <div className="fixed right-3 top-3 z-[100] rounded-full border border-violet-500/30 bg-slate-950/85 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-200">
          {reviewBuild}
        </div>
        {children}
      </body>
    </html>
  );
}
