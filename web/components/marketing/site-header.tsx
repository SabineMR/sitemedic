'use client';

import Link from 'next/link';
import { Menu } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';

export default function SiteHeader() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };

    checkAuth();
  }, []);

  return (
    <nav className="bg-white border-b border-slate-100 sticky top-0 z-50 backdrop-blur-sm bg-white/95">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-xl font-bold text-slate-900">
            ASG
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <Link href="/" className="text-slate-600 hover:text-slate-900 text-sm transition">
              Home
            </Link>
            <Link href="/pricing" className="text-slate-600 hover:text-slate-900 text-sm transition">
              Pricing
            </Link>
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium transition"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/book"
                className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium transition"
              >
                Book Now
              </Link>
            )}
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <button className="text-slate-600 hover:text-slate-900">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Open menu</span>
                </button>
              </SheetTrigger>
              <SheetContent>
                <div className="flex flex-col space-y-4 mt-8">
                  <Link
                    href="/"
                    className="text-slate-900 text-lg font-medium hover:text-blue-600 transition"
                  >
                    Home
                  </Link>
                  <Link
                    href="/pricing"
                    className="text-slate-900 text-lg font-medium hover:text-blue-600 transition"
                  >
                    Pricing
                  </Link>
                  {isAuthenticated ? (
                    <Link
                      href="/dashboard"
                      className="bg-blue-600 text-white px-5 py-3 rounded-lg hover:bg-blue-700 text-center font-medium transition"
                    >
                      Dashboard
                    </Link>
                  ) : (
                    <Link
                      href="/book"
                      className="bg-blue-600 text-white px-5 py-3 rounded-lg hover:bg-blue-700 text-center font-medium transition"
                    >
                      Book Now
                    </Link>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
