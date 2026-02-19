/**
 * Dashboard layout shell
 *
 * Responsive sidebar navigation with auth protection.
 * Desktop: Fixed 256px sidebar
 * Mobile/tablet: Hidden sidebar with hamburger menu (Sheet component)
 */

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
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
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { LogOut, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { DashboardNav } from '@/components/dashboard/DashboardNav';
import { fetchTotalUnreadCount } from '@/lib/queries/comms';

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

  // Fetch total unread message count for header badge
  const totalUnread = await fetchTotalUnreadCount(supabase);

  // Read org branding from middleware headers (server component — direct access)
  const headersList = await headers();
  const companyName = headersList.get('x-org-company-name') || 'SiteMedic';
  const logoUrl = headersList.get('x-org-logo-url') || '';
  const tagline = headersList.get('x-org-tagline') || 'Dashboard';

  return (
    <QueryProvider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          {/* Sidebar */}
          <Sidebar>
            <SidebarHeader>
              <div className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {logoUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={logoUrl}
                      alt={companyName}
                      className="max-h-10 w-auto object-contain"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-[color:var(--org-primary)] rounded-xl flex items-center justify-center">
                      <span className="text-white font-bold text-lg">
                        {companyName.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <h2 className="text-lg font-semibold">{companyName}</h2>
                    <p className="text-sm text-muted-foreground">{tagline}</p>
                  </div>
                </div>
              </div>
            </SidebarHeader>

            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>Navigation</SidebarGroupLabel>
                <SidebarGroupContent>
                  <DashboardNav />
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
              <Link
                href="/messages"
                className="relative p-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <MessageSquare className="h-5 w-5" />
                {totalUnread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </span>
                )}
              </Link>
            </header>

            {/* Page content */}
            <div className="flex-1 p-4 lg:p-6">{children}</div>
          </main>
        </div>
      </SidebarProvider>
    </QueryProvider>
  );
}
