'use client';

import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';

export default function SiteHeader() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/#services', label: 'Services' },
    { href: '/pricing', label: 'Pricing' },
  ];

  return (
    <nav
      className={`bg-white/95 backdrop-blur-sm sticky top-0 z-50 transition-shadow duration-200 ${
        scrolled ? 'shadow-md border-b border-slate-100' : 'border-b border-slate-100'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Logo / Brand */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-blue-700 transition">
              <span className="text-white text-xs font-bold tracking-tight">ASG</span>
            </div>
            <div className="hidden sm:block leading-none">
              <div className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition">
                Apex Safety Group
              </div>
              <div className="text-[10px] text-slate-400 font-medium tracking-wide">
                Powered by SiteMedic
              </div>
            </div>
            <div className="sm:hidden text-base font-bold text-slate-900">ASG</div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition font-medium"
              >
                {label}
              </Link>
            ))}

            <div className="w-px h-5 bg-slate-200 mx-2" />

            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 text-sm font-semibold transition"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 rounded-lg transition font-medium"
                >
                  Sign in
                </Link>
                <Link
                  href="/book"
                  className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 text-sm font-semibold transition"
                >
                  Book Now
                </Link>
              </>
            )}
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <button
                  className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 p-0">
                <div className="flex flex-col h-full">
                  {/* Mobile header */}
                  <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                      <span className="text-white text-xs font-bold">ASG</span>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">Apex Safety Group</div>
                      <div className="text-[10px] text-slate-400">Powered by SiteMedic</div>
                    </div>
                  </div>

                  {/* Mobile links */}
                  <div className="flex flex-col px-3 py-4 gap-1 flex-1">
                    {navLinks.map(({ href, label }) => (
                      <Link
                        key={href}
                        href={href}
                        className="px-4 py-3 text-slate-700 font-medium hover:text-blue-600 hover:bg-blue-50 rounded-lg transition text-sm"
                      >
                        {label}
                      </Link>
                    ))}
                  </div>

                  {/* Mobile CTA */}
                  <div className="px-4 pb-6 pt-2 border-t border-slate-100 space-y-2">
                    {isAuthenticated ? (
                      <Link
                        href="/dashboard"
                        className="block w-full bg-blue-600 text-white px-5 py-3 rounded-lg hover:bg-blue-700 text-center font-semibold text-sm transition"
                      >
                        Dashboard
                      </Link>
                    ) : (
                      <>
                        <Link
                          href="/login"
                          className="block w-full border border-slate-200 text-slate-700 px-5 py-3 rounded-lg hover:bg-slate-50 text-center font-medium text-sm transition"
                        >
                          Sign in
                        </Link>
                        <Link
                          href="/book"
                          className="block w-full bg-blue-600 text-white px-5 py-3 rounded-lg hover:bg-blue-700 text-center font-semibold text-sm transition"
                        >
                          Book Now
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

        </div>
      </div>
    </nav>
  );
}
