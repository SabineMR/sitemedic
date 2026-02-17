/**
 * Platform Admin Layout - Super Admin Sidebar Navigation
 *
 * Provides navigation for SiteMedic platform owners to manage ALL organizations.
 * This is separate from /admin which is for individual org admins.
 *
 * Access: platform_admin role only
 */

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';
import {
  LayoutDashboard,
  Building2,
  TrendingUp,
  BarChart3,
  Settings,
  Users,
  Shield,
} from 'lucide-react';
import { QueryProvider } from '@/components/providers/query-provider';
import { useRequirePlatformAdmin } from '@/contexts/org-context';

interface PlatformLayoutProps {
  children: ReactNode;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  badge?: number | null;
  badgeColor?: 'red' | 'yellow' | 'blue';
}

export default function PlatformLayout({ children }: PlatformLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Require platform admin role - throws error if not authorized
  try {
    useRequirePlatformAdmin();
  } catch (error) {
    // Redirect to /admin if not a platform admin
    useEffect(() => {
      router.push('/admin');
    }, [router]);

    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400 mb-4">Platform admin access required</p>
          <p className="text-sm text-gray-500">Redirecting to organization admin...</p>
        </div>
      </div>
    );
  }

  // Navigation items for platform admin
  const navItems: NavItem[] = [
    {
      name: 'Dashboard',
      href: '/platform',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      name: 'Organizations',
      href: '/platform/organizations',
      icon: <Building2 className="w-5 h-5" />,
    },
    {
      name: 'Revenue',
      href: '/platform/revenue',
      icon: <TrendingUp className="w-5 h-5" />,
    },
    {
      name: 'Analytics',
      href: '/platform/analytics',
      icon: <BarChart3 className="w-5 h-5" />,
    },
    {
      name: 'Users',
      href: '/platform/users',
      icon: <Users className="w-5 h-5" />,
    },
    {
      name: 'Settings',
      href: '/platform/settings',
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  const isActive = (href: string) => {
    if (href === '/platform') {
      return pathname === '/platform';
    }
    return pathname?.startsWith(href);
  };

  return (
    <QueryProvider>
      <div className="flex h-screen bg-gradient-to-br from-purple-900 via-purple-900 to-indigo-900">
        {/* Sidebar */}
        <aside className="w-64 bg-purple-800/50 backdrop-blur-xl border-r border-purple-700/50 flex flex-col shadow-2xl">
          {/* Logo/Brand */}
          <div className="p-6 border-b border-purple-700/50">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-110">
                <span className="text-white font-bold text-xl">SM</span>
              </div>
              <div>
                <h1 className="text-white font-bold text-lg tracking-tight">SiteMedic</h1>
                <p className="text-purple-300 text-xs">Platform Admin</p>
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
                          ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/20'
                          : 'text-purple-200 hover:bg-purple-700/50 hover:text-white hover:scale-105'
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
          <div className="p-4 border-t border-purple-700/50">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-purple-700/50 backdrop-blur-sm hover:bg-purple-700/70 transition-all duration-200 cursor-pointer group">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-purple-700 rounded-full flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-110">
                <span className="text-white text-sm font-bold">PA</span>
              </div>
              <div className="flex-1">
                <p className="text-white text-sm font-medium">Platform Admin</p>
                <p className="text-purple-300 text-xs">Super User</p>
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
