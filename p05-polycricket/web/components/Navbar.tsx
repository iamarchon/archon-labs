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
    <nav
      className="sticky top-0 z-50 bg-white"
      style={{ borderBottom: '1px solid #e5e7eb' }}
    >
      <div className="max-w-7xl mx-auto px-4 h-[52px] flex items-center gap-3">

        {/* Wordmark */}
        <Link
          href="/"
          className="flex items-center gap-1.5 shrink-0 mr-2"
        >
          <span className="text-base">🏏</span>
          <span
            className="font-bold text-[15px] text-gray-900"
            style={{ letterSpacing: '-0.03em' }}
          >
            PolyCricket
          </span>
        </Link>

        {/* Search */}
        <div className="relative flex-1 max-w-[280px] hidden sm:block">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            width="14" height="14" viewBox="0 0 24 24" fill="none"
          >
            <circle cx="11" cy="11" r="7" stroke="#9CA3AF" strokeWidth="2"/>
            <path d="M20 20l-3.5-3.5" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search markets..."
            className="w-full h-[34px] rounded-lg pl-8 pr-3 text-sm text-gray-700 placeholder-gray-400 outline-none transition-colors"
            style={{
              background: '#F3F4F6',
              border: '1px solid transparent',
              fontSize: '13px',
            }}
            onFocus={e => {
              e.currentTarget.style.background = '#fff';
              e.currentTarget.style.border = '1px solid #2563EB';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)';
            }}
            onBlur={e => {
              e.currentTarget.style.background = '#F3F4F6';
              e.currentTarget.style.border = '1px solid transparent';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* Nav links */}
        <div className="flex items-center ml-1">
          {[
            { label: 'Markets', href: '/' },
            { label: 'Portfolio', href: '/portfolio' },
            { label: 'Leaderboard', href: '/leaderboard' },
          ].map(n => (
            <Link
              key={n.href}
              href={n.href}
              className="px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors"
              style={{
                color: path === n.href ? '#111827' : '#6B7280',
                background: path === n.href ? '#F3F4F6' : 'transparent',
              }}
            >
              {n.label}
            </Link>
          ))}
        </div>

        {/* Auth — right side */}
        <div className="flex items-center gap-2 ml-auto">
          {!isSignedIn && (
            <>
              <SignInButton>
                <button
                  className="text-[13px] font-medium px-3 py-1.5 rounded-lg transition-colors"
                  style={{ color: '#374151' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F3F4F6')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  Log in
                </button>
              </SignInButton>
              <SignInButton>
                <button
                  className="text-[13px] font-semibold px-3.5 py-1.5 rounded-lg text-white transition-all"
                  style={{ background: '#2563EB' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#1d4ed8')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#2563EB')}
                >
                  Sign up
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
