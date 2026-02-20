/**
 * Medic Portal Layout
 *
 * Used by the 'medic' role — separate from the admin layout.
 * Green accent to distinguish from the admin (blue) and platform (purple) layouts.
 *
 * Access: medic role only
 */

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  LayoutDashboard,
  Calendar,
  Clock,
  FileText,
  User,
  LogOut,
} from 'lucide-react';
import { QueryProvider } from '@/components/providers/query-provider';

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
}

export default function MedicLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('Medic');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUserEmail(user.email ?? '');
      const name = user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Medic';
      setUserName(name.charAt(0).toUpperCase() + name.slice(1));
      setLoading(false);
    }
    fetchUser();
  }, [router]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  const navItems: NavItem[] = [
    { name: 'Dashboard', href: '/medic', icon: <LayoutDashboard className="w-5 h-5" /> },
    { name: 'My Shifts', href: '/medic/shifts', icon: <Calendar className="w-5 h-5" /> },
    { name: 'Timesheets', href: '/medic/timesheets', icon: <Clock className="w-5 h-5" /> },
    { name: 'Payslips', href: '/medic/payslips', icon: <FileText className="w-5 h-5" /> },
    { name: 'Documents', href: '/medic/documents', icon: <FileText className="w-5 h-5" /> },
    { name: 'My Profile', href: '/medic/profile', icon: <User className="w-5 h-5" /> },
  ];

  const isActive = (href: string) => {
    if (href === '/medic') return pathname === '/medic';
    return pathname?.startsWith(href);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryProvider>
      <div className="flex h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
        {/* Sidebar */}
        <aside className="w-64 bg-gray-800/50 backdrop-blur-xl border-r border-gray-700/50 flex flex-col shadow-2xl">
          {/* Brand */}
          <div className="p-6 border-b border-gray-700/50">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-110">
                <span className="text-white font-bold text-xl">SM</span>
              </div>
              <div>
                <h1 className="text-white font-bold text-lg tracking-tight">SiteMedic</h1>
                <p className="text-gray-400 text-xs">Medic Portal</p>
              </div>
            </Link>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-4 overflow-y-auto">
            <ul className="space-y-1">
              {navItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative ${
                        active
                          ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg shadow-green-500/20'
                          : 'text-gray-300 hover:bg-gray-700/50 hover:text-white hover:scale-105'
                      }`}
                    >
                      <span className={`transition-transform duration-200 ${active ? '' : 'group-hover:scale-110'}`}>
                        {item.icon}
                      </span>
                      <span className="font-medium">{item.name}</span>
                      {active && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-10 bg-white rounded-r shadow-lg" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User + Sign Out */}
          <div className="p-4 border-t border-gray-700/50 space-y-2">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-700/50">
              <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-green-700 rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
                <span className="text-white text-sm font-bold">
                  {userName.slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{userName}</p>
                <p className="text-gray-400 text-xs truncate">{userEmail}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all text-sm"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </QueryProvider>
  );
}
