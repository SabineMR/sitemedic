'use client';

import { useRouter } from 'next/navigation';
import { IR35Form } from '@/components/medics/ir35-form';

/**
 * Client wrapper for IR35Form + "Update IR35 Status" button.
 *
 * Uses router.refresh() instead of window.location.reload() to revalidate
 * server component data without a full hard browser reload.
 */

interface IR35SectionClientProps {
  medicId: string;
  hasIR35Status: boolean;
  children?: React.ReactNode;
}

export function IR35SectionClient({ medicId, hasIR35Status, children }: IR35SectionClientProps) {
  const router = useRouter();
  const handleRefresh = () => router.refresh();

  if (!hasIR35Status) {
    return (
      <>
        <p className="text-gray-600 mb-4 text-sm">
          Medic must complete IR35 assessment before receiving payouts.
        </p>
        <IR35Form medicId={medicId} onComplete={handleRefresh} />
      </>
    );
  }

  return (
    <>
      {children}
      <div className="pt-3 border-t">
        <button
          onClick={handleRefresh}
          className="text-sm text-blue-600 hover:underline"
        >
          Update IR35 Status
        </button>
      </div>
    </>
  );
}
