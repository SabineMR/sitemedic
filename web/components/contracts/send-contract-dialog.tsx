'use client';

/**
 * Send Contract Dialog Component
 *
 * Allows admin to send contract to client via email during phone call.
 * Features:
 * - Pre-filled email input (editable)
 * - Optional CC and personal message
 * - Contract preview summary
 * - Copyable shareable link for immediate use
 * - Email delivery via Resend API
 */

import { useState } from 'react';
import { Copy, Check, Send, Mail } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Contract } from '@/lib/contracts/types';

// ============================================================================
// Types
// ============================================================================

interface ContractWithClient extends Contract {
  client: {
    id: string;
    company_name: string;
    contact_name: string;
    contact_email: string;
  };
  booking?: {
    total: number;
  };
}

interface SendContractDialogProps {
  contract: ContractWithClient;
  onSent: () => void;
  trigger: React.ReactNode;
}

// ============================================================================
// Component
// ============================================================================

export function SendContractDialog({
  contract,
  onSent,
  trigger,
}: SendContractDialogProps) {
  const [open, setOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState(
    contract.client.contact_email || ''
  );
  const [ccEmail, setCcEmail] = useState('');
  const [personalMessage, setPersonalMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Generate shareable link
  const shareableLink = contract.shareable_token
    ? `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/contracts/${contract.shareable_token}/sign`
    : null;

  // Validate contract status
  const canSend = contract.status === 'draft' || contract.status === 'amended';

  // Handle copy to clipboard
  const handleCopy = async () => {
    if (!shareableLink) return;

    try {
      await navigator.clipboard.writeText(shareableLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Handle send
  const handleSend = async () => {
    if (!canSend) {
      setError(`Cannot send contract in status: ${contract.status}`);
      return;
    }

    if (!recipientEmail) {
      setError('Recipient email is required');
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const response = await fetch('/api/contracts/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractId: contract.id,
          recipientEmail,
          ccEmail: ccEmail || undefined,
          personalMessage: personalMessage || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to send contract');
      }

      // Success
      setOpen(false);
      onSent();

      // Reset form
      setRecipientEmail(contract.client.contact_email || '');
      setCcEmail('');
      setPersonalMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send contract');
    } finally {
      setIsSending(false);
    }
  };

  // Calculate contract number display
  const contractNumber = contract.id.slice(0, 8).toUpperCase();

  // Format total amount
  const totalAmount =
    contract.upfront_amount + contract.completion_amount + contract.net30_amount;
  const formattedTotal = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(totalAmount);

  // Format payment terms
  const paymentTermsLabels: Record<string, string> = {
    full_prepay: '100% Prepayment',
    split_50_50: '50% Upfront / 50% on Completion',
    split_50_net30: '50% Upfront / 50% Net 30',
    full_net30: '100% Net 30',
    custom: 'Custom Terms',
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Send Service Agreement</DialogTitle>
          <DialogDescription>
            Send this agreement to the client for review and signature.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status validation alert */}
          {!canSend && (
            <Alert variant="destructive">
              <AlertDescription>
                Cannot send contract in status: <strong>{contract.status}</strong>. Only
                draft or amended contracts can be sent.
              </AlertDescription>
            </Alert>
          )}

          {/* Recipient email */}
          <div className="space-y-2">
            <Label htmlFor="recipient-email">
              Recipient Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="recipient-email"
              type="email"
              placeholder="client@example.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              disabled={isSending || !canSend}
            />
            <p className="text-sm text-muted-foreground">
              Pre-filled from client record (editable)
            </p>
          </div>

          {/* CC email */}
          <div className="space-y-2">
            <Label htmlFor="cc-email">CC Email (Optional)</Label>
            <Input
              id="cc-email"
              type="email"
              placeholder="manager@example.com"
              value={ccEmail}
              onChange={(e) => setCcEmail(e.target.value)}
              disabled={isSending || !canSend}
            />
          </div>

          {/* Personal message */}
          <div className="space-y-2">
            <Label htmlFor="personal-message">Personal Message (Optional)</Label>
            <Textarea
              id="personal-message"
              placeholder="Add a personal note to include in the email..."
              value={personalMessage}
              onChange={(e) => setPersonalMessage(e.target.value)}
              rows={3}
              disabled={isSending || !canSend}
            />
          </div>

          {/* Contract preview section */}
          <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
            <h3 className="font-semibold text-sm">Contract Summary</h3>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Contract Number:</span>
                <p className="font-mono font-medium">{contractNumber}</p>
              </div>

              <div>
                <span className="text-muted-foreground">Client:</span>
                <p className="font-medium">{contract.client.company_name}</p>
              </div>

              <div>
                <span className="text-muted-foreground">Total Amount:</span>
                <p className="font-medium">{formattedTotal}</p>
              </div>

              <div>
                <span className="text-muted-foreground">Payment Terms:</span>
                <p className="font-medium">
                  {paymentTermsLabels[contract.payment_terms] || contract.payment_terms}
                </p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground border-t pt-3">
              The client will receive an email with a link to view and sign this
              agreement.
            </p>
          </div>

          {/* Shareable link section */}
          {shareableLink && (
            <div className="space-y-2">
              <Label>Shareable Link</Label>
              <div className="flex gap-2">
                <Input
                  value={shareableLink}
                  readOnly
                  className="font-mono text-sm"
                  onClick={(e) => e.currentTarget.select()}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  disabled={!shareableLink}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Copy this link to share during the phone call
              </p>
            </div>
          )}

          {/* Error display */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isSending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSend}
            disabled={isSending || !canSend || !recipientEmail}
          >
            {isSending ? (
              <>
                <Mail className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Agreement
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
