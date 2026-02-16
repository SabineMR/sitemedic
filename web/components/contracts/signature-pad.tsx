'use client';

import { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';

interface SignaturePadProps {
  onSave: (data: {
    signatureDataUrl: string;
    signedName: string;
  }) => Promise<void>;
  disabled?: boolean;
}

/**
 * Signature pad component with canvas drawing and typed name fallback
 *
 * Allows client to sign contracts either by drawing on canvas or typing their name.
 * Canvas mode uses react-signature-canvas for smooth drawing experience.
 * Typed name mode generates a text-based signature for accessibility.
 */
export function SignaturePad({ onSave, disabled = false }: SignaturePadProps) {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signMethod, setSignMethod] = useState<'draw' | 'type'>('draw');
  const [typedName, setTypedName] = useState('');
  const [agreeCheckbox, setAgreeCheckbox] = useState(false);

  const handleClear = () => {
    if (sigCanvas.current) {
      sigCanvas.current.clear();
    }
    setError(null);
  };

  const handleSaveDraw = async () => {
    if (!sigCanvas.current) return;

    // Check if signature is empty
    if (sigCanvas.current.isEmpty()) {
      setError('Please draw your signature before saving');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const signatureDataUrl = sigCanvas.current.toDataURL('image/png');
      await onSave({
        signatureDataUrl,
        signedName: 'Signature', // Canvas signature doesn't have typed name
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save signature');
      setIsSaving(false);
    }
  };

  const handleSaveType = async () => {
    if (!typedName.trim()) {
      setError('Please enter your full name');
      return;
    }

    if (!agreeCheckbox) {
      setError('Please confirm that your typed name constitutes your digital signature');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Generate a simple text-based signature image
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 150;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw typed name in cursive-style font
        ctx.fillStyle = '#1e293b';
        ctx.font = '48px cursive';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(typedName, canvas.width / 2, canvas.height / 2);
      }

      const signatureDataUrl = canvas.toDataURL('image/png');

      await onSave({
        signatureDataUrl,
        signedName: typedName,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save signature');
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs
        value={signMethod}
        onValueChange={(value: string) => {
          setSignMethod(value as 'draw' | 'type');
          setError(null);
        }}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="draw" disabled={disabled}>
            Draw Signature
          </TabsTrigger>
          <TabsTrigger value="type" disabled={disabled}>
            Type Name
          </TabsTrigger>
        </TabsList>

        <TabsContent value="draw" className="space-y-4">
          <div className="rounded-lg border-2 border-slate-300 bg-white overflow-hidden">
            <SignatureCanvas
              ref={sigCanvas}
              penColor="#1e293b"
              canvasProps={{
                className: 'w-full touch-none cursor-crosshair',
                width: 600,
                height: 200,
                style: { width: '100%', height: '200px' },
              }}
              minWidth={1}
              maxWidth={2.5}
            />
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleClear}
              disabled={disabled || isSaving}
              className="flex-1"
            >
              Clear
            </Button>
            <Button
              onClick={handleSaveDraw}
              disabled={disabled || isSaving}
              className="flex-1"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Signature'
              )}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="type" className="space-y-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="typed-name">Full Name</Label>
              <Input
                id="typed-name"
                type="text"
                placeholder="Enter your full name"
                value={typedName}
                onChange={(e) => {
                  setTypedName(e.target.value);
                  setError(null);
                }}
                disabled={disabled || isSaving}
                className="mt-1"
              />
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="agree-typed"
                checked={agreeCheckbox}
                onCheckedChange={(checked) => {
                  setAgreeCheckbox(checked === true);
                  setError(null);
                }}
                disabled={disabled || isSaving}
              />
              <Label
                htmlFor="agree-typed"
                className="text-sm leading-tight cursor-pointer"
              >
                I agree that this typed name constitutes my digital signature
              </Label>
            </div>
          </div>

          <Button
            onClick={handleSaveType}
            disabled={disabled || isSaving || !typedName.trim() || !agreeCheckbox}
            className="w-full"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Signature'
            )}
          </Button>
        </TabsContent>
      </Tabs>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="rounded-md bg-blue-50 border border-blue-200 p-4">
        <p className="text-sm text-blue-900">
          <strong>Legal Notice:</strong> By signing above, you confirm that you
          have read, understood, and agree to all terms and conditions of this
          service agreement.
        </p>
      </div>
    </div>
  );
}
