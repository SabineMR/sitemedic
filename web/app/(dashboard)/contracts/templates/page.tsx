/**
 * Contract templates management page
 *
 * Admin page for creating and editing contract templates.
 * Supports clause editing, versioning, and setting default template.
 */

import { getContractTemplates } from '@/lib/contracts/queries';
import { TemplateManager } from '@/components/contracts/template-manager';
import Link from 'next/link';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default async function TemplatesPage() {
  const templates = await getContractTemplates();

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Dashboard
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/contracts" className="hover:text-foreground">
          Contracts
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">Templates</span>
      </div>

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agreement Templates</h1>
          <p className="text-muted-foreground">
            Manage contract templates, clauses, and default terms
          </p>
        </div>
        <Link href="/contracts">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Contracts
          </Button>
        </Link>
      </div>

      {/* Template manager */}
      <TemplateManager templates={templates} />
    </div>
  );
}
