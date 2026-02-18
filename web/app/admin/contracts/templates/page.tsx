/**
 * Admin Contract Templates Page
 *
 * Manage contract templates with CRUD operations.
 * Create, edit, archive, and set default templates.
 */

import { getContractTemplates } from '@/lib/contracts/queries';
import { TemplateManager } from '@/components/contracts/template-manager';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export default async function AdminContractTemplatesPage() {
  const templates = await getContractTemplates();

  return (
    <div className="p-6 space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link href="/admin" className="hover:text-white">
          Admin
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/admin/contracts" className="hover:text-white">
          Contracts
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-white font-medium">Templates</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Contract Templates</h1>
        <p className="text-gray-400">
          Create and manage reusable contract templates with clauses and terms
        </p>
      </div>

      {/* Template Manager */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <TemplateManager templates={templates} />
      </div>
    </div>
  );
}
