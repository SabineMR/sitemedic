'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SignaturePad } from '@/components/contracts/signature-pad';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2 } from 'lucide-react';

interface SignatureSectionProps {
  contractId: string;
}

/**
 * Client component for signature submission
 *
 * Handles signature capture and submission to API.
 * Shows success message and refreshes page after signature saved.
 */
export function SignatureSection({ contractId }: SignatureSectionProps) {
  const router = useRouter();
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSave = async (data: {
    signatureDataUrl: string;
    signedName: string;
  }) => {
    // Submit signature to API
    const response = await fetch(`/api/contracts/${contractId}/sign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to save signature');
    }

    // Show success message
    setIsSuccess(true);

    // Refresh page to show signed state
    setTimeout(() => {
      router.refresh();
    }, 2000);
  };

  if (isSuccess) {
    return (
      <Alert className="bg-green-50 border-green-200">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-900">Success!</AlertTitle>
        <AlertDescription className="text-green-800">
          Thank you! Your agreement has been signed successfully. A copy will be
          sent to your email shortly.
        </AlertDescription>
      </Alert>
    );
  }

  return <SignaturePad onSave={handleSave} />;
}
