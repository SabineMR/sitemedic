'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

const LOGIN_STORAGE_KEY = 'sitemedic_login_email';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Restore email from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOGIN_STORAGE_KEY);
      if (saved) setEmail(saved);
    } catch {}
  }, []);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEmail(val);
    try { localStorage.setItem(LOGIN_STORAGE_KEY, val); } catch {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

      setEmailSent(true);
      setLoading(false);
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Check your email</h1>
          <p className="text-slate-500 mb-1">We've sent a magic link to</p>
          <p className="font-medium text-slate-900 mb-6">{email}</p>

          <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 mb-6 text-left">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-sky-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <div className="text-sm">
                <p className="font-medium text-sky-900 mb-1">Click the link in the email to sign in</p>
                <p className="text-sky-700">The link will expire in 60 minutes for security.</p>
              </div>
            </div>
          </div>

          <p className="text-sm text-slate-400 mb-4">Didn't receive the email? Check your spam folder.</p>
          <button
            onClick={() => { setEmailSent(false); setError(null); }}
            className="w-full border border-slate-200 text-slate-700 px-5 py-3 rounded-xl font-medium text-sm hover:bg-slate-50 transition"
          >
            Send another link
          </button>

          <div className="mt-4">
            <Link href="/" className="text-sm text-sky-600 hover:underline font-medium">
              Back to home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
        <div className="flex justify-center mb-4">
          <div className="w-10 h-10 bg-sky-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">SM</span>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 text-center mb-1">SiteMedic</h1>
        <p className="text-slate-500 text-center text-sm mb-1">UK Construction Compliance Platform</p>
        <p className="text-slate-400 text-center text-sm mb-6">Enter your email to receive a login link</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="manager@example.com"
              value={email}
              onChange={handleEmailChange}
              required
              disabled={loading}
              autoFocus
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded-xl">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-600 text-white px-5 py-3 rounded-xl font-semibold text-sm hover:bg-sky-700 active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending link...' : 'Send magic link'}
          </button>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-500">
              <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              No password needed — we'll email you a secure login link
            </p>
          </div>

          <div className="text-center">
            <Link href="/" className="text-sm text-sky-600 hover:underline font-medium">
              Back to home
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
