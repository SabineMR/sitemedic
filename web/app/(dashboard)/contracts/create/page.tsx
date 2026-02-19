/**
 * Contract Creation Page
 * Dashboard route: /contracts/create
 *
 * Server component that fetches pending/confirmed bookings without contracts
 * and active templates, then renders the CreateContractForm.
 */

import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { CreateContractForm } from '@/components/contracts/create-contract-form';
import { redirect } from 'next/navigation';

export default async function CreateContractPage() {
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Fetch bookings that don't have existing contracts
  // Only include pending or confirmed bookings
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

  // Filter out bookings that already have contracts (not terminated)
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

  // Transform the data to match the expected interface
  // Supabase returns nested relations as arrays, we need single objects
  const availableBookings = (bookingsData || [])
    .filter((booking) => !existingBookingIds.has(booking.id))
    .map((booking: any) => ({
      ...booking,
      client: Array.isArray(booking.clients)
        ? booking.clients[0]
        : booking.clients,
    }))
    .filter((booking: any) => booking.client); // Filter out any without client data

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
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href="/dashboard" className="hover:text-foreground">
            Dashboard
          </Link>
          <span>/</span>
          <Link href="/contracts" className="hover:text-foreground">
            Contracts
          </Link>
          <span>/</span>
          <span className="text-foreground">Create</span>
        </div>
        <h1 className="text-3xl font-bold">Create Service Agreement</h1>
        <p className="text-muted-foreground mt-2">
          Generate a new contract from an existing booking
        </p>
      </div>

      {/* Form */}
      {availableBookings.length === 0 ? (
        <div className="border rounded-lg p-8 text-center">
          <p className="text-lg font-medium mb-2">No eligible bookings found</p>
          <p className="text-sm text-muted-foreground mb-4">
            All pending and confirmed bookings already have contracts, or there are no
            bookings yet.
          </p>
          <a
            href="/bookings"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            View Bookings
          </a>
        </div>
      ) : templates.length === 0 ? (
        <div className="border rounded-lg p-8 text-center">
          <p className="text-lg font-medium mb-2">No contract templates found</p>
          <p className="text-sm text-muted-foreground mb-4">
            You need at least one active contract template before creating contracts.
          </p>
          <a
            href="/contracts/templates"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Manage Templates
          </a>
        </div>
      ) : (
        <CreateContractForm bookings={availableBookings} templates={templates} />
      )}
    </div>
  );
}
