/**
 * Admin Document View Component
 * Phase 45-03: View a medic's compliance documents from the admin dashboard
 *
 * Light theme (dashboard). Shows documents grouped by category with
 * download links, expiry badges, and version history.
 */

'use client';

import { useEffect, useState } from 'react';
import { FileText, Image, Download, ChevronDown, ChevronUp, Clock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { DocumentCategory, DocumentWithVersion } from '@/types/comms.types';

interface AdminDocumentViewProps {
  medicId: string;
}

function ExpiryBadge({ expiryDate }: { expiryDate: string | null }) {
  if (!expiryDate) return <Badge variant="secondary">No Expiry</Badge>;
  const daysUntil = Math.ceil(
    (new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (daysUntil < 0) return <Badge variant="destructive">Expired</Badge>;
  if (daysUntil <= 30) return <Badge className="bg-amber-100 text-amber-800">Expiring Soon</Badge>;
  return <Badge className="bg-green-100 text-green-800">Current</Badge>;
}

export function AdminDocumentView({ medicId }: AdminDocumentViewProps) {
  const [documents, setDocuments] = useState<DocumentWithVersion[]>([]);
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [medicId]);

  async function fetchData() {
    try {
      const [docsRes, catsRes] = await Promise.all([
        fetch(`/api/documents?medicId=${medicId}`),
        fetch('/api/documents/categories'),
      ]);

      if (docsRes.ok) {
        const data = await docsRes.json();
        setDocuments(data);
      }
      if (catsRes.ok) {
        const data = await catsRes.json();
        setCategories(data);
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload(documentId: string, versionId?: string) {
    setDownloading(versionId || documentId);
    try {
      const url = versionId
        ? `/api/documents/${documentId}/download?versionId=${versionId}`
        : `/api/documents/${documentId}/download`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Download failed');
      const { url: signedUrl } = await res.json();
      window.open(signedUrl, '_blank');
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloading(null);
    }
  }

  function toggleVersions(docId: string) {
    const next = new Set(expandedVersions);
    if (next.has(docId)) {
      next.delete(docId);
    } else {
      next.add(docId);
    }
    setExpandedVersions(next);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-4">
        No compliance documents uploaded for this medic.
      </p>
    );
  }

  // Group documents by category
  const grouped = categories.map((cat) => ({
    category: cat,
    docs: documents.filter((d) => d.category_slug === cat.slug),
  }));

  return (
    <div className="space-y-6">
      {grouped.map(({ category, docs }) => (
        <div key={category.id}>
          <div className="flex items-center gap-2 mb-3">
            <h4 className="font-medium text-sm">{category.name}</h4>
            <Badge variant="outline" className="text-xs">
              {docs.length}
            </Badge>
            {category.is_required && (
              <Badge variant="secondary" className="text-xs">
                Required
              </Badge>
            )}
          </div>

          {docs.length === 0 ? (
            <p className="text-muted-foreground text-xs pl-1">No documents uploaded</p>
          ) : (
            <div className="space-y-2">
              {docs.map((doc) => {
                const version = doc.current_version;
                const isExpanded = expandedVersions.has(doc.id);

                return (
                  <div
                    key={doc.id}
                    className="border rounded-lg overflow-hidden"
                  >
                    <div className="p-4 flex items-center gap-3">
                      {version?.mime_type?.startsWith('image/') ? (
                        <Image className="h-5 w-5 text-blue-500" />
                      ) : (
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {version?.file_name ?? 'Unknown file'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {version?.file_size_bytes && (
                            <span className="text-xs text-muted-foreground">
                              {version.file_size_bytes < 1024 * 1024
                                ? `${(version.file_size_bytes / 1024).toFixed(0)} KB`
                                : `${(version.file_size_bytes / (1024 * 1024)).toFixed(1)} MB`}
                            </span>
                          )}
                          <ExpiryBadge expiryDate={version?.expiry_date ?? null} />
                          <Badge variant="outline" className="text-xs">
                            v{version?.version_number ?? 1}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {version?.created_at && (
                          <span className="text-xs text-muted-foreground hidden sm:inline" suppressHydrationWarning>
                            {format(new Date(version.created_at), 'dd MMM yyyy')}
                          </span>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(doc.id)}
                          disabled={downloading === doc.id}
                        >
                          {downloading === doc.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Version history toggle */}
                    {(version?.version_number ?? 1) > 1 && (
                      <div className="border-t">
                        <button
                          onClick={() => toggleVersions(doc.id)}
                          className="w-full flex items-center justify-center gap-1 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Clock className="h-3 w-3" />
                          {isExpanded ? 'Hide' : 'Show'} version history
                          {isExpanded ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </button>
                        {isExpanded && (
                          <div className="px-4 pb-3">
                            <p className="text-xs text-muted-foreground text-center">
                              Current version: v{version?.version_number ?? 1}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
