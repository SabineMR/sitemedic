'use client';

/**
 * Contract Creation Form Component
 *
 * Multi-step form for creating contracts from bookings:
 * 1. Select booking (filters out those with existing contracts)
 * 2. Select template
 * 3. Configure payment terms
 * 4. Preview contract
 * 5. Create draft
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PaymentTermsSelect } from './payment-terms-select';
import { ContractPreview } from './contract-preview';
import type {
  PaymentTerms,
  PaymentSchedule,
  ContractTemplate,
  ContractData,
} from '@/lib/contracts/types';

// ============================================================================
// Types
// ============================================================================

interface BookingWithClient {
  id: string;
  client_id: string;
  shift_date: string;
  shift_start_time: string;
  shift_end_time: string;
  shift_hours: number;
  site_name: string;
  site_address: string;
  site_postcode: string;
  site_contact_name: string | null;
  site_contact_phone: string | null;
  subtotal: number;
  vat: number;
  total: number;
  status: string;
  special_notes: string | null;
  client: {
    id: string;
    company_name: string;
    contact_name: string;
    contact_email: string;
    contact_phone: string;
    billing_address: string;
    payment_terms: string; // 'prepay' or 'net_30'
  };
}

interface CreateContractFormProps {
  bookings: BookingWithClient[];
  templates: ContractTemplate[];
}

// ============================================================================
// Component
// ============================================================================

export function CreateContractForm({
  bookings,
  templates,
}: CreateContractFormProps) {
  const router = useRouter();

  // Form state
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    templates.find((t) => t.is_default)?.id || null
  );
  const [selectedPaymentTerms, setSelectedPaymentTerms] = useState<PaymentTerms>('full_prepay');
  const [paymentSchedule, setPaymentSchedule] = useState<PaymentSchedule | null>(null);

  // UI state
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get selected entities
  const selectedBooking = bookings.find((b) => b.id === selectedBookingId);
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  // Build preview data
  const previewData: Partial<ContractData> = selectedBooking
    ? {
        contractNumber: 'SA-XXXX-XXX', // Placeholder until created
        generatedDate: new Date().toISOString(),
        clientName: selectedBooking.client.company_name,
        clientEmail: selectedBooking.client.contact_email,
        clientPhone: selectedBooking.client.contact_phone,
        clientAddress: selectedBooking.client.billing_address,
        siteAddress: `${selectedBooking.site_address}, ${selectedBooking.site_postcode}`,
        serviceType: `On-site occupational health services at ${selectedBooking.site_name}`,
        scheduledDate: selectedBooking.shift_date,
        estimatedDuration: `${selectedBooking.shift_hours} hours`,
        subtotal: selectedBooking.subtotal,
        vatAmount: selectedBooking.vat,
        totalPrice: selectedBooking.total,
        paymentSchedule: paymentSchedule || undefined,
        clauses: selectedTemplate?.clauses || [],
        termsAndConditions: selectedTemplate?.terms_and_conditions || '',
        cancellationPolicy: selectedTemplate?.cancellation_policy || '',
        requiresSignature: true,
        signedAt: null,
        signedByName: null,
        signatureData: null,
      }
    : {};

  // Handle payment terms selection
  const handlePaymentTermsSelect = (terms: PaymentTerms, schedule: PaymentSchedule) => {
    setSelectedPaymentTerms(terms);
    setPaymentSchedule(schedule);
  };

  // Validate form completion
  const isFormComplete =
    selectedBookingId && selectedTemplateId && paymentSchedule !== null;

  // Handle contract creation
  const handleCreateContract = async () => {
    if (!isFormComplete) return;

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/contracts/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId: selectedBookingId,
          templateId: selectedTemplateId,
          paymentTerms: selectedPaymentTerms,
          upfrontAmount: paymentSchedule?.upfrontAmount,
          completionAmount: paymentSchedule?.completionAmount,
          net30Amount: paymentSchedule?.net30Amount,
          customTermsDescription:
            selectedPaymentTerms === 'custom'
              ? paymentSchedule?.description
              : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create contract');
      }

      // Success - redirect to contracts list
      router.push('/contracts?success=created');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Step 1: Select Booking */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">1. Select Booking</h2>
          <p className="text-sm text-muted-foreground">
            Choose the booking for which you want to create a contract
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="booking-select">Booking</Label>
          <Select value={selectedBookingId || ''} onValueChange={setSelectedBookingId}>
            <SelectTrigger id="booking-select">
              <SelectValue placeholder="Select a booking..." />
            </SelectTrigger>
            <SelectContent>
              {bookings.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  No eligible bookings found
                </div>
              ) : (
                bookings.map((booking) => (
                  <SelectItem key={booking.id} value={booking.id}>
                    {booking.client.company_name} - {booking.site_name} (
                    {new Date(booking.shift_date).toLocaleDateString('en-GB')}) - £
                    {booking.total.toFixed(2)}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {selectedBooking && (
          <div className="p-4 border rounded-lg bg-accent/10 space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-medium">Client</p>
                <p className="text-muted-foreground">
                  {selectedBooking.client.company_name}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedBooking.client.contact_name} •{' '}
                  {selectedBooking.client.contact_email}
                </p>
              </div>
              <div>
                <p className="font-medium">Payment Status</p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      selectedBooking.client.payment_terms === 'net_30'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {selectedBooking.client.payment_terms === 'net_30'
                      ? 'Net 30'
                      : 'Prepay'}
                  </span>
                </div>
              </div>
            </div>
            <div className="pt-2 border-t">
              <p className="font-medium">Site Details</p>
              <p className="text-muted-foreground">
                {selectedBooking.site_address}, {selectedBooking.site_postcode}
              </p>
            </div>
            <div className="pt-2 border-t">
              <p className="font-medium">Shift Details</p>
              <p className="text-muted-foreground">
                {new Date(selectedBooking.shift_date).toLocaleDateString('en-GB', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}{' '}
                • {selectedBooking.shift_start_time} - {selectedBooking.shift_end_time} (
                {selectedBooking.shift_hours}hrs)
              </p>
            </div>
            <div className="pt-2 border-t grid grid-cols-3 gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Subtotal</p>
                <p className="font-medium">£{selectedBooking.subtotal.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">VAT (20%)</p>
                <p className="font-medium">£{selectedBooking.vat.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="font-semibold text-lg">
                  £{selectedBooking.total.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Step 2: Select Template */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">2. Select Template</h2>
          <p className="text-sm text-muted-foreground">
            Choose the contract template with clauses and terms
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="template-select">Template</Label>
          <Select value={selectedTemplateId || ''} onValueChange={setSelectedTemplateId}>
            <SelectTrigger id="template-select">
              <SelectValue placeholder="Select a template..." />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                  {template.is_default && ' (Default)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedTemplate && (
          <div className="p-4 border rounded-lg bg-accent/10 text-sm">
            <p className="font-medium">{selectedTemplate.name}</p>
            {selectedTemplate.description && (
              <p className="text-muted-foreground mt-1">{selectedTemplate.description}</p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              {selectedTemplate.clauses.length} clauses • Version{' '}
              {selectedTemplate.version}
            </p>
          </div>
        )}
      </div>

      {/* Step 3: Configure Payment Terms */}
      {selectedBooking && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">3. Configure Payment Terms</h2>
            <p className="text-sm text-muted-foreground">
              Set payment schedule based on client eligibility
            </p>
          </div>

          <PaymentTermsSelect
            total={selectedBooking.total}
            clientPaymentTerms={
              selectedBooking.client.payment_terms as 'prepay' | 'net_30'
            }
            onSelect={handlePaymentTermsSelect}
            initialTerms="full_prepay"
          />
        </div>
      )}

      {/* Step 4: Preview Contract */}
      {selectedBooking && paymentSchedule && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">4. Preview Contract</h2>
            <p className="text-sm text-muted-foreground">
              Review the contract before creating draft
            </p>
          </div>

          <ContractPreview contractData={previewData} />
        </div>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-4 pt-6 border-t">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button
          onClick={handleCreateContract}
          disabled={!isFormComplete || isCreating}
          size="lg"
        >
          {isCreating ? 'Creating...' : 'Create Draft Contract'}
        </Button>
      </div>
    </div>
  );
}
