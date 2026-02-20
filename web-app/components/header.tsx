'use client';

import Link from 'next/link';
import { Menu } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const MARKETPLACE_URL = process.env.NEXT_PUBLIC_MARKETPLACE_URL || 'http://localhost:30502';

  const navLinks = [
    { href: '#features', label: 'Features' },
    { href: '#for-who', label: 'For Who' },
    { href: '#pricing', label: 'Pricing' },
    { href: MARKETPLACE_URL, label: 'Marketplace', external: true },
  ];

  return (
    <nav
      className={`bg-white/95 backdrop-blur-sm sticky top-0 z-50 border-b border-slate-100 transition-shadow duration-200 ${
        scrolled ? 'shadow-md' : ''
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 bg-sky-600 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-sky-700 transition">
              <span className="text-white text-[11px] font-bold tracking-tight">SM</span>
            </div>
            <div className="leading-none">
              <div className="text-sm font-bold text-slate-900 group-hover:text-sky-600 transition">SiteMedic</div>
              <div className="text-[10px] text-slate-400 font-medium">UK Occupational Health Platform</div>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label, external }) =>
              external ? (
                <a
                  key={href}
                  href={href}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition font-medium"
                >
                  {label}
                </a>
              ) : (
                <Link
                  key={href}
                  href={href}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition font-medium"
                >
                  {label}
                </Link>
              )
            )}
            <div className="w-px h-5 bg-slate-200 mx-2" />
            <a
              href={`${process.env.NEXT_PUBLIC_PROVIDER_APP_URL || 'http://localhost:30500'}/login`}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 rounded-lg transition font-medium"
            >
              Sign In
            </a>
            <Link
              href="#get-started"
              className="bg-sky-600 text-white px-5 py-2 rounded-lg hover:bg-sky-700 text-sm font-semibold transition"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile */}
          <button
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 transition"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div className="md:hidden border-t border-slate-100 py-3 pb-4 space-y-1">
            {navLinks.map(({ href, label, external }) =>
              external ? (
                <a
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-2.5 text-sm text-slate-700 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition font-medium"
                >
                  {label}
                </a>
              ) : (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-2.5 text-sm text-slate-700 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition font-medium"
                >
                  {label}
                </Link>
              )
            )}
            <div className="pt-2 px-4 space-y-2">
              <a
                href={`${process.env.NEXT_PUBLIC_PROVIDER_APP_URL || 'http://localhost:30500'}/login`}
                onClick={() => setMobileOpen(false)}
                className="block w-full border border-slate-200 text-slate-700 px-5 py-3 rounded-lg hover:bg-slate-50 text-center font-medium text-sm transition"
              >
                Sign In
              </a>
              <Link
                href="#get-started"
                onClick={() => setMobileOpen(false)}
                className="block w-full bg-sky-600 text-white px-5 py-3 rounded-lg hover:bg-sky-700 text-center font-semibold text-sm transition"
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
