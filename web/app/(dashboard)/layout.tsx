/**
 * Dashboard layout shell
 *
 * Responsive sidebar navigation with auth protection.
 * Desktop: Fixed 256px sidebar
 * Mobile/tablet: Hidden sidebar with hamburger menu (Sheet component)
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { QueryProvider } from '@/components/providers/query-provider';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Stethoscope,
  AlertTriangle,
  Users,
  FileText,
  LogOut,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const navigation = [
  {
    name: 'Overview',
    href: '/',
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
    name: 'Reports',
    href: '/reports',
    icon: FileText,
  },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check auth - redirect to login if not authenticated
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get user email for display
  const userEmail = user.email || 'Unknown';

  return (
    <QueryProvider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          {/* Sidebar */}
          <Sidebar>
            <SidebarHeader>
              <div className="px-4 py-3">
                <h2 className="text-lg font-semibold">SiteMedic</h2>
                <p className="text-sm text-muted-foreground">Dashboard</p>
              </div>
            </SidebarHeader>

            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>Navigation</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {navigation.map((item) => (
                      <SidebarMenuItem key={item.name}>
                        <SidebarMenuButton asChild>
                          <Link href={item.href}>
                            <item.icon className="h-4 w-4" />
                            <span>{item.name}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>

            <SidebarFooter>
              <div className="px-4 py-3 border-t">
                <p className="text-sm text-muted-foreground mb-2">
                  {userEmail}
                </p>
                <form action="/api/auth/signout" method="POST">
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </form>
              </div>
            </SidebarFooter>
          </Sidebar>

          {/* Main content */}
          <main className="flex-1 flex flex-col">
            {/* Header with mobile menu button */}
            <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-16 lg:px-6">
              <SidebarTrigger />
              <div className="flex-1" />
            </header>

            {/* Page content */}
            <div className="flex-1 p-4 lg:p-6">{children}</div>
          </main>
        </div>
      </SidebarProvider>
    </QueryProvider>
  );
}
