/**
 * POST /api/medics/ir35-assessment
 * Phase 6.5: Save IR35 assessment data and create Stripe Express account
 *
 * SEQUENCE:
 * 1. Validate IR35 data
 * 2. Update medics table with IR35 fields
 * 3. Create Stripe Express account if not exists
 * 4. Return Stripe onboarding URL
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateIR35Status } from '@/lib/medics/ir35-validator';

export const dynamic = 'force-dynamic';

interface IR35AssessmentRequest {
  medicId: string;
  employment_status: 'self_employed' | 'umbrella';
  utr?: string | null;
  umbrella_company_name?: string | null;
  cest_assessment_result?: string | null;
  cest_assessment_date?: string | null;
  cest_pdf_url?: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body: IR35AssessmentRequest = await request.json();

    // Validate required fields
    if (!body.medicId || !body.employment_status) {
      return NextResponse.json(
        { error: 'medicId and employment_status are required' },
        { status: 400 }
      );
    }

    // Get current user to verify authorization
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch medic to verify ownership or admin
    const { data: medic, error: medicError } = await supabase
      .from('medics')
      .select('id, user_id, email, first_name, last_name, stripe_account_id')
      .eq('id', body.medicId)
      .single();

    if (medicError || !medic) {
      return NextResponse.json(
        { error: 'Medic not found' },
        { status: 404 }
      );
    }

    // Validate user is the medic or admin (for now, just check if it's the medic's user)
    if (medic.user_id !== user.id) {
      // TODO: Add admin role check
      return NextResponse.json(
        { error: 'Forbidden: You can only update your own IR35 status' },
        { status: 403 }
      );
    }

    // Validate IR35 data
    const validation = validateIR35Status({
      employment_status: body.employment_status,
      utr: body.utr || undefined,
      umbrella_company_name: body.umbrella_company_name || undefined,
      cest_assessment_result: body.cest_assessment_result || undefined,
      cest_assessment_date: body.cest_assessment_date || undefined,
    });

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors.join(', ') },
        { status: 400 }
      );
    }

    // Update medics table with IR35 data
    const { error: updateError } = await supabase
      .from('medics')
      .update({
        employment_status: body.employment_status,
        utr: body.employment_status === 'self_employed' ? body.utr : null,
        umbrella_company_name: body.employment_status === 'umbrella' ? body.umbrella_company_name : null,
        cest_assessment_result: body.cest_assessment_result,
        cest_assessment_date: body.cest_assessment_date,
        cest_pdf_url: body.cest_pdf_url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.medicId);

    if (updateError) {
      console.error('Error updating medic IR35 data:', updateError);
      return NextResponse.json(
        { error: 'Failed to save IR35 assessment' },
        { status: 500 }
      );
    }

    // Create Stripe Express account if not exists
    let stripeOnboardingUrl = '';
    if (!medic.stripe_account_id) {
      try {
        const { data: stripeData, error: stripeError } = await supabase.functions.invoke(
          'stripe-connect',
          {
            body: {
              action: 'create_express_account',
              medic_id: body.medicId,
              email: medic.email,
              first_name: medic.first_name,
              last_name: medic.last_name,
            },
          }
        );

        if (stripeError) {
          console.error('Error creating Stripe Express account:', stripeError);
          // Don't fail the IR35 update, just log it
          return NextResponse.json(
            {
              success: true,
              stripe_onboarding_url: null,
              message: 'IR35 assessment saved. Stripe account creation pending.',
            },
            { status: 200 }
          );
        }

        stripeOnboardingUrl = stripeData.onboarding_url;
      } catch (stripeErr) {
        console.error('Stripe Express account creation error:', stripeErr);
        // Continue without failing
      }
    } else {
      // Account exists, fetch onboarding URL from medic record
      const { data: medicData } = await supabase
        .from('medics')
        .select('stripe_onboarding_url')
        .eq('id', body.medicId)
        .single();

      stripeOnboardingUrl = medicData?.stripe_onboarding_url || '';
    }

    return NextResponse.json(
      {
        success: true,
        stripe_onboarding_url: stripeOnboardingUrl,
      },
      { status: 200 }
    );

  } catch (err) {
    console.error('IR35 assessment error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
