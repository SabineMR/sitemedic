/**
 * Document Upload Dialog
 * Phase 45-01: Upload dialog with dropzone, category picker, expiry date
 *
 * Medic portal dark theme. Supports both new documents and version replacements.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { FileText, Image, Upload, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { DocumentCategory } from '@/types/comms.types';

interface DocumentUploadDialogProps {
  onUploadComplete: () => void;
  replaceDocumentId?: string;
  presetCategoryId?: string;
}

export function DocumentUploadDialog({
  onUploadComplete,
  replaceDocumentId,
  presetCategoryId,
}: DocumentUploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState(presetCategoryId || '');
  const [expiryDate, setExpiryDate] = useState('');
  const [doesNotExpire, setDoesNotExpire] = useState(false);
  const [certificateNumber, setCertificateNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      fetchCategories();
    }
  }, [open]);

  // Auto-open for replacement uploads
  useEffect(() => {
    if (replaceDocumentId) {
      setOpen(true);
    }
  }, [replaceDocumentId]);

  async function fetchCategories() {
    try {
      const res = await fetch('/api/documents/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  }

  function handleFileSelect(selectedFile: File) {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error('File type not allowed. Accepted: PDF, JPEG, PNG');
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds 10MB limit');
      return;
    }
    setFile(selectedFile);
    if (selectedFile.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(selectedFile));
    } else {
      setPreviewUrl(null);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) handleFileSelect(selectedFile);
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function resetForm() {
    setFile(null);
    setPreviewUrl(null);
    if (!presetCategoryId) setCategoryId('');
    setExpiryDate('');
    setDoesNotExpire(false);
    setCertificateNumber('');
    setNotes('');
  }

  async function handleSubmit() {
    if (!file || !categoryId) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('categoryId', categoryId);
      if (!doesNotExpire && expiryDate) {
        formData.append('expiryDate', expiryDate);
      }
      if (certificateNumber) {
        formData.append('certificateNumber', certificateNumber);
      }
      if (notes) {
        formData.append('notes', notes);
      }
      if (replaceDocumentId) {
        formData.append('replaceDocumentId', replaceDocumentId);
      }

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Upload failed');
      }

      toast.success('Document uploaded successfully');
      resetForm();
      setOpen(false);
      onUploadComplete();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium transition-colors"
      >
        <Upload className="w-4 h-4" />
        Upload Document
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => { if (!uploading) { setOpen(false); resetForm(); } }}
      />

      {/* Dialog */}
      <div className="relative bg-gray-800 border border-gray-700/50 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-semibold text-lg">
            {replaceDocumentId ? 'Upload New Version' : 'Upload Document'}
          </h2>
          <button
            onClick={() => { if (!uploading) { setOpen(false); resetForm(); } }}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dropzone */}
        {!file ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              dragActive
                ? 'border-green-500 bg-green-900/20'
                : 'border-gray-600 hover:border-gray-500 bg-gray-700/30'
            }`}
          >
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-300 text-sm">
              Drag & drop a file here, or <span className="text-green-400 underline">browse</span>
            </p>
            <p className="text-gray-500 text-xs mt-1">PDF, JPEG, PNG — Max 10MB</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleInputChange}
              className="hidden"
            />
          </div>
        ) : (
          <div className="bg-gray-700/30 border border-gray-600/50 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-3">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-16 h-16 object-cover rounded-lg"
                />
              ) : (
                <div className="w-16 h-16 bg-gray-600/50 rounded-lg flex items-center justify-center">
                  <FileText className="w-8 h-8 text-gray-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{file.name}</p>
                <p className="text-gray-400 text-xs">{formatFileSize(file.size)}</p>
              </div>
              <button
                onClick={() => { setFile(null); setPreviewUrl(null); }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Category */}
        <div className="mt-4">
          <label className="block text-gray-400 text-xs mb-1">Category</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            disabled={!!presetCategoryId}
            className="w-full bg-gray-700/50 border border-gray-600/50 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500 disabled:opacity-60"
          >
            <option value="">Select a category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Expiry Date */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <label className="text-gray-400 text-xs">Expiry Date</label>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-gray-400 text-xs">Does not expire</span>
              <input
                type="checkbox"
                checked={doesNotExpire}
                onChange={(e) => setDoesNotExpire(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 text-green-600 focus:ring-green-500 bg-gray-700"
              />
            </label>
          </div>
          {!doesNotExpire && (
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full bg-gray-700/50 border border-gray-600/50 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500"
            />
          )}
        </div>

        {/* Certificate Number */}
        <div className="mt-4">
          <label className="block text-gray-400 text-xs mb-1">Certificate Number (optional)</label>
          <input
            type="text"
            value={certificateNumber}
            onChange={(e) => setCertificateNumber(e.target.value)}
            placeholder="e.g. INS-2024-001"
            className="w-full bg-gray-700/50 border border-gray-600/50 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500 placeholder-gray-500"
          />
        </div>

        {/* Notes */}
        <div className="mt-4">
          <label className="block text-gray-400 text-xs mb-1">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional notes..."
            rows={2}
            className="w-full bg-gray-700/50 border border-gray-600/50 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500 placeholder-gray-500 resize-none"
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!file || !categoryId || uploading}
          className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              {replaceDocumentId ? 'Upload New Version' : 'Upload Document'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
