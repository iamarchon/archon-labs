import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import Navbar from '@/components/Navbar';
import LiveTicker from '@/components/LiveTicker';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = { title: 'PolyCricket', description: 'IPL Prediction Markets' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={inter.variable}>
        <body className="bg-white text-[#111827] antialiased">
          <Navbar />
          <LiveTicker />
          <main>{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}
