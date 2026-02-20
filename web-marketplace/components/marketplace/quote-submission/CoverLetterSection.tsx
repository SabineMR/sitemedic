/**
 * Cover Letter Section
 * Phase 34: Quote Submission & Comparison
 *
 * Simple section for a free-form pitch/cover letter.
 * Max 5000 characters, optional field.
 * Shows character count indicator.
 */

'use client';

import { useQuoteFormStore } from '@/stores/useQuoteFormStore';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function CoverLetterSection() {
  const store = useQuoteFormStore();
  const maxChars = 5000;
  const currentChars = store.coverLetter.length;

  return (
    <div className="border rounded-lg p-6 space-y-4">
      <div>
        <h2 className="text-xl font-semibold mb-2">Cover Letter (Optional)</h2>
        <p className="text-sm text-gray-600">
          Write a brief pitch about why you're the best fit for this event.
        </p>
      </div>

      <div>
        <Label htmlFor="coverLetter" className="text-sm">
          Your Pitch
        </Label>
        <Textarea
          id="coverLetter"
          placeholder="Tell the client why you're the best choice. Highlight relevant experience, equipment, or special capabilities..."
          value={store.coverLetter}
          onChange={(e) => store.setCoverLetter(e.target.value.slice(0, maxChars))}
          className="mt-2 min-h-[120px]"
        />
        <div className="text-xs text-gray-500 mt-1">
          {currentChars} / {maxChars} characters
        </div>
      </div>
    </div>
  );
}
