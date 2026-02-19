/**
 * Marketplace Company Registration Wizard
 * Phase 32: Foundation Schema & Registration
 *
 * 4-step wizard for CQC-registered medical companies to join the marketplace:
 *   1. Company Details (pre-filled from SiteMedic org if exists)
 *   2. CQC Verification (instant API check)
 *   3. Document Upload (compliance documents)
 *   4. Review & Submit (Stripe Connect placeholder)
 *
 * Uses Zustand store for state persistence across step navigation.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  useMarketplaceRegistrationStore,
  type UploadedDocument,
} from '@/stores/useMarketplaceRegistrationStore';
import {
  REQUIRED_DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
} from '@/lib/marketplace/compliance';
import type { RegistrationStep, DocumentType } from '@/lib/marketplace/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Building2,
  Shield,
  FileText,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Upload,
  ArrowLeft,
  ArrowRight,
  Loader2,
  X,
  Info,
} from 'lucide-react';

// =============================================================================
// Step definitions
// =============================================================================

const STEPS: { key: RegistrationStep; label: string; icon: React.ElementType }[] = [
  { key: 'company-details', label: 'Company Details', icon: Building2 },
  { key: 'cqc-verification', label: 'CQC Verification', icon: Shield },
  { key: 'document-upload', label: 'Documents', icon: FileText },
  { key: 'stripe-connect', label: 'Review & Submit', icon: CreditCard },
];

function stepIndex(step: RegistrationStep): number {
  return STEPS.findIndex((s) => s.key === step);
}

// =============================================================================
// Progress Bar
// =============================================================================

function ProgressBar({ currentStep }: { currentStep: RegistrationStep }) {
  const current = stepIndex(currentStep);

  return (
    <div className="flex items-center justify-between w-full max-w-2xl mx-auto mb-8">
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const isComplete = i < current;
        const isCurrent = i === current;
        const isUpcoming = i > current;

        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                  isComplete
                    ? 'bg-green-600 border-green-600 text-white'
                    : isCurrent
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-gray-800 border-gray-600 text-gray-400'
                }`}
              >
                {isComplete ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </div>
              <span
                className={`mt-2 text-xs font-medium hidden sm:block ${
                  isCurrent ? 'text-white' : isUpcoming ? 'text-gray-500' : 'text-gray-300'
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 ${
                  i < current ? 'bg-green-600' : 'bg-gray-700'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// Step 1: Company Details
// =============================================================================

function StepCompanyDetails({ onNext }: { onNext: () => void }) {
  const store = useMarketplaceRegistrationStore();
  const [prefilledBanner, setPrefilledBanner] = useState(false);
  const orgCheckDone = useRef(false);

  // Check if user has an existing org and pre-fill
  useEffect(() => {
    if (orgCheckDone.current) return;
    orgCheckDone.current = true;

    const checkExistingOrg = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.app_metadata?.org_id) return;

      const orgId = user.app_metadata.org_id as string;

      // Skip if already pre-filled
      if (store.existingOrgId === orgId) {
        setPrefilledBanner(true);
        return;
      }

      const { data: org } = await supabase
        .from('organizations')
        .select('name, contact_email, contact_phone, address, postcode')
        .eq('id', orgId)
        .single();

      if (org) {
        store.setExistingOrg(orgId, {
          name: org.name || '',
          email: org.contact_email || '',
          phone: org.contact_phone || undefined,
          address: org.address || undefined,
          postcode: org.postcode || undefined,
        });
        setPrefilledBanner(true);
      }
    };

    checkExistingOrg();
  }, [store]);

  const handleNext = () => {
    if (!store.companyName.trim()) {
      store.setError('Company name is required');
      return;
    }
    if (!store.companyEmail.trim()) {
      store.setError('Company email is required');
      return;
    }
    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(store.companyEmail)) {
      store.setError('Please enter a valid email address');
      return;
    }
    store.setError(null);
    onNext();
  };

  return (
    <div className="space-y-6">
      {prefilledBanner && (
        <div className="flex items-start gap-3 bg-blue-900/30 border border-blue-700/50 rounded-xl p-4">
          <Info className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
          <p className="text-sm text-blue-200">
            We&apos;ve pre-filled your details from your SiteMedic account.
            You can edit any field below.
          </p>
        </div>
      )}

      <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6 space-y-4">
        <h2 className="text-white font-semibold text-lg">Company Information</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-gray-300 text-sm font-medium block mb-1.5">
              Company Name <span className="text-red-400">*</span>
            </label>
            <Input
              value={store.companyName}
              onChange={(e) => store.updateCompanyDetails({ companyName: e.target.value })}
              placeholder="e.g. Apex Medical Services Ltd"
              className="bg-gray-900/50 border-gray-700/50 text-white placeholder-gray-500"
            />
          </div>

          <div>
            <label className="text-gray-300 text-sm font-medium block mb-1.5">
              Company Registration Number
            </label>
            <Input
              value={store.companyRegNumber}
              onChange={(e) => store.updateCompanyDetails({ companyRegNumber: e.target.value })}
              placeholder="e.g. 12345678"
              className="bg-gray-900/50 border-gray-700/50 text-white placeholder-gray-500"
            />
          </div>

          <div>
            <label className="text-gray-300 text-sm font-medium block mb-1.5">
              Email <span className="text-red-400">*</span>
            </label>
            <Input
              type="email"
              value={store.companyEmail}
              onChange={(e) => store.updateCompanyDetails({ companyEmail: e.target.value })}
              placeholder="admin@company.co.uk"
              className="bg-gray-900/50 border-gray-700/50 text-white placeholder-gray-500"
            />
          </div>

          <div>
            <label className="text-gray-300 text-sm font-medium block mb-1.5">
              Phone
            </label>
            <Input
              type="tel"
              value={store.companyPhone}
              onChange={(e) => store.updateCompanyDetails({ companyPhone: e.target.value })}
              placeholder="+44 7700 900000"
              className="bg-gray-900/50 border-gray-700/50 text-white placeholder-gray-500"
            />
          </div>

          <div>
            <label className="text-gray-300 text-sm font-medium block mb-1.5">
              Business Address
            </label>
            <Input
              value={store.companyAddress}
              onChange={(e) => store.updateCompanyDetails({ companyAddress: e.target.value })}
              placeholder="123 Business Park, Manchester"
              className="bg-gray-900/50 border-gray-700/50 text-white placeholder-gray-500"
            />
          </div>

          <div>
            <label className="text-gray-300 text-sm font-medium block mb-1.5">
              Postcode
            </label>
            <Input
              value={store.companyPostcode}
              onChange={(e) =>
                store.updateCompanyDetails({ companyPostcode: e.target.value.toUpperCase() })
              }
              placeholder="M1 1AA"
              className="bg-gray-900/50 border-gray-700/50 text-white placeholder-gray-500"
            />
          </div>
        </div>

        <div>
          <label className="text-gray-300 text-sm font-medium block mb-1.5">
            Coverage Areas
          </label>
          <p className="text-gray-500 text-xs mb-2">
            Enter postcode prefixes separated by commas (e.g. M, WA, SK, OL)
          </p>
          <Input
            value={store.coverageAreas.join(', ')}
            onChange={(e) =>
              store.updateCompanyDetails({
                coverageAreas: e.target.value
                  .split(',')
                  .map((a) => a.trim().toUpperCase())
                  .filter(Boolean),
              })
            }
            placeholder="M, WA, SK, OL"
            className="bg-gray-900/50 border-gray-700/50 text-white placeholder-gray-500"
          />
        </div>

        <div>
          <label className="text-gray-300 text-sm font-medium block mb-1.5">
            Company Description
          </label>
          <Textarea
            value={store.companyDescription}
            onChange={(e) =>
              store.updateCompanyDetails({ companyDescription: e.target.value })
            }
            placeholder="Describe your company's services, specialisms, and experience..."
            rows={3}
            className="bg-gray-900/50 border-gray-700/50 text-white placeholder-gray-500 resize-none"
          />
        </div>
      </div>

      {store.error && (
        <div className="text-sm text-red-300 bg-red-900/30 border border-red-700/50 p-3 rounded-xl">
          {store.error}
        </div>
      )}

      <div className="flex justify-end">
        <Button
          onClick={handleNext}
          className="bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-500 hover:to-blue-600"
        >
          Next: CQC Verification
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// Step 2: CQC Verification
// =============================================================================

function StepCQCVerification({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  const store = useMarketplaceRegistrationStore();
  const [verifying, setVerifying] = useState(false);
  const [inputId, setInputId] = useState(store.cqcProviderId);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const handleVerify = async () => {
    if (!inputId.trim()) {
      setVerifyError('Please enter a CQC Provider ID');
      return;
    }

    setVerifying(true);
    setVerifyError(null);

    try {
      const response = await fetch('/api/marketplace/cqc-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cqcProviderId: inputId.trim() }),
      });

      const data = await response.json();

      if (data.valid) {
        store.setCqcVerification(
          inputId.trim(),
          true,
          data.providerName || '',
          data.registrationStatus || ''
        );
        toast.success('CQC Provider verified successfully');
      } else {
        store.setCqcVerification(inputId.trim(), false, '', '');
        setVerifyError(data.error || 'Verification failed');
      }
    } catch {
      setVerifyError('Failed to verify. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6 space-y-4">
        <h2 className="text-white font-semibold text-lg">CQC Provider Verification</h2>
        <p className="text-gray-400 text-sm">
          Enter your CQC Provider ID to verify your company&apos;s CQC registration status.
          This is required for all medical service companies.
        </p>

        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              value={inputId}
              onChange={(e) => setInputId(e.target.value)}
              placeholder="e.g. 1-123456789"
              disabled={verifying}
              className="bg-gray-900/50 border-gray-700/50 text-white placeholder-gray-500"
            />
          </div>
          <Button
            onClick={handleVerify}
            disabled={verifying || !inputId.trim()}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-500 hover:to-blue-600"
          >
            {verifying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Verifying...
              </>
            ) : (
              'Verify'
            )}
          </Button>
        </div>

        <p className="text-gray-500 text-xs">
          Find your CQC provider ID at{' '}
          <a
            href="https://www.cqc.org.uk/search"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            cqc.org.uk/search
          </a>
        </p>

        {/* Verification result */}
        {store.cqcVerified && (
          <div className="flex items-start gap-3 bg-green-900/30 border border-green-700/50 rounded-xl p-4">
            <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-green-200 font-medium">{store.cqcProviderName}</p>
              <p className="text-green-300/70 text-sm">
                Status: {store.cqcRegistrationStatus} | Provider ID: {store.cqcProviderId}
              </p>
            </div>
          </div>
        )}

        {verifyError && (
          <div className="flex items-start gap-3 bg-red-900/30 border border-red-700/50 rounded-xl p-4">
            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-red-200 font-medium">Verification Failed</p>
              <p className="text-red-300/70 text-sm">{verifyError}</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <Button
          variant="ghost"
          onClick={onBack}
          className="text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button
          onClick={onNext}
          disabled={!store.cqcVerified}
          className="bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-500 hover:to-blue-600 disabled:opacity-50"
        >
          Next: Documents
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// Step 3: Document Upload
// =============================================================================

function DocumentUploadRow({
  type,
  label,
  uploaded,
  companyId,
}: {
  type: DocumentType;
  label: string;
  uploaded: UploadedDocument | undefined;
  companyId: string | null;
}) {
  const store = useMarketplaceRegistrationStore();
  const [uploading, setUploading] = useState(false);
  const [expiryDate, setExpiryDate] = useState(uploaded?.expiryDate ?? '');
  const [certificateNumber, setCertificateNumber] = useState(
    uploaded?.certificateNumber ?? ''
  );
  const [staffMemberName, setStaffMemberName] = useState(
    uploaded?.staffMemberName ?? ''
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !companyId) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('companyId', companyId);
      formData.append('documentType', type);
      if (expiryDate) formData.append('expiryDate', expiryDate);
      if (certificateNumber) formData.append('certificateNumber', certificateNumber);
      if (staffMemberName) formData.append('staffMemberName', staffMemberName);

      const response = await fetch('/api/marketplace/upload-document', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        store.addDocument({
          type,
          fileName: data.document.fileName,
          storagePath: data.document.storagePath,
          expiryDate: expiryDate || null,
          certificateNumber: certificateNumber || null,
          staffMemberName: staffMemberName || null,
        });
        toast.success(`${label} uploaded successfully`);
      } else {
        toast.error(data.error || 'Upload failed');
      }
    } catch {
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {uploaded ? (
            <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0" />
          )}
          <span className="text-gray-200 font-medium text-sm">{label}</span>
        </div>
        {uploaded ? (
          <span className="text-green-400 text-xs">{uploaded.fileName}</span>
        ) : (
          <span className="text-yellow-400 text-xs">Required</span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-gray-400 text-xs block mb-1">Expiry Date</label>
          <Input
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            className="bg-gray-900/50 border-gray-700/50 text-white text-sm h-8"
          />
        </div>
        <div>
          <label className="text-gray-400 text-xs block mb-1">Certificate No.</label>
          <Input
            value={certificateNumber}
            onChange={(e) => setCertificateNumber(e.target.value)}
            placeholder="e.g. PLI-2024-001"
            className="bg-gray-900/50 border-gray-700/50 text-white placeholder-gray-600 text-sm h-8"
          />
        </div>
        {type === 'dbs_certificate' && (
          <div>
            <label className="text-gray-400 text-xs block mb-1">Staff Member Name</label>
            <Input
              value={staffMemberName}
              onChange={(e) => setStaffMemberName(e.target.value)}
              placeholder="e.g. Jane Smith"
              className="bg-gray-900/50 border-gray-700/50 text-white placeholder-gray-600 text-sm h-8"
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
          onChange={handleUpload}
          className="hidden"
          disabled={uploading || !companyId}
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || !companyId}
          className="text-gray-300 border-gray-600 hover:bg-gray-700/50 text-xs"
        >
          {uploading ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin mr-1" />
              Uploading...
            </>
          ) : uploaded ? (
            <>
              <Upload className="w-3 h-3 mr-1" />
              Re-upload
            </>
          ) : (
            <>
              <Upload className="w-3 h-3 mr-1" />
              Upload File
            </>
          )}
        </Button>
        {uploaded && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => store.removeDocument(uploaded.storagePath)}
            className="text-red-400 hover:text-red-300 text-xs"
          >
            <X className="w-3 h-3 mr-1" />
            Remove
          </Button>
        )}
      </div>

      {!companyId && (
        <p className="text-yellow-400/70 text-xs">
          Document upload will be available after registration is submitted.
        </p>
      )}
    </div>
  );
}

function StepDocumentUpload({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  const store = useMarketplaceRegistrationStore();

  // Note: companyId will be null during initial registration.
  // Documents are uploaded AFTER the company is created (post-registration).
  // During registration, this step shows what will be needed but uploads
  // are deferred to after the company row exists.
  // However, if a company already exists (editing flow), companyId would be set.
  const companyId: string | null = null; // Will be set in future edit flows

  return (
    <div className="space-y-6">
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6 space-y-4">
        <h2 className="text-white font-semibold text-lg">Compliance Documents</h2>
        <p className="text-gray-400 text-sm">
          Upload your compliance documents. These are required for verification
          but you can continue registration and upload them later.
        </p>

        <div className="flex items-start gap-3 bg-blue-900/30 border border-blue-700/50 rounded-xl p-4">
          <Info className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
          <p className="text-sm text-blue-200">
            You can continue without uploading all documents now, but your
            company won&apos;t be verified until all required documents are
            reviewed by our team.
          </p>
        </div>

        <div className="space-y-3">
          {REQUIRED_DOCUMENT_TYPES.map((type) => {
            const uploaded = store.uploadedDocuments.find((d) => d.type === type);
            return (
              <DocumentUploadRow
                key={type}
                type={type}
                label={DOCUMENT_TYPE_LABELS[type]}
                uploaded={uploaded}
                companyId={companyId}
              />
            );
          })}
        </div>

        <div className="text-center text-gray-500 text-xs pt-2">
          Accepted formats: PDF, JPEG, PNG, WebP, DOC, DOCX (max 10MB each)
        </div>
      </div>

      <div className="flex justify-between">
        <Button
          variant="ghost"
          onClick={onBack}
          className="text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button
          onClick={onNext}
          className="bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-500 hover:to-blue-600"
        >
          Next: Review & Submit
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// Step 4: Review & Submit
// =============================================================================

function StepReviewSubmit({ onBack }: { onBack: () => void }) {
  const store = useMarketplaceRegistrationStore();
  const router = useRouter();

  const handleSubmit = async () => {
    store.setSubmitting(true);
    store.setError(null);

    try {
      const response = await fetch('/api/marketplace/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: store.companyName,
          companyRegNumber: store.companyRegNumber || undefined,
          companyEmail: store.companyEmail,
          companyPhone: store.companyPhone || undefined,
          companyAddress: store.companyAddress || undefined,
          companyPostcode: store.companyPostcode || undefined,
          coverageAreas: store.coverageAreas.length > 0 ? store.coverageAreas : undefined,
          companyDescription: store.companyDescription || undefined,
          cqcProviderId: store.cqcProviderId,
          cqcVerified: store.cqcVerified,
          cqcProviderName: store.cqcProviderName,
          cqcRegistrationStatus: store.cqcRegistrationStatus,
          existingOrgId: store.existingOrgId || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Registration submitted successfully!');
        store.reset();
        router.push('/marketplace/register/success');
      } else {
        store.setError(data.error || 'Registration failed');
        toast.error(data.error || 'Registration failed');
      }
    } catch {
      store.setError('An unexpected error occurred');
      toast.error('An unexpected error occurred');
    } finally {
      store.setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6 space-y-6">
        <h2 className="text-white font-semibold text-lg">Review Your Registration</h2>

        {/* Company Details Summary */}
        <div className="space-y-2">
          <h3 className="text-gray-300 font-medium text-sm uppercase tracking-wider">
            Company Details
          </h3>
          <div className="bg-gray-900/50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Company Name</span>
              <span className="text-white">{store.companyName}</span>
            </div>
            {store.companyRegNumber && (
              <div className="flex justify-between">
                <span className="text-gray-400">Reg. Number</span>
                <span className="text-white">{store.companyRegNumber}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-400">Email</span>
              <span className="text-white">{store.companyEmail}</span>
            </div>
            {store.companyPhone && (
              <div className="flex justify-between">
                <span className="text-gray-400">Phone</span>
                <span className="text-white">{store.companyPhone}</span>
              </div>
            )}
            {store.companyAddress && (
              <div className="flex justify-between">
                <span className="text-gray-400">Address</span>
                <span className="text-white">{store.companyAddress}</span>
              </div>
            )}
            {store.companyPostcode && (
              <div className="flex justify-between">
                <span className="text-gray-400">Postcode</span>
                <span className="text-white">{store.companyPostcode}</span>
              </div>
            )}
            {store.coverageAreas.length > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-400">Coverage</span>
                <span className="text-white">{store.coverageAreas.join(', ')}</span>
              </div>
            )}
          </div>
        </div>

        {/* CQC Verification Summary */}
        <div className="space-y-2">
          <h3 className="text-gray-300 font-medium text-sm uppercase tracking-wider">
            CQC Verification
          </h3>
          <div className="bg-gray-900/50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span className="text-green-200">{store.cqcProviderName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Provider ID</span>
              <span className="text-white">{store.cqcProviderId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Status</span>
              <span className="text-green-400">{store.cqcRegistrationStatus}</span>
            </div>
          </div>
        </div>

        {/* Documents Summary */}
        <div className="space-y-2">
          <h3 className="text-gray-300 font-medium text-sm uppercase tracking-wider">
            Documents
          </h3>
          <div className="bg-gray-900/50 rounded-xl p-4 text-sm">
            <p className="text-gray-400">
              {store.uploadedDocuments.length > 0
                ? `${store.uploadedDocuments.length} document(s) uploaded`
                : 'No documents uploaded yet — you can upload them after registration'}
            </p>
            {store.uploadedDocuments.map((doc) => (
              <div key={doc.storagePath} className="flex items-center gap-2 mt-2">
                <CheckCircle2 className="w-3 h-3 text-green-400" />
                <span className="text-gray-300">
                  {DOCUMENT_TYPE_LABELS[doc.type]}: {doc.fileName}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Stripe Connect Placeholder */}
        <div className="space-y-2">
          <h3 className="text-gray-300 font-medium text-sm uppercase tracking-wider">
            Payment Setup
          </h3>
          <div className="bg-gray-900/50 rounded-xl p-4 text-sm">
            <p className="text-gray-400">
              Stripe Connect onboarding will be available once your company is
              verified. This allows you to receive payments for marketplace bookings.
            </p>
          </div>
        </div>

        {/* Existing org link */}
        {store.existingOrgId && (
          <div className="flex items-start gap-3 bg-blue-900/30 border border-blue-700/50 rounded-xl p-4">
            <Info className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
            <p className="text-sm text-blue-200">
              Your marketplace company will be linked to your existing SiteMedic
              organisation.
            </p>
          </div>
        )}
      </div>

      {store.error && (
        <div className="text-sm text-red-300 bg-red-900/30 border border-red-700/50 p-3 rounded-xl">
          {store.error}
        </div>
      )}

      <div className="flex justify-between">
        <Button
          variant="ghost"
          onClick={onBack}
          disabled={store.isSubmitting}
          className="text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={store.isSubmitting}
          className="bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-500 hover:to-green-600"
        >
          {store.isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Submitting...
            </>
          ) : (
            <>
              Complete Registration
              <CheckCircle2 className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// Main Page Component
// =============================================================================

export default function MarketplaceRegisterPage() {
  const store = useMarketplaceRegistrationStore();

  const goToStep = (step: RegistrationStep) => {
    store.setStep(step);
  };

  const nextStep = () => {
    const current = stepIndex(store.currentStep);
    if (current < STEPS.length - 1) {
      goToStep(STEPS[current + 1].key);
    }
  };

  const prevStep = () => {
    const current = stepIndex(store.currentStep);
    if (current > 0) {
      goToStep(STEPS[current - 1].key);
    }
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen p-4 pt-8 md:pt-16">
      {/* Header */}
      <div className="text-center space-y-3 mb-8">
        <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-blue-900/40">
          <Building2 className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">
          Register Your Company
        </h1>
        <p className="text-gray-400 max-w-md mx-auto text-sm">
          Join the SiteMedic Marketplace to receive event requests and submit
          quotes for medical cover.
        </p>
      </div>

      {/* Progress Bar */}
      <ProgressBar currentStep={store.currentStep} />

      {/* Step Content */}
      <div className="w-full max-w-2xl">
        {store.currentStep === 'company-details' && (
          <StepCompanyDetails onNext={nextStep} />
        )}
        {store.currentStep === 'cqc-verification' && (
          <StepCQCVerification onNext={nextStep} onBack={prevStep} />
        )}
        {store.currentStep === 'document-upload' && (
          <StepDocumentUpload onNext={nextStep} onBack={prevStep} />
        )}
        {store.currentStep === 'stripe-connect' && (
          <StepReviewSubmit onBack={prevStep} />
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-sm">
        <Link href="/login" className="text-gray-500 hover:text-gray-300">
          Already registered? Sign in
        </Link>
      </div>
    </div>
  );
}
