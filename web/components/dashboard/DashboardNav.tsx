/**
 * Dashboard Navigation - Client Component
 *
 * Extracted from (dashboard)/layout.tsx because usePathname() requires a Client Component.
 * Handles active state highlighting for sidebar nav items.
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Stethoscope,
  AlertTriangle,
  Users,
  FileText,
  FileSignature,
  ShieldCheck,
  ShieldAlert,
  BarChart3,
  MessageSquare,
  Briefcase,
  Store,
} from 'lucide-react';

const navigation = [
  {
    name: 'Overview',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Treatments',
    href: '/treatments',
    icon: Stethoscope,
  },
  {
    name: 'Near-Misses',
    href: '/near-misses',
    icon: AlertTriangle,
  },
  {
    name: 'Workers',
    href: '/workers',
    icon: Users,
  },
  {
    name: 'RIDDOR',
    href: '/riddor',
    icon: ShieldAlert,
  },
  {
    name: 'Certifications',
    href: '/certifications',
    icon: ShieldCheck,
  },
  {
    name: 'Contracts',
    href: '/contracts',
    icon: FileSignature,
  },
  {
    name: 'Jobs',
    href: '/dashboard/jobs',
    icon: Briefcase,
  },
  {
    name: 'Marketplace',
    href: '/dashboard/marketplace',
    icon: Store,
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: FileText,
  },
  {
    name: 'Analytics',
    href: '/analytics/heat-map',
    icon: BarChart3,
  },
  {
    name: 'Messages',
    href: '/messages',
    icon: MessageSquare,
  },
];

export function DashboardNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    // Highlight Analytics nav item for all /analytics/* sub-pages
    if (href === '/analytics/heat-map') {
      return pathname?.startsWith('/analytics');
    }
    return pathname?.startsWith(href);
  };

  return (
    <SidebarMenu>
      {navigation.map((item) => (
        <SidebarMenuItem key={item.name}>
          <SidebarMenuButton asChild isActive={isActive(item.href)}>
            <Link href={item.href}>
              <item.icon className="h-4 w-4" />
              <span>{item.name}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
