'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth, SignInButton, UserButton } from '@clerk/nextjs';
import { useState } from 'react';

export default function Navbar() {
  const path = usePathname();
  const { isSignedIn } = useAuth();
  const [search, setSearch] = useState('');

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0 mr-2">
          <span className="text-xl">🏏</span>
          <span className="font-semibold text-[15px] tracking-tight text-gray-900">PolyCricket</span>
        </Link>

        {/* Search */}
        <div className="relative flex-1 max-w-sm hidden sm:block">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search markets..."
            className="w-full h-9 bg-gray-100 rounded-lg pl-9 pr-3 text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-gray-400 font-mono hidden lg:block">/</span>
        </div>

        {/* Nav links */}
        <div className="flex items-center gap-1 ml-2">
          {[
            { label: 'Markets', href: '/' },
            { label: 'Portfolio', href: '/portfolio' },
            { label: 'Leaderboard', href: '/leaderboard' },
          ].map(n => (
            <Link
              key={n.href}
              href={n.href}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                path === n.href
                  ? 'bg-gray-100 text-gray-900 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {n.label}
            </Link>
          ))}
        </div>

        {/* Auth */}
        <div className="flex items-center gap-2 ml-auto">
          {!isSignedIn && (
            <>
              <SignInButton>
                <button className="text-sm text-gray-700 font-medium px-3 py-1.5 hover:bg-gray-50 rounded-lg transition-colors">
                  Log In
                </button>
              </SignInButton>
              <SignInButton>
                <button className="text-sm text-white font-medium bg-blue-600 hover:bg-blue-700 px-4 py-1.5 rounded-lg transition-colors">
                  Sign Up
                </button>
              </SignInButton>
            </>
          )}
          {isSignedIn && <UserButton />}
        </div>
      </div>
    </nav>
  );
}
