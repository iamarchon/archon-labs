import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import Navbar from '@/components/Navbar';
import LiveTicker from '@/components/LiveTicker';
import './globals.css';

export const metadata: Metadata = { title: 'PolyCricket', description: 'IPL Prediction Markets' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="bg-white text-black antialiased">
          <Navbar />
          <LiveTicker />
          <main>{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}
