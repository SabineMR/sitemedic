/**
 * Client Account Settings Page
 *
 * Shows client profile with inline editing for company name,
 * contact details, and billing address.
 */

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Building2, Mail, Phone, MapPin, Pencil, Check, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useOrg } from '@/contexts/org-context';
import { toast } from 'sonner';

interface ClientProfile {
  id: string;
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
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');

  // Edit form state
  const [form, setForm] = useState({
    company_name: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    billing_address: '',
  });

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
          'id, company_name, contact_name, contact_email, contact_phone, billing_address, payment_terms, credit_limit, created_at'
        )
        .eq('user_id', user.id)
        .eq('org_id', orgId)
        .single();

      if (!error && data) {
        setProfile(data);
        setForm({
          company_name: data.company_name || '',
          contact_name: data.contact_name || '',
          contact_email: data.contact_email || '',
          contact_phone: data.contact_phone || '',
          billing_address: data.billing_address || '',
        });
      }
      setLoading(false);
    }

    if (!orgLoading) {
      fetchProfile();
    }
  }, [orgId, orgLoading]);

  const handleEdit = () => {
    setEditing(true);
  };

  const handleCancel = () => {
    if (profile) {
      setForm({
        company_name: profile.company_name || '',
        contact_name: profile.contact_name || '',
        contact_email: profile.contact_email || '',
        contact_phone: profile.contact_phone || '',
        billing_address: profile.billing_address || '',
      });
    }
    setEditing(false);
  };

  const handleSave = async () => {
    if (!profile || !orgId) return;

    setSaving(true);
    const supabase = createClient();

    const { error } = await supabase
      .from('clients')
      .update({
        company_name: form.company_name,
        contact_name: form.contact_name,
        contact_email: form.contact_email,
        contact_phone: form.contact_phone,
        billing_address: form.billing_address,
      })
      .eq('id', profile.id)
      .eq('org_id', orgId);

    if (error) {
      toast.error('Failed to update account details');
      console.error('Error updating client:', error);
    } else {
      setProfile({ ...profile, ...form });
      setEditing(false);
      toast.success('Account details updated');
    }
    setSaving(false);
  };

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Account</h1>
          <p className="text-muted-foreground">
            {editing ? 'Edit your company and contact details' : 'View your company and contact details'}
          </p>
        </div>
        {!editing && (
          <Button variant="outline" size="sm" onClick={handleEdit}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
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
          {editing ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name</Label>
                <Input
                  id="company_name"
                  value={form.company_name}
                  onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_name">Contact Name</Label>
                <Input
                  id="contact_name"
                  value={form.contact_name}
                  onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                />
              </div>
            </div>
          ) : (
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
          )}
        </CardContent>
      </Card>

      {/* Contact Details */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {editing ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_email">
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    Email
                  </span>
                </Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={form.contact_email}
                  onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_phone">
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" />
                    Phone
                  </span>
                </Label>
                <Input
                  id="contact_phone"
                  type="tel"
                  value={form.contact_phone}
                  onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="billing_address">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    Billing Address
                  </span>
                </Label>
                <Input
                  id="billing_address"
                  value={form.billing_address}
                  onChange={(e) => setForm({ ...form, billing_address: e.target.value })}
                />
              </div>
            </div>
          ) : (
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
          )}
        </CardContent>
      </Card>

      {/* Save / Cancel buttons (editing mode) */}
      {editing && (
        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
          <Button variant="outline" onClick={handleCancel} disabled={saving}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      )}

      {/* Payment Info (always read-only) */}
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
            Need to change payment terms or credit limit?{' '}
            <a
              href="mailto:support@sitemedic.co.uk"
              className="font-medium underline"
            >
              Contact support
            </a>{' '}
            to request changes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
