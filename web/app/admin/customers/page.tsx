/**
 * Admin Customers Page
 *
 * Client management with Net 30 payment terms upgrade/downgrade.
 * Includes reliability scoring and at-risk client filtering.
 */

'use client';

import { Building2, UserPlus } from 'lucide-react';
import { ClientManagementTable } from '@/components/admin/client-management-table';

export default function CustomersPage() {

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
      {/* Header */}
      <header className="bg-gray-800/50 backdrop-blur-xl border-b border-gray-700/50 px-8 py-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight flex items-center gap-3">
              <Building2 className="w-8 h-8 text-blue-400" />
              Customers
            </h1>
            <p className="text-gray-400 text-sm">Manage client accounts and payment terms</p>
          </div>
          <button
            disabled
            title="Customers are created automatically through the booking flow"
            className="group px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-gray-300 rounded-xl font-medium cursor-not-allowed opacity-60 flex items-center gap-2"
          >
            <UserPlus className="w-5 h-5" />
            Add Customer
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="p-8">
        <ClientManagementTable />
      </div>
    </div>
  );
}
