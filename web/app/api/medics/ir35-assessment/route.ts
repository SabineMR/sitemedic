import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateIR35Status } from '@/lib/medics/ir35-validator';
import { requireOrgId } from '@/lib/organizations/org-resolver';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Multi-tenant: Get current user's org_id
    const orgId = await requireOrgId();

    const body = await req.json();
    const {
      medicId,
      employment_status,
      utr,
      umbrella_company_name,
      cest_assessment_result,
      cest_assessment_date,
      cest_pdf_url,
    } = body;

    // Validate user is the medic or admin
    // IMPORTANT: Filter by org_id to prevent cross-org access
    const { data: medic, error: medicError } = await supabase
      .from('medics')
      .select('user_id, email, first_name, last_name, stripe_account_id, stripe_onboarding_url')
      .eq('id', medicId)
      .eq('org_id', orgId)
      .single();

    if (medicError || !medic) {
      return NextResponse.json({ error: 'Medic not found' }, { status: 404 });
    }

    // Check authorization (must be own profile or admin)
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.role === 'admin';
    const isOwnProfile = medic.user_id === user.id;

    if (!isAdmin && !isOwnProfile) {
      return NextResponse.json({ error: 'Forbidden: Cannot update other medic profiles' }, { status: 403 });
    }

    // Validate IR35 data
    const validation = validateIR35Status({
      employment_status,
      utr: employment_status === 'self_employed' ? utr : undefined,
      umbrella_company_name: employment_status === 'umbrella' ? umbrella_company_name : undefined,
      cest_assessment_result,
      cest_assessment_date,
      cest_pdf_url,
    });

    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid IR35 data', details: validation.errors },
        { status: 400 }
      );
    }

    // Update medics table
    // IMPORTANT: Filter by org_id for safety
    const { error: updateError } = await supabase
      .from('medics')
      .update({
        employment_status,
        utr: employment_status === 'self_employed' ? utr : null,
        umbrella_company_name: employment_status === 'umbrella' ? umbrella_company_name : null,
        cest_assessment_result,
        cest_assessment_date,
        cest_pdf_url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', medicId)
      .eq('org_id', orgId);

    if (updateError) {
      console.error('Error updating medic IR35 status:', updateError);
      return NextResponse.json({ error: 'Failed to update IR35 status' }, { status: 500 });
    }

    // Create Stripe Express account if doesn't exist
    let stripeOnboardingUrl = medic.stripe_onboarding_url;

    if (!medic.stripe_account_id) {
      console.log('Creating Stripe Express account for medic:', medicId);

      // Call Stripe Connect Edge Function
      const { data: stripeData, error: stripeError } = await supabase.functions.invoke('stripe-connect', {
        body: {
          action: 'create_express_account',
          medic_id: medicId,
          email: medic.email,
          first_name: medic.first_name,
          last_name: medic.last_name,
        },
      });

      if (stripeError) {
        console.error('Error creating Stripe Express account:', stripeError);
        return NextResponse.json(
          { error: 'Failed to create Stripe account', details: stripeError.message },
          { status: 500 }
        );
      }

      stripeOnboardingUrl = stripeData.onboarding_url;

      // Update medic with Stripe account details
      // IMPORTANT: Filter by org_id for safety
      await supabase
        .from('medics')
        .update({
          stripe_account_id: stripeData.account_id,
          stripe_onboarding_url: stripeData.onboarding_url,
        })
        .eq('id', medicId)
        .eq('org_id', orgId);
    }

    // Log IR35 assessment completion
    console.log(`IR35 assessment completed for medic ${medicId}: ${employment_status}`);

    return NextResponse.json({
      success: true,
      stripe_onboarding_url: stripeOnboardingUrl,
    });
  } catch (error) {
    console.error('Error in IR35 assessment API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
