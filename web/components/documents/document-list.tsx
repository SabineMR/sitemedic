/**
 * Document List Component
 * Phase 45-01: Display documents grouped by category
 *
 * Medic portal dark theme. Shows file info, expiry badges, version history, downloads.
 */

'use client';

import { useState } from 'react';
import { FileText, Image, Download, Upload, ChevronDown, ChevronUp, Clock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import type { DocumentCategory, DocumentWithVersion, DocumentVersion } from '@/types/comms.types';

interface DocumentListProps {
  documents: DocumentWithVersion[];
  categories: DocumentCategory[];
  onUploadVersion: (documentId: string, categoryId: string) => void;
}

function ExpiryBadge({ expiryDate }: { expiryDate: string | null }) {
  if (!expiryDate) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-700/50 text-gray-400">
        No Expiry
      </span>
    );
  }
  const daysUntil = Math.ceil(
    (new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (daysUntil < 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-red-900/50 text-red-300 border border-red-700/50">
        Expired
      </span>
    );
  }
  if (daysUntil <= 30) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-yellow-900/50 text-yellow-300 border border-yellow-700/50">
        Expiring Soon
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-900/50 text-green-300 border border-green-700/50">
      Current
    </span>
  );
}

function FileTypeIcon({ mimeType }: { mimeType: string | null }) {
  if (mimeType?.startsWith('image/')) {
    return <Image className="w-5 h-5 text-blue-400" />;
  }
  return <FileText className="w-5 h-5 text-gray-400" />;
}

export function DocumentList({ documents, categories, onUploadVersion }: DocumentListProps) {
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());
  const [versionHistory, setVersionHistory] = useState<Record<string, DocumentVersion[]>>({});
  const [loadingVersions, setLoadingVersions] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState<string | null>(null);

  // Group documents by category
  const grouped = categories.map((cat) => ({
    category: cat,
    docs: documents.filter((d) => d.category_slug === cat.slug),
  }));

  async function handleDownload(documentId: string) {
    setDownloading(documentId);
    try {
      const res = await fetch(`/api/documents/${documentId}/download`);
      if (!res.ok) throw new Error('Download failed');
      const { url } = await res.json();
      window.open(url, '_blank');
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloading(null);
    }
  }

  async function handleDownloadVersion(documentId: string, versionId: string) {
    try {
      const res = await fetch(`/api/documents/${documentId}/download?versionId=${versionId}`);
      if (!res.ok) throw new Error('Download failed');
      const { url } = await res.json();
      window.open(url, '_blank');
    } catch (err) {
      console.error('Version download error:', err);
    }
  }

  async function toggleVersionHistory(documentId: string) {
    const newExpanded = new Set(expandedVersions);
    if (newExpanded.has(documentId)) {
      newExpanded.delete(documentId);
      setExpandedVersions(newExpanded);
      return;
    }

    // Fetch version history if not already loaded
    if (!versionHistory[documentId]) {
      const newLoading = new Set(loadingVersions);
      newLoading.add(documentId);
      setLoadingVersions(newLoading);

      try {
        const res = await fetch(`/api/documents?medicId=self`);
        // Version history comes from the versions table — use a separate fetch
        // For now, we mark the document as expanded with placeholder
        // The full API would need a versions endpoint; for MVP, we show current version info
      } catch {
        // ignore
      } finally {
        const updated = new Set(loadingVersions);
        updated.delete(documentId);
        setLoadingVersions(updated);
      }
    }

    newExpanded.add(documentId);
    setExpandedVersions(newExpanded);
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400 text-sm">No documents uploaded yet.</p>
        <p className="text-gray-500 text-xs mt-1">Upload your compliance documents to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {grouped.map(({ category, docs }) => (
        <div key={category.id}>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-white font-medium">{category.name}</h3>
            <span className="text-gray-500 text-xs">({docs.length})</span>
            {category.is_required && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-yellow-900/30 text-yellow-400 border border-yellow-700/30">
                Required
              </span>
            )}
          </div>

          {docs.length === 0 ? (
            <p className="text-gray-500 text-sm pl-1">No documents uploaded</p>
          ) : (
            <div className="space-y-2">
              {docs.map((doc) => {
                const version = doc.current_version;
                const isExpanded = expandedVersions.has(doc.id);

                return (
                  <div key={doc.id} className="bg-gray-700/30 border border-gray-600/50 rounded-xl overflow-hidden">
                    <div className="p-4 flex items-center gap-3">
                      <FileTypeIcon mimeType={version?.mime_type ?? null} />

                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">
                          {version?.file_name ?? 'Unknown file'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {version?.file_size_bytes && (
                            <span className="text-gray-500 text-xs">
                              {version.file_size_bytes < 1024 * 1024
                                ? `${(version.file_size_bytes / 1024).toFixed(0)} KB`
                                : `${(version.file_size_bytes / (1024 * 1024)).toFixed(1)} MB`}
                            </span>
                          )}
                          <ExpiryBadge expiryDate={version?.expiry_date ?? null} />
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-600/50 text-gray-300">
                            v{version?.version_number ?? 1}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {version?.created_at && (
                          <span className="text-gray-500 text-xs mr-2 hidden sm:inline" suppressHydrationWarning>
                            {format(new Date(version.created_at), 'dd MMM yyyy')}
                          </span>
                        )}
                        <button
                          onClick={() => handleDownload(doc.id)}
                          disabled={downloading === doc.id}
                          className="p-2 text-gray-400 hover:text-green-400 transition-colors rounded-lg hover:bg-gray-600/50"
                          title="Download"
                        >
                          {downloading === doc.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => onUploadVersion(doc.id, doc.category_id)}
                          className="p-2 text-gray-400 hover:text-green-400 transition-colors rounded-lg hover:bg-gray-600/50"
                          title="Upload New Version"
                        >
                          <Upload className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Version history toggle */}
                    {(version?.version_number ?? 1) > 1 && (
                      <div className="border-t border-gray-600/30">
                        <button
                          onClick={() => toggleVersionHistory(doc.id)}
                          className="w-full flex items-center justify-center gap-1 py-2 text-gray-400 hover:text-gray-300 text-xs transition-colors"
                        >
                          <Clock className="w-3 h-3" />
                          {isExpanded ? 'Hide' : 'Show'} version history
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                        {isExpanded && (
                          <div className="px-4 pb-3 space-y-2">
                            {loadingVersions.has(doc.id) ? (
                              <div className="flex items-center justify-center py-2">
                                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                              </div>
                            ) : (
                              <p className="text-gray-500 text-xs text-center">
                                Current version: v{version?.version_number ?? 1}
                              </p>
                            )}
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
