/**
 * Attachment Picker - Client Component
 *
 * Paperclip button that opens a hidden file input for selecting
 * message attachments. Validates file type and size before passing
 * to parent.
 *
 * Phase 47: Message Polish
 */

'use client';

import { useRef } from 'react';
import { Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface AttachmentPickerProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

export function AttachmentPicker({
  onFileSelected,
  disabled,
}: AttachmentPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so the same file can be re-selected
    e.target.value = '';

    if (file.size > MAX_FILE_SIZE) {
      toast.error('File too large. Maximum size is 10MB.');
      return;
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      toast.error(
        'File type not supported. Accepted: PDF, JPEG, PNG, Word.'
      );
      return;
    }

    onFileSelected(file);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 flex-shrink-0"
        onClick={handleClick}
        disabled={disabled}
        title="Attach file"
        type="button"
      >
        <Paperclip className="h-4 w-4" />
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        className="hidden"
        onChange={handleChange}
      />
    </>
  );
}
