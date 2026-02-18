'use client';

import type { ContractWithRelations } from '@/lib/contracts/types';
import { formatGBP } from '@/lib/contracts/payment-schedules';

interface ContractViewerProps {
  contract: ContractWithRelations;
}

/**
 * Contract detail viewer showing all sections in HTML format
 *
 * Displays contract details in browser-friendly format (not PDF) for client review.
 * Includes all sections: parties, site, booking, pricing, payment schedule, terms.
 */
export function ContractViewer({ contract }: ContractViewerProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return 'Not specified';
    return timeString;
  };

  return (
    <div className="prose prose-slate max-w-3xl mx-auto p-8 bg-white rounded-lg shadow-sm print:shadow-none">
      {/* Header */}
      <div className="text-center mb-12 border-b-2 border-slate-200 pb-6">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">
          SERVICE AGREEMENT
        </h1>
        <p className="text-lg text-slate-600">
          Contract Number: <span className="font-semibold">{contract.id.split('-')[0]}</span>
        </p>
        <p className="text-sm text-slate-500">
          Date: {formatDate(contract.created_at)}
        </p>
      </div>

      {/* Parties Section */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Parties</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-slate-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">
              Provider
            </h3>
            <p className="text-slate-700">
              <strong>SiteMedic Ltd</strong>
              <br />
              Occupational Health Services
              <br />
              United Kingdom
            </p>
          </div>
          <div className="bg-slate-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">
              Client
            </h3>
            {contract.client ? (
              <p className="text-slate-700">
                <strong>{contract.client.company_name}</strong>
                <br />
                Email: {contract.client.contact_email}
                <br />
                {contract.client.contact_phone && `Phone: ${contract.client.contact_phone}`}
              </p>
            ) : (
              <p className="text-slate-500 italic">Client details not available</p>
            )}
          </div>
        </div>
      </section>

      {/* Site Details */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Site Details</h2>
        {contract.booking ? (
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-slate-700">
              <strong>Site:</strong> {contract.booking.site_name}
              <br />
              <strong>Address:</strong> {contract.booking.site_address}, {contract.booking.site_postcode}
            </p>
          </div>
        ) : (
          <p className="text-slate-500 italic">Site details not available</p>
        )}
      </section>

      {/* Booking Details */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">
          Booking Details
        </h2>
        {contract.booking ? (
          <div className="bg-green-50 p-4 rounded-lg space-y-2">
            {contract.booking.event_vertical && (
              <p className="text-slate-700">
                <strong>Event Type:</strong> {contract.booking.event_vertical.replace(/_/g, ' ')}
              </p>
            )}
            <p className="text-slate-700">
              <strong>Shift Date:</strong>{' '}
              {formatDate(contract.booking.shift_date)}
            </p>
          </div>
        ) : (
          <p className="text-slate-500 italic">Booking details not available</p>
        )}
      </section>

      {/* Pricing Table */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">
          Pricing Breakdown
        </h2>
        {contract.booking ? (
          <table className="w-full border-collapse">
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="py-2 px-4 text-slate-700">Subtotal</td>
                <td className="py-2 px-4 text-right font-semibold text-slate-900">
                  {formatGBP(contract.booking.subtotal)}
                </td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="py-2 px-4 text-slate-700">VAT (20%)</td>
                <td className="py-2 px-4 text-right font-semibold text-slate-900">
                  {formatGBP(contract.booking.vat)}
                </td>
              </tr>
              <tr className="bg-slate-50">
                <td className="py-3 px-4 text-lg font-bold text-slate-900">
                  Total
                </td>
                <td className="py-3 px-4 text-right text-lg font-bold text-slate-900">
                  {formatGBP(contract.booking.total)}
                </td>
              </tr>
            </tbody>
          </table>
        ) : (
          <p className="text-slate-500 italic">Pricing details not available</p>
        )}
      </section>

      {/* Payment Schedule */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">
          Payment Schedule
        </h2>
        <div className="bg-amber-50 p-4 rounded-lg space-y-3">
          {contract.upfront_amount > 0 && (
            <div className="flex justify-between items-center pb-2 border-b border-amber-200">
              <span className="text-slate-700">Upon Contract Signing</span>
              <span className="font-semibold text-slate-900">
                {formatGBP(contract.upfront_amount)}
              </span>
            </div>
          )}
          {contract.completion_amount > 0 && (
            <div className="flex justify-between items-center pb-2 border-b border-amber-200">
              <span className="text-slate-700">Upon Service Completion</span>
              <span className="font-semibold text-slate-900">
                {formatGBP(contract.completion_amount)}
              </span>
            </div>
          )}
          {contract.net30_amount > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-slate-700">
                30 Days After Service Completion
              </span>
              <span className="font-semibold text-slate-900">
                {formatGBP(contract.net30_amount)}
              </span>
            </div>
          )}
          {contract.custom_terms_description && (
            <div className="pt-2 mt-2 border-t border-amber-200">
              <p className="text-sm text-slate-600 italic">
                {contract.custom_terms_description}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Template Clauses */}
      {contract.template?.clauses && contract.template.clauses.length > 0 && (
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            Contract Clauses
          </h2>
          <div className="space-y-4">
            {contract.template.clauses
              .sort((a, b) => a.order - b.order)
              .map((clause, index) => (
                <div
                  key={index}
                  className="bg-slate-50 p-4 rounded-lg border-l-4 border-blue-500"
                >
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">
                    {index + 1}. {clause.title}
                    {clause.required && (
                      <span className="ml-2 text-xs font-normal text-red-600">
                        (Required)
                      </span>
                    )}
                  </h3>
                  <p className="text-slate-700 whitespace-pre-wrap">
                    {clause.body}
                  </p>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* Terms & Conditions */}
      {contract.template?.terms_and_conditions && (
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            Terms & Conditions
          </h2>
          <div className="bg-slate-50 p-4 rounded-lg">
            <p className="text-slate-700 whitespace-pre-wrap">
              {contract.template.terms_and_conditions}
            </p>
          </div>
        </section>
      )}

      {/* Cancellation Policy */}
      {contract.template?.cancellation_policy && (
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            Cancellation Policy
          </h2>
          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-slate-700 whitespace-pre-wrap">
              {contract.template.cancellation_policy}
            </p>
          </div>
        </section>
      )}

      {/* Signature Section (if signed) */}
      {contract.signed_at && contract.currentVersion?.client_signature_data && (
        <section className="mt-12 pt-6 border-t-2 border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Signature</h2>
          <div className="bg-green-50 p-6 rounded-lg">
            <div className="mb-4">
              <img
                src={contract.currentVersion.client_signature_data}
                alt="Client Signature"
                className="max-w-sm h-auto border-b-2 border-slate-300"
              />
            </div>
            <p className="text-slate-700">
              <strong>Signed by:</strong>{' '}
              {contract.currentVersion.client_signed_name || 'Digital Signature'}
              <br />
              <strong>Date:</strong> {formatDate(contract.signed_at)}
              {contract.currentVersion.signed_by_email && (
                <>
                  <br />
                  <strong>Email:</strong>{' '}
                  {contract.currentVersion.signed_by_email}
                </>
              )}
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
