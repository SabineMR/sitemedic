/**
 * Analytics Sub-Navigation
 *
 * Shared tab bar used across all analytics pages (Heat Map, Compliance Trends).
 * Highlights the active tab based on the current pathname.
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { name: 'Heat Map', href: '/analytics/heat-map' },
  { name: 'Compliance Trends', href: '/analytics/compliance' },
];

export function AnalyticsSubNav() {
  const pathname = usePathname();

  return (
    <div className="flex gap-2 mb-6">
      {tabs.map((tab) => {
        const isActive = pathname?.includes(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={
              isActive
                ? 'bg-gray-700 text-white font-medium rounded-lg px-4 py-2'
                : 'text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg px-4 py-2 transition-colors'
            }
          >
            {tab.name}
          </Link>
        );
      })}
    </div>
  );
}
