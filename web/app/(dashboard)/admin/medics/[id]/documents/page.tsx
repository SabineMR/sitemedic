/**
 * Admin Medic Documents Page
 * Phase 45-03: View compliance documents for a specific medic
 *
 * Server component that renders the AdminDocumentView client component.
 * Accessible from admin dashboard to view any medic's documents.
 */

import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminDocumentView } from '@/components/documents/admin-document-view';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminMedicDocumentsPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch medic details for display
  const { data: medic, error } = await supabase
    .from('medics')
    .select('id, first_name, last_name, email')
    .eq('id', id)
    .single();

  if (error || !medic) {
    notFound();
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">
            {medic.first_name} {medic.last_name}
          </h1>
          <p className="text-muted-foreground text-sm">{medic.email}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Compliance Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AdminDocumentView medicId={id} />
        </CardContent>
      </Card>
    </div>
  );
}
