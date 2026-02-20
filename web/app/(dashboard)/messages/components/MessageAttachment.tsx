/**
 * Message Attachment - Client Component
 *
 * Displays an attachment inline in the message thread. Images show a
 * thumbnail preview; documents show a file icon with name and size.
 * Both have a download link via signed URL.
 *
 * Phase 47: Message Polish
 */

'use client';

import { useState, useEffect } from 'react';
import { FileText, Image as ImageIcon, File, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AttachmentMetadata } from '@/types/comms.types';

interface MessageAttachmentProps {
  metadata: AttachmentMetadata;
  className?: string;
}

const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string) {
  if (IMAGE_TYPES.includes(mimeType)) {
    return <ImageIcon className="h-5 w-5 text-blue-500" />;
  }
  if (mimeType === 'application/pdf') {
    return <FileText className="h-5 w-5 text-red-500" />;
  }
  return <File className="h-5 w-5 text-muted-foreground" />;
}

export function MessageAttachment({
  metadata,
  className,
}: MessageAttachmentProps) {
  const { attachment } = metadata;
  const isImage = IMAGE_TYPES.includes(attachment.mime_type);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  // Fetch signed URL for image thumbnail on mount
  useEffect(() => {
    if (!isImage) return;

    fetch(
      `/api/messages/attachments/download?path=${encodeURIComponent(attachment.storage_path)}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.url) setImageUrl(data.url);
      })
      .catch(console.error);
  }, [isImage, attachment.storage_path]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch(
        `/api/messages/attachments/download?path=${encodeURIComponent(attachment.storage_path)}`
      );
      const data = await res.json();
      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className={cn('border rounded-lg p-3 max-w-xs', className)}
    >
      {/* Image thumbnail */}
      {isImage && imageUrl && (
        <img
          src={imageUrl}
          alt={attachment.file_name}
          className="max-w-full max-h-48 rounded-md mb-2 object-cover"
          loading="lazy"
        />
      )}

      {/* File info row */}
      <div className="flex items-center gap-2">
        {getFileIcon(attachment.mime_type)}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {attachment.file_name}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatFileSize(attachment.file_size_bytes)}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 flex-shrink-0"
          onClick={handleDownload}
          disabled={downloading}
          title="Download"
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
