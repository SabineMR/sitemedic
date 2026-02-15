/**
 * Seed Test Data Edge Function
 * Phase 1.5: Idempotent test data seeder for development
 *
 * Purpose: Create 1 client, 1 medic, 1 booking, and 1 territory assignment
 * Idempotency: Uses deterministic UUIDs to prevent duplicate seeding
 *
 * Test Data:
 * - Client: ABC Construction Ltd (sarah@abcconstruction.co.uk)
 * - Medic: James Wilson (james.wilson@sitemedic.co.uk)
 * - Booking: 8-hour shift at Canary Wharf (£30/hr, 0% urgency)
 * - Territory: E1 London assigned to test medic
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Deterministic UUIDs for idempotency
const TEST_CLIENT_ID = '10000000-0000-0000-0000-000000000001';
const TEST_MEDIC_ID = '20000000-0000-0000-0000-000000000001';
const TEST_BOOKING_ID = '30000000-0000-0000-0000-000000000001';

serve(async (req: Request) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    console.log('🌱 Starting test data seed...');

    const results = {
      client: null as any,
      medic: null as any,
      booking: null as any,
      territory: null as any,
    };

    // =========================================================================
    // STEP 1: Seed Test Client
    // =========================================================================
    console.log('📦 Seeding test client...');

    const { data: existingClient } = await supabase
      .from('clients')
      .select('*')
      .eq('id', TEST_CLIENT_ID)
      .single();

    if (existingClient) {
      console.log('✅ Test client already exists');
      results.client = existingClient;
    } else {
      const { data: newClient, error: clientError } = await supabase
        .from('clients')
        .insert({
          id: TEST_CLIENT_ID,
          user_id: null, // NOTE: Requires manual auth.users creation
          company_name: 'ABC Construction Ltd',
          vat_number: 'GB123456789',
          billing_address: '123 Construction Way, London',
          billing_postcode: 'E1 6AN',
          contact_name: 'Sarah Mitchell',
          contact_email: 'sarah@abcconstruction.co.uk',
          contact_phone: '+44 20 7946 0958',
          payment_terms: 'net_30',
          credit_limit: 10000.00,
          status: 'active',
        })
        .select()
        .single();

      if (clientError) {
        throw new Error(`Failed to seed client: ${clientError.message}`);
      }

      console.log('✅ Test client created');
      results.client = newClient;
    }

    // =========================================================================
    // STEP 2: Seed Test Medic
    // =========================================================================
    console.log('🏥 Seeding test medic...');

    const { data: existingMedic } = await supabase
      .from('medics')
      .select('*')
      .eq('id', TEST_MEDIC_ID)
      .single();

    if (existingMedic) {
      console.log('✅ Test medic already exists');
      results.medic = existingMedic;
    } else {
      // NOTE: This will fail if user_id constraint is enforced
      // In production, create auth.users record first via Supabase Admin API
      const { data: newMedic, error: medicError } = await supabase
        .from('medics')
        .insert({
          id: TEST_MEDIC_ID,
          user_id: TEST_MEDIC_ID, // Use same UUID - requires manual auth.users creation
          first_name: 'James',
          last_name: 'Wilson',
          email: 'james.wilson@sitemedic.co.uk',
          phone: '+44 7700 900123',
          home_address: '10 Downing Street, Westminster',
          home_postcode: 'SW1A 1AA',
          has_confined_space_cert: true,
          has_trauma_cert: true,
          employment_status: 'self_employed',
          available_for_work: true,
          certifications: [],
        })
        .select()
        .single();

      if (medicError) {
        // If foreign key constraint fails, log warning and continue
        console.warn(`⚠️  Failed to seed medic (auth.users may not exist): ${medicError.message}`);
        console.warn('💡 Manual step: Create auth.users record with id ' + TEST_MEDIC_ID);
        results.medic = { error: medicError.message, manual_step_required: true };
      } else {
        console.log('✅ Test medic created');
        results.medic = newMedic;
      }
    }

    // =========================================================================
    // STEP 3: Calculate Pricing for Test Booking
    // =========================================================================
    console.log('💰 Calculating test booking pricing...');

    // Test booking: 8 hours @ £30/hr, 0% urgency, no travel surcharge
    const shift_hours = 8;
    const base_rate = 30.00;
    const urgency_premium_percent = 0;

    const hourly_total = base_rate * shift_hours; // 240
    const urgency_amount = hourly_total * (urgency_premium_percent / 100); // 0
    const subtotal = hourly_total + urgency_amount; // 240
    const vat = subtotal * 0.20; // 48
    const total = subtotal + vat; // 288
    const platform_fee = total * 0.40; // 115.20
    const medic_payout = total - platform_fee; // 172.80

    console.log(`📊 Pricing: subtotal £${subtotal}, VAT £${vat}, total £${total}`);

    // =========================================================================
    // STEP 4: Seed Test Booking
    // =========================================================================
    console.log('📅 Seeding test booking...');

    const { data: existingBooking } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', TEST_BOOKING_ID)
      .single();

    if (existingBooking) {
      console.log('✅ Test booking already exists');
      results.booking = existingBooking;
    } else {
      // Calculate tomorrow's date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const shift_date = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD

      const { data: newBooking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          id: TEST_BOOKING_ID,
          client_id: TEST_CLIENT_ID,
          medic_id: TEST_MEDIC_ID,
          site_name: 'Canary Wharf Development',
          site_address: '1 Canada Square, Canary Wharf',
          site_postcode: 'E14 5AB',
          site_contact_name: 'Bob Builder',
          site_contact_phone: '+44 20 7946 0123',
          shift_date: shift_date,
          shift_start_time: '08:00:00',
          shift_end_time: '16:00:00',
          shift_hours: shift_hours,
          base_rate: base_rate,
          urgency_premium_percent: urgency_premium_percent,
          travel_surcharge: 0,
          out_of_territory_cost: 0,
          out_of_territory_type: null,
          subtotal: subtotal,
          vat: vat,
          total: total,
          platform_fee: platform_fee,
          medic_payout: medic_payout,
          status: 'confirmed',
          confined_space_required: false,
          trauma_specialist_required: false,
          is_recurring: false,
        })
        .select()
        .single();

      if (bookingError) {
        throw new Error(`Failed to seed booking: ${bookingError.message}`);
      }

      console.log('✅ Test booking created');
      results.booking = newBooking;
    }

    // =========================================================================
    // STEP 5: Update Territory with Test Medic
    // =========================================================================
    console.log('🗺️  Assigning test medic to E1 territory...');

    const { data: territory, error: territoryError } = await supabase
      .from('territories')
      .update({
        primary_medic_id: TEST_MEDIC_ID,
      })
      .eq('postcode_sector', 'E1')
      .select()
      .single();

    if (territoryError) {
      console.warn(`⚠️  Failed to update territory: ${territoryError.message}`);
      results.territory = { error: territoryError.message };
    } else {
      console.log('✅ Territory E1 assigned to test medic');
      results.territory = territory;
    }

    // =========================================================================
    // SUMMARY
    // =========================================================================
    console.log('🎉 Test data seeding complete!');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Test data seeded successfully',
        data: {
          client: {
            id: TEST_CLIENT_ID,
            company_name: results.client?.company_name || 'N/A',
            contact_email: results.client?.contact_email || 'N/A',
          },
          medic: {
            id: TEST_MEDIC_ID,
            name: results.medic?.first_name ? `${results.medic.first_name} ${results.medic.last_name}` : 'N/A',
            email: results.medic?.email || 'N/A',
            manual_step_required: results.medic?.manual_step_required || false,
          },
          booking: {
            id: TEST_BOOKING_ID,
            site_name: results.booking?.site_name || 'N/A',
            shift_date: results.booking?.shift_date || 'N/A',
            pricing: {
              subtotal: results.booking?.subtotal || 0,
              vat: results.booking?.vat || 0,
              total: results.booking?.total || 0,
              medic_payout: results.booking?.medic_payout || 0,
            },
          },
          territory: {
            postcode_sector: results.territory?.postcode_sector || 'E1',
            primary_medic_assigned: !!results.territory?.primary_medic_id,
          },
        },
        note: 'If medic creation failed, manually create auth.users record with id: ' + TEST_MEDIC_ID,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error seeding test data:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
