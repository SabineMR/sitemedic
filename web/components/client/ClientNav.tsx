'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Calendar, User, FileText, HelpCircle } from 'lucide-react';

const navigation = [
  { name: 'My Bookings', href: '/client/bookings', icon: Calendar },
  { name: 'Invoices', href: '/client/invoices', icon: FileText },
  { name: 'Account', href: '/client/account', icon: User },
  { name: 'Help & Support', href: '/client/support', icon: HelpCircle },
];

export function ClientNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
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
