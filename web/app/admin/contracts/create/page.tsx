/**
 * Admin Contract Creation Page
 *
 * Server component that fetches eligible bookings and templates,
 * then renders the CreateContractForm.
 */

import { createClient } from '@/lib/supabase/server';
import { CreateContractForm } from '@/components/contracts/create-contract-form';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export default async function AdminCreateContractPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch bookings without existing contracts
  const { data: bookingsData, error: bookingsError } = await supabase
    .from('bookings')
    .select(
      `
      id,
      client_id,
      shift_date,
      shift_start_time,
      shift_end_time,
      shift_hours,
      site_name,
      site_address,
      site_postcode,
      site_contact_name,
      site_contact_phone,
      subtotal,
      vat,
      total,
      status,
      special_notes,
      clients!inner (
        id,
        company_name,
        contact_name,
        contact_email,
        contact_phone,
        billing_address,
        payment_terms
      )
    `
    )
    .in('status', ['pending', 'confirmed'])
    .order('shift_date', { ascending: true });

  if (bookingsError) {
    console.error('Error fetching bookings:', bookingsError);
    throw new Error('Failed to load bookings');
  }

  // Filter out bookings that already have contracts
  const { data: existingContracts, error: contractsError } = await supabase
    .from('contracts')
    .select('booking_id')
    .neq('status', 'terminated');

  if (contractsError) {
    console.error('Error fetching existing contracts:', contractsError);
    throw new Error('Failed to check existing contracts');
  }

  const existingBookingIds = new Set(
    existingContracts?.map((c) => c.booking_id) || []
  );

  const availableBookings = (bookingsData || [])
    .filter((booking) => !existingBookingIds.has(booking.id))
    .map((booking: any) => ({
      ...booking,
      client: Array.isArray(booking.clients)
        ? booking.clients[0]
        : booking.clients,
    }))
    .filter((booking: any) => booking.client);

  // Fetch active contract templates
  const { data: templates, error: templatesError } = await supabase
    .from('contract_templates')
    .select('*')
    .eq('status', 'active')
    .order('is_default', { ascending: false })
    .order('name', { ascending: true });

  if (templatesError) {
    console.error('Error fetching templates:', templatesError);
    throw new Error('Failed to load contract templates');
  }

  return (
    <div className="p-6 space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link href="/admin" className="hover:text-white">
          Admin
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/admin/contracts" className="hover:text-white">
          Contracts
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-white font-medium">Create</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Create Service Agreement</h1>
        <p className="text-gray-400">
          Generate a new contract from an existing booking
        </p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        {availableBookings.length === 0 ? (
          <div className="border rounded-lg p-8 text-center">
            <p className="text-lg font-medium mb-2">No eligible bookings found</p>
            <p className="text-sm text-muted-foreground mb-4">
              All pending and confirmed bookings already have contracts, or there are no
              bookings yet.
            </p>
            <Link
              href="/admin/bookings"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              View Bookings
            </Link>
          </div>
        ) : (templates || []).length === 0 ? (
          <div className="border rounded-lg p-8 text-center">
            <p className="text-lg font-medium mb-2">No contract templates found</p>
            <p className="text-sm text-muted-foreground mb-4">
              You need at least one active contract template before creating contracts.
            </p>
            <Link
              href="/admin/contracts/templates"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Manage Templates
            </Link>
          </div>
        ) : (
          <CreateContractForm bookings={availableBookings} templates={templates || []} />
        )}
      </div>
    </div>
  );
}
