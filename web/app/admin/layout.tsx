/**
 * Admin Layout - Sidebar Navigation
 *
 * Provides consistent left sidebar navigation across all admin pages.
 * Professional admin dashboard layout with tabs for easy section switching.
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import {
  LayoutDashboard,
  MapPin,
  Calendar,
  ClipboardList,
  Clock,
  Users,
  Building2,
  TrendingUp,
  Settings,
} from 'lucide-react';
import { QueryProvider } from '@/components/providers/query-provider';

interface AdminLayoutProps {
  children: ReactNode;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  badge?: number | null;
  badgeColor?: 'red' | 'yellow' | 'blue';
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();

  // Navigation items
  const navItems: NavItem[] = [
    {
      name: 'Dashboard',
      href: '/admin',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      name: 'Command Center',
      href: '/admin/command-center',
      icon: <MapPin className="w-5 h-5" />,
      badge: 2, // Active issues count (mock data)
      badgeColor: 'red',
    },
    {
      name: 'Bookings',
      href: '/admin/bookings',
      icon: <Calendar className="w-5 h-5" />,
      badge: 3, // Pending bookings (mock data)
      badgeColor: 'yellow',
    },
    {
      name: 'Schedule Board',
      href: '/admin/schedule-board',
      icon: <ClipboardList className="w-5 h-5" />,
      // badge: unassignedBookingsCount, // TODO: Fetch from store
      badgeColor: 'yellow',
    },
    {
      name: 'Timesheets',
      href: '/admin/timesheets',
      icon: <Clock className="w-5 h-5" />,
    },
    {
      name: 'Medics',
      href: '/admin/medics',
      icon: <Users className="w-5 h-5" />,
    },
    {
      name: 'Customers',
      href: '/admin/customers',
      icon: <Building2 className="w-5 h-5" />,
    },
    {
      name: 'Analytics',
      href: '/admin/analytics',
      icon: <TrendingUp className="w-5 h-5" />,
    },
    {
      name: 'Settings',
      href: '/admin/settings',
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname?.startsWith(href);
  };

  return (
    <QueryProvider>
      <div className="flex h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
        {/* Sidebar */}
        <aside className="w-64 bg-gray-800/50 backdrop-blur-xl border-r border-gray-700/50 flex flex-col shadow-2xl">
        {/* Logo/Brand */}
        <div className="p-6 border-b border-gray-700/50">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-110">
              <span className="text-white font-bold text-xl">SM</span>
            </div>
            <div>
              <h1 className="text-white font-bold text-lg tracking-tight">SiteMedic</h1>
              <p className="text-gray-400 text-xs">Admin Panel</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
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
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/20'
                        : 'text-gray-300 hover:bg-gray-700/50 hover:text-white hover:scale-105'
                    }`}
                  >
                    <span className={`transition-transform duration-200 ${active ? '' : 'group-hover:scale-110'}`}>
                      {item.icon}
                    </span>
                    <span className="font-medium">{item.name}</span>

                    {/* Badge */}
                    {item.badge !== undefined && item.badge !== null && item.badge > 0 && (
                      <span
                        className={`ml-auto px-2 py-1 rounded-full text-xs font-bold shadow-lg ${
                          item.badgeColor === 'red'
                            ? 'bg-red-500 text-white'
                            : item.badgeColor === 'yellow'
                            ? 'bg-yellow-500 text-gray-900'
                            : 'bg-blue-500 text-white'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}

                    {/* Active indicator */}
                    {active && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-10 bg-white rounded-r shadow-lg"></div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User info / logout (bottom of sidebar) */}
        <div className="p-4 border-t border-gray-700/50">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-700/50 backdrop-blur-sm hover:bg-gray-700/70 transition-all duration-200 cursor-pointer group">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-110">
              <span className="text-white text-sm font-bold">SA</span>
            </div>
            <div className="flex-1">
              <p className="text-white text-sm font-medium">Admin User</p>
              <p className="text-gray-400 text-xs">admin@sitemedic.co.uk</p>
            </div>
          </div>
        </div>
      </aside>

        {/* Main content area */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </QueryProvider>
  );
}
