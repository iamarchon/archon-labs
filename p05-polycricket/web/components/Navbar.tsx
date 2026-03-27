'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';

const NAV = [
  { label: 'MARKETS', href: '/' },
  { label: 'PORTFOLIO', href: '/portfolio' },
  { label: 'LEADERBOARD', href: '/leaderboard' },
];

export default function Navbar() {
  const path = usePathname();
  return (
    <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
      <Link href="/" className="text-xs font-medium tracking-[0.2em] uppercase text-black">
        POLYCRICKET
      </Link>
      <div className="flex items-center gap-8">
        {NAV.map(n => (
          <Link
            key={n.href}
            href={n.href}
            className={`text-[10px] tracking-widest uppercase transition-colors ${
              path === n.href ? 'text-black border-b border-black pb-0.5' : 'text-gray-400 hover:text-black'
            }`}
          >
            {n.label}
          </Link>
        ))}
        <SignedOut>
          <SignInButton>
            <button className="text-[10px] tracking-widest uppercase bg-black text-white px-4 py-1.5">
              SIGN IN
            </button>
          </SignInButton>
        </SignedOut>
        <SignedIn>
          <UserButton />
        </SignedIn>
      </div>
    </nav>
  );
}
