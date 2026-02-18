/**
 * Onboarding Layout
 *
 * Minimal wizard-style layout for the post-payment onboarding flow.
 * Shown to users whose org has onboarding_completed=false.
 *
 * - Full-screen dark gradient background (matches signup/setup styling)
 * - Centered content column (max-w-2xl)
 * - SiteMedic logo header (no sidebar — wizard flow)
 *
 * Route: /onboarding/*
 * Access: Authenticated users with onboarding_completed=false
 */

'use client';

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
      <header className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">SM</span>
          </div>
          <span className="text-white font-semibold">SiteMedic</span>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-6 pb-12">
        {children}
      </main>
    </div>
  );
}
