/**
 * Client Portal Layout
 *
 * Sidebar navigation for client self-service portal.
 * Mirrors the dashboard layout pattern with auth protection.
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
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { LogOut } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ClientNav } from '@/components/client/ClientNav';

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const userEmail = user.email || 'Unknown';
  const userName =
    user.user_metadata?.full_name || userEmail.split('@')[0] || 'Client';

  return (
    <QueryProvider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          {/* Sidebar */}
          <Sidebar>
            <SidebarHeader>
              <div className="px-4 py-3">
                <h2 className="text-lg font-semibold">SiteMedic</h2>
                <p className="text-sm text-muted-foreground">Client Portal</p>
              </div>
            </SidebarHeader>

            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>Navigation</SidebarGroupLabel>
                <SidebarGroupContent>
                  <ClientNav />
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>

            <SidebarFooter>
              <div className="px-4 py-3 border-t">
                <p className="text-sm font-medium truncate">{userName}</p>
                <p className="text-xs text-muted-foreground mb-2 truncate">
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
            <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-16 lg:px-6">
              <SidebarTrigger />
              <div className="flex-1" />
              <Link href="/book">
                <Button size="sm">New Booking</Button>
              </Link>
            </header>

            <div className="flex-1 p-4 lg:p-6">{children}</div>
          </main>
        </div>
      </SidebarProvider>
    </QueryProvider>
  );
}
