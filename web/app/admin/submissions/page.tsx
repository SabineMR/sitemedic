/**
 * Admin Submissions Page
 *
 * CRM view for all incoming leads — contact enquiries and quote requests.
 * Two-tab UI: Contact Enquiries and Quote Requests.
 * Admins can search, filter, change status inline, and convert quotes to bookings.
 */

'use client';

import { useState } from 'react';
import { Inbox } from 'lucide-react';
import { ContactSubmissionsTable } from '@/components/admin/contact-submissions-table';
import { QuoteSubmissionsTable } from '@/components/admin/quote-submissions-table';

type ActiveTab = 'contact' | 'quotes';

export default function SubmissionsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('contact');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
      {/* Header */}
      <header className="bg-gray-800/50 backdrop-blur-xl border-b border-gray-700/50 px-8 py-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight flex items-center gap-3">
              <Inbox className="w-8 h-8 text-blue-400" />
              Leads
            </h1>
            <p className="text-gray-400 text-sm">Manage contact enquiries and quote requests</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-8">
        {/* Tab switcher */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('contact')}
            className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
              activeTab === 'contact'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Contact Enquiries
          </button>
          <button
            onClick={() => setActiveTab('quotes')}
            className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
              activeTab === 'quotes'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Quote Requests
          </button>
        </div>

        {/* Tab content */}
        {activeTab === 'contact' ? (
          <ContactSubmissionsTable />
        ) : (
          <QuoteSubmissionsTable />
        )}
      </div>
    </div>
  );
}
