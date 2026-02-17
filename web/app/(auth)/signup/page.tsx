/**
 * Signup page for SiteMedic
 *
 * Magic link (passwordless) registration using Supabase.
 * Users enter their name and email, receive a magic link, and
 * are automatically signed in on first click.
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, CheckCircle2 } from 'lucide-react';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();

      // Send magic link — if user doesn't exist, Supabase creates them
      // The full_name is stored in user metadata for profile creation on first login
      const { error: signUpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      setEmailSent(true);
      setLoading(false);
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  const handleResendLink = () => {
    setEmailSent(false);
    setError(null);
  };

  // Email sent confirmation state
  if (emailSent) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">Check your email</CardTitle>
          <CardDescription className="text-center">
            We've sent your login link to
          </CardDescription>
          <p className="text-center font-medium text-foreground">{email}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
            <div className="flex items-start gap-2">
              <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">Click the link in the email to create your account</p>
                <p className="text-blue-700">The link expires in 60 minutes for security.</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground text-center">
              Didn't receive the email? Check your spam folder.
            </p>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleResendLink}
            >
              Send another link
            </Button>
          </div>

          <div className="text-center text-sm">
            <Link href="/login" className="text-primary hover:underline font-medium">
              ← Back to login
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Signup form
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
        <CardDescription>SiteMedic — Construction Site Medic Platform</CardDescription>
        <p className="text-sm text-muted-foreground">
          Enter your details to receive a secure login link
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="fullName" className="text-sm font-medium">
              Full Name
            </label>
            <Input
              id="fullName"
              type="text"
              placeholder="Jane Smith"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="jane@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Sending link...' : 'Send magic link'}
          </Button>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <p className="text-xs text-muted-foreground text-center">
              <Mail className="inline h-3 w-3 mr-1" />
              No password needed — we'll email you a secure sign-in link
            </p>
          </div>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link href="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
