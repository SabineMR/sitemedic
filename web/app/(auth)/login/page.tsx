/**
 * Login page for Site Manager Dashboard
 *
 * Magic link (passwordless) authentication using Supabase.
 * Users receive a login link via email instead of entering a password.
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, CheckCircle2 } from 'lucide-react';

const LOGIN_STORAGE_KEY = 'sitemedic_login_email';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Check for error from callback route
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError(errorParam);
    }
  }, [searchParams]);

  // Restore email from localStorage on mount
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem(LOGIN_STORAGE_KEY);
      if (savedEmail) {
        setEmail(savedEmail);
      }
    } catch (err) {
      console.error('Failed to restore email:', err);
    }
  }, []);

  // Save email to localStorage whenever it changes
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    try {
      localStorage.setItem(LOGIN_STORAGE_KEY, newEmail);
    } catch (err) {
      console.error('Failed to save email:', err);
    }
  };

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      // Show success message
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

  // If email was sent successfully, show confirmation message
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
            We've sent a magic link to
          </CardDescription>
          <p className="text-center font-medium text-foreground">{email}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
            <div className="flex items-start gap-2">
              <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">Click the link in the email to sign in</p>
                <p className="text-blue-700">The link will expire in 60 minutes for security.</p>
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

  // Default login form
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">SiteMedic</CardTitle>
        <CardDescription>Site Manager Dashboard</CardDescription>
        <p className="text-sm text-muted-foreground">
          Enter your email to receive a login link
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSendMagicLink} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="manager@example.com"
              value={email}
              onChange={handleEmailChange}
              required
              disabled={loading}
              autoFocus
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
              No password needed - we'll email you a secure login link
            </p>
          </div>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Link href="/signup" className="text-primary hover:underline font-medium">
              Sign up
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
