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

interface AdminLayoutProps {
  children: ReactNode;
}

interface NavItem {
  name: string;
  href: string;
  icon: string;
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
      icon: '📊',
    },
    {
      name: 'Command Center',
      href: '/admin/command-center',
      icon: '🗺️',
      badge: 2, // Active issues count (mock data)
      badgeColor: 'red',
    },
    {
      name: 'Bookings',
      href: '/admin/bookings',
      icon: '📅',
      badge: 3, // Pending bookings (mock data)
      badgeColor: 'yellow',
    },
    {
      name: 'Schedule Board',
      href: '/admin/schedule-board',
      icon: '📋',
      // badge: unassignedBookingsCount, // TODO: Fetch from store
      badgeColor: 'yellow',
    },
    {
      name: 'Medics',
      href: '/admin/medics',
      icon: '👨‍⚕️',
    },
    {
      name: 'Customers',
      href: '/admin/customers',
      icon: '🏢',
    },
    {
      name: 'Analytics',
      href: '/admin/analytics',
      icon: '📈',
    },
    {
      name: 'Settings',
      href: '/admin/settings',
      icon: '⚙️',
    },
  ];

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname?.startsWith(href);
  };

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        {/* Logo/Brand */}
        <div className="p-6 border-b border-gray-700">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">SM</span>
            </div>
            <div>
              <h1 className="text-white font-bold text-lg">SiteMedic</h1>
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
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition group relative ${
                      active
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="font-medium">{item.name}</span>

                    {/* Badge */}
                    {item.badge !== undefined && item.badge !== null && item.badge > 0 && (
                      <span
                        className={`ml-auto px-2 py-0.5 rounded-full text-xs font-bold ${
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
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r"></div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User info / logout (bottom of sidebar) */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-700">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
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
  );
}
