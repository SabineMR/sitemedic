/**
 * Medic Documents Page
 * Phase 45-01: View and upload compliance documents
 *
 * Medic portal dark theme. Lists all documents grouped by category
 * with upload dialog for new documents and version replacements.
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { DocumentUploadDialog } from '@/components/documents/document-upload-dialog';
import { DocumentList } from '@/components/documents/document-list';
import type { DocumentCategory, DocumentWithVersion } from '@/types/comms.types';

export default function MedicDocumentsPage() {
  const [documents, setDocuments] = useState<DocumentWithVersion[]>([]);
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [replaceTarget, setReplaceTarget] = useState<{
    documentId: string;
    categoryId: string;
  } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [docsRes, catsRes] = await Promise.all([
        fetch('/api/documents'),
        fetch('/api/documents/categories'),
      ]);

      if (docsRes.ok) {
        const docsData = await docsRes.json();
        setDocuments(docsData);
      }
      if (catsRes.ok) {
        const catsData = await catsRes.json();
        setCategories(catsData);
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleUploadComplete() {
    setReplaceTarget(null);
    fetchData();
  }

  function handleUploadVersion(documentId: string, categoryId: string) {
    setReplaceTarget({ documentId, categoryId });
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">My Documents</h1>
          <p className="text-gray-400 mt-1">Upload and manage your compliance documents</p>
        </div>
        <DocumentUploadDialog onUploadComplete={handleUploadComplete} />
      </div>

      {/* Replace version dialog */}
      {replaceTarget && (
        <DocumentUploadDialog
          onUploadComplete={handleUploadComplete}
          replaceDocumentId={replaceTarget.documentId}
          presetCategoryId={replaceTarget.categoryId}
        />
      )}

      <DocumentList
        documents={documents}
        categories={categories}
        onUploadVersion={handleUploadVersion}
      />
    </div>
  );
}
