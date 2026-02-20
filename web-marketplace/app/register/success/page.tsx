/**
 * Registration Success Page
 * Phase 32: Marketplace Company Registration
 *
 * Shown after a company successfully registers on the marketplace.
 * Informs the user about next steps (document upload, verification).
 */

import Link from 'next/link';
import { CheckCircle2, FileText, Shield, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function RegistrationSuccessPage() {
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="w-16 h-16 bg-green-600/20 border border-green-600/30 rounded-2xl flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-green-400" />
        </div>

        <h1 className="text-2xl font-bold text-white">Registration Submitted!</h1>

        <p className="text-gray-400">
          Your company has been registered on the SiteMedic Marketplace.
          You can now browse available events.
        </p>

        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6 space-y-4 text-left">
          <h2 className="text-white font-semibold text-sm uppercase tracking-wider">
            Next Steps
          </h2>

          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-gray-200 text-sm font-medium">Upload compliance documents</p>
              <p className="text-gray-500 text-xs">
                Upload your insurance certificates and DBS checks for verification.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-gray-200 text-sm font-medium">Await verification</p>
              <p className="text-gray-500 text-xs">
                Our team will review your documents and verify your company.
                Once verified, you can submit quotes on events.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            asChild
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-500 hover:to-blue-600"
          >
            <Link href="/admin">
              Go to Dashboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>

          <Button
            asChild
            variant="ghost"
            className="w-full text-gray-400 hover:text-white border border-gray-700/50"
          >
            <Link href="/">Return Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
