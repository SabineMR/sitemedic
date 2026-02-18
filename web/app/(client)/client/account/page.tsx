/**
 * Client Account Settings Page
 *
 * Shows client profile info and contact details.
 * Read-only for now; changes require contacting support.
 */

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Building2, Mail, Phone, MapPin } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useOrg } from '@/contexts/org-context';

interface ClientProfile {
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  billing_address: string;
  payment_terms: string;
  credit_limit: number;
  created_at: string;
}

export default function ClientAccountPage() {
  const { orgId, loading: orgLoading } = useOrg();
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    async function fetchProfile() {
      if (!orgId) return;

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;
      setUserEmail(user.email || '');

      const { data, error } = await supabase
        .from('clients')
        .select(
          'company_name, contact_name, contact_email, contact_phone, billing_address, payment_terms, credit_limit, created_at'
        )
        .eq('user_id', user.id)
        .eq('org_id', orgId)
        .single();

      if (!error && data) {
        setProfile(data);
      }
      setLoading(false);
    }

    if (!orgLoading) {
      fetchProfile();
    }
  }, [orgId, orgLoading]);

  if (loading || orgLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-3 text-muted-foreground">Loading account...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Account</h1>
          <p className="text-muted-foreground">Your account information</p>
        </div>

        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground mb-2">
              No client profile found for your account.
            </p>
            <p className="text-sm text-muted-foreground">
              Signed in as: {userEmail}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">My Account</h1>
        <p className="text-muted-foreground">
          View your company and contact details
        </p>
      </div>

      {/* Company Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Company Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Company Name</p>
              <p className="font-medium">{profile.company_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Contact Name</p>
              <p className="font-medium">{profile.contact_name}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Details */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                Email
              </p>
              <p className="font-medium">{profile.contact_email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" />
                Phone
              </p>
              <p className="font-medium">{profile.contact_phone || 'Not set'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                Billing Address
              </p>
              <p className="font-medium">
                {profile.billing_address || 'Not set'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Info */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Payment Terms</p>
              <Badge variant="outline" className="mt-1">
                {profile.payment_terms === 'net_30' ? 'Net 30' : 'Prepay'}
              </Badge>
            </div>
            {profile.credit_limit > 0 && (
              <div>
                <p className="text-sm text-muted-foreground">Credit Limit</p>
                <p className="font-medium">
                  {new Intl.NumberFormat('en-GB', {
                    style: 'currency',
                    currency: 'GBP',
                  }).format(profile.credit_limit)}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Member Since</p>
              <p className="font-medium">
                {new Date(profile.created_at).toLocaleDateString('en-GB', {
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact support */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="py-4">
          <p className="text-sm text-blue-800">
            Need to update your details?{' '}
            <a
              href="mailto:support@sitemedic.co.uk"
              className="font-medium underline"
            >
              Contact support
            </a>{' '}
            to make changes to your account.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
