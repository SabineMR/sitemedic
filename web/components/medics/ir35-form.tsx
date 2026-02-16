'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { validateIR35Status, type EmploymentStatus, type IR35Assessment } from '@/lib/medics/ir35-validator';

interface IR35FormProps {
  medicId: string;
  onComplete: () => void;
}

export function IR35Form({ medicId, onComplete }: IR35FormProps) {
  const [employmentStatus, setEmploymentStatus] = useState<EmploymentStatus>('self_employed');
  const [utr, setUtr] = useState('');
  const [umbrellaCompanyName, setUmbrellaCompanyName] = useState('');
  const [cestResult, setCestResult] = useState<'outside_ir35' | 'inside_ir35' | 'unknown' | ''>('');
  const [cestDate, setCestDate] = useState('');
  const [cestPdfFile, setCestPdfFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setSubmitting(true);

    try {
      // Validate IR35 data
      const assessment: IR35Assessment = {
        employment_status: employmentStatus,
        utr: employmentStatus === 'self_employed' ? utr : undefined,
        umbrella_company_name: employmentStatus === 'umbrella' ? umbrellaCompanyName : undefined,
        cest_assessment_result: cestResult || undefined,
        cest_assessment_date: cestDate || undefined,
      };

      const validation = validateIR35Status(assessment);
      if (!validation.valid) {
        setErrors(validation.errors);
        setSubmitting(false);
        return;
      }

      // Upload CEST PDF if provided
      let cestPdfUrl: string | undefined;
      if (cestPdfFile && employmentStatus === 'self_employed') {
        const timestamp = Date.now();
        const fileName = `${medicId}-${timestamp}.pdf`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('ir35-assessments')
          .upload(fileName, cestPdfFile, {
            contentType: 'application/pdf',
            upsert: false,
          });

        if (uploadError) {
          console.error('Error uploading CEST PDF:', uploadError);
          setErrors(['Failed to upload CEST assessment PDF. Please try again.']);
          setSubmitting(false);
          return;
        }

        // Get public URL
        const { data: urlData } = supabase.storage.from('ir35-assessments').getPublicUrl(fileName);
        cestPdfUrl = urlData.publicUrl;
      }

      // Submit IR35 assessment
      const response = await fetch('/api/medics/ir35-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicId,
          employment_status: employmentStatus,
          utr: employmentStatus === 'self_employed' ? utr : null,
          umbrella_company_name: employmentStatus === 'umbrella' ? umbrellaCompanyName : null,
          cest_assessment_result: cestResult || null,
          cest_assessment_date: cestDate || null,
          cest_pdf_url: cestPdfUrl || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save IR35 assessment');
      }

      // Success
      onComplete();
    } catch (err) {
      console.error('Error submitting IR35 form:', err);
      setErrors([err instanceof Error ? err.message : 'Unknown error occurred']);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Employment Status */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-3">
          Employment Status <span className="text-red-500">*</span>
        </label>
        <div className="space-y-3">
          <label className="flex items-start p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="employment_status"
              value="self_employed"
              checked={employmentStatus === 'self_employed'}
              onChange={(e) => setEmploymentStatus(e.target.value as EmploymentStatus)}
              className="mt-1 mr-3"
            />
            <div>
              <div className="font-medium text-gray-900">Self-Employed Contractor (Recommended)</div>
              <div className="text-sm text-gray-600 mt-1">
                You work independently and are responsible for your own tax and National Insurance contributions.
              </div>
            </div>
          </label>

          <label className="flex items-start p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="employment_status"
              value="umbrella"
              checked={employmentStatus === 'umbrella'}
              onChange={(e) => setEmploymentStatus(e.target.value as EmploymentStatus)}
              className="mt-1 mr-3"
            />
            <div>
              <div className="font-medium text-gray-900">Umbrella Company Employee</div>
              <div className="text-sm text-gray-600 mt-1">
                You are employed by an umbrella company which handles tax deductions and compliance.
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Self-Employed Fields */}
      {employmentStatus === 'self_employed' && (
        <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          {/* UTR */}
          <div>
            <label htmlFor="utr" className="block text-sm font-medium text-gray-900 mb-2">
              Unique Taxpayer Reference (UTR) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="utr"
              value={utr}
              onChange={(e) => setUtr(e.target.value)}
              placeholder="1234567890"
              maxLength={10}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required={employmentStatus === 'self_employed'}
            />
            <p className="text-xs text-gray-600 mt-1">10-digit number from HMRC</p>
          </div>

          {/* CEST Assessment */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              HMRC CEST Assessment (Recommended)
            </label>
            <div className="space-y-3">
              <div className="flex gap-3">
                <label className="flex-1 flex items-center p-3 border rounded cursor-pointer hover:bg-white">
                  <input
                    type="radio"
                    name="cest_result"
                    value="outside_ir35"
                    checked={cestResult === 'outside_ir35'}
                    onChange={(e) => setCestResult(e.target.value as any)}
                    className="mr-2"
                  />
                  <span className="text-sm">Outside IR35</span>
                </label>
                <label className="flex-1 flex items-center p-3 border rounded cursor-pointer hover:bg-white">
                  <input
                    type="radio"
                    name="cest_result"
                    value="inside_ir35"
                    checked={cestResult === 'inside_ir35'}
                    onChange={(e) => setCestResult(e.target.value as any)}
                    className="mr-2"
                  />
                  <span className="text-sm">Inside IR35</span>
                </label>
                <label className="flex-1 flex items-center p-3 border rounded cursor-pointer hover:bg-white">
                  <input
                    type="radio"
                    name="cest_result"
                    value="unknown"
                    checked={cestResult === 'unknown'}
                    onChange={(e) => setCestResult(e.target.value as any)}
                    className="mr-2"
                  />
                  <span className="text-sm">Unknown</span>
                </label>
              </div>

              <div>
                <label htmlFor="cest_date" className="block text-sm text-gray-700 mb-1">
                  Assessment Date
                </label>
                <input
                  type="date"
                  id="cest_date"
                  value={cestDate}
                  onChange={(e) => setCestDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="cest_pdf" className="block text-sm text-gray-700 mb-1">
                  Upload CEST PDF (Optional)
                </label>
                <input
                  type="file"
                  id="cest_pdf"
                  accept=".pdf"
                  onChange={(e) => setCestPdfFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-100 border border-blue-300 rounded p-3">
            <p className="text-sm text-blue-900">
              <strong>Important:</strong> As a self-employed contractor, you are responsible for your own tax and
              National Insurance contributions. SiteMedic will issue gross payments only (no deductions). You must
              complete a Self Assessment tax return each year.
            </p>
          </div>
        </div>
      )}

      {/* Umbrella Company Fields */}
      {employmentStatus === 'umbrella' && (
        <div className="space-y-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div>
            <label htmlFor="umbrella_company" className="block text-sm font-medium text-gray-900 mb-2">
              Umbrella Company Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="umbrella_company"
              value={umbrellaCompanyName}
              onChange={(e) => setUmbrellaCompanyName(e.target.value)}
              placeholder="e.g., PayStream, Giant Group, Brookson"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required={employmentStatus === 'umbrella'}
            />
          </div>

          {/* Info Box */}
          <div className="bg-green-100 border border-green-300 rounded p-3">
            <p className="text-sm text-green-900">
              <strong>Note:</strong> Your umbrella company will handle tax and National Insurance deductions. Payouts
              will be sent to your umbrella company's account, and they will process your payroll according to PAYE
              rules.
            </p>
          </div>
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="font-medium text-red-900 mb-2">Please fix the following errors:</p>
          <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Saving...' : 'Save IR35 Status'}
        </button>
      </div>
    </form>
  );
}
