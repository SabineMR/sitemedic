'use client';

import { useRouter } from 'next/navigation';

/**
 * Client-side refresh trigger for use as IR35Form onComplete callback
 * and "Update IR35 Status" button in server-rendered onboarding pages.
 *
 * Uses router.refresh() instead of window.location.reload() to revalidate
 * server data without a full hard browser reload (preserves scroll, no flash).
 */

export function usePageRefresh() {
  const router = useRouter();
  return () => router.refresh();
}

export function RefreshPageButton({ children, className }: { children: React.ReactNode; className?: string }) {
  const router = useRouter();
  return (
    <button onClick={() => router.refresh()} className={className}>
      {children}
    </button>
  );
}
