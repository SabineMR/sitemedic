/**
 * IR35 Assessment Form
 * Phase 6.5: Medic IR35 compliance form with employment status, UTR, and CEST assessment
 */

'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { validateIR35Status, type EmploymentStatus } from '@/lib/medics/ir35-validator';

interface IR35FormProps {
  medicId: string;
  onComplete: () => void;
}

export function IR35Form({ medicId, onComplete }: IR35FormProps) {
  const [employmentStatus, setEmploymentStatus] = useState<EmploymentStatus>('self_employed');
  const [utr, setUtr] = useState('');
  const [umbrellaCompanyName, setUmbrellaCompanyName] = useState('');
  const [cestResult, setCestResult] = useState<string>('');
  const [cestDate, setCestDate] = useState('');
  const [cestFile, setCestFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === 'application/pdf') {
        setCestFile(file);
      } else {
        setErrors(['Only PDF files are allowed for CEST assessment']);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors([]);

    try {
      // Validate IR35 data
      const validation = validateIR35Status({
        employment_status: employmentStatus,
        utr: employmentStatus === 'self_employed' ? utr : undefined,
        umbrella_company_name: employmentStatus === 'umbrella' ? umbrellaCompanyName : undefined,
        cest_assessment_result: cestResult || undefined,
        cest_assessment_date: cestDate || undefined,
      });

      if (!validation.valid) {
        setErrors(validation.errors);
        setLoading(false);
        return;
      }

      const supabase = createClient();
      let cestPdfUrl = '';

      // Upload CEST PDF if provided
      if (cestFile) {
        const fileExtension = cestFile.name.split('.').pop();
        const fileName = `${medicId}-${Date.now()}.${fileExtension}`;
        const filePath = `ir35-assessments/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, cestFile);

        if (uploadError) {
          console.error('CEST upload error:', uploadError);
          setErrors(['Failed to upload CEST assessment PDF']);
          setLoading(false);
          return;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath);

        cestPdfUrl = urlData.publicUrl;
      }

      // Call IR35 assessment API
      const response = await fetch('/api/medics/ir35-assessment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          medicId,
          employment_status: employmentStatus,
          utr: employmentStatus === 'self_employed' ? utr : null,
          umbrella_company_name: employmentStatus === 'umbrella' ? umbrellaCompanyName : null,
          cest_assessment_result: cestResult || null,
          cest_assessment_date: cestDate || null,
          cest_pdf_url: cestPdfUrl || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setErrors([errorData.error || 'Failed to save IR35 assessment']);
        setLoading(false);
        return;
      }

      // Success
      onComplete();
    } catch (err) {
      console.error('IR35 form error:', err);
      setErrors(['An unexpected error occurred']);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div>
        <h3 className="text-lg font-semibold mb-4">IR35 Employment Status</h3>

        {errors.length > 0 && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>
              <ul className="list-disc list-inside">
                {errors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <Label>How are you employed? *</Label>
          <RadioGroup value={employmentStatus} onValueChange={(value) => setEmploymentStatus(value as EmploymentStatus)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="self_employed" id="self_employed" />
              <Label htmlFor="self_employed" className="font-normal cursor-pointer">
                Self-employed contractor
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="umbrella" id="umbrella" />
              <Label htmlFor="umbrella" className="font-normal cursor-pointer">
                Umbrella company employee
              </Label>
            </div>
          </RadioGroup>
        </div>
      </div>

      {employmentStatus === 'self_employed' && (
        <div className="space-y-4 p-4 bg-blue-50 rounded-md border border-blue-200">
          <Alert>
            <AlertDescription>
              As a self-employed contractor, you are responsible for your own tax and National Insurance contributions.
              SiteMedic will issue gross payments only.
            </AlertDescription>
          </Alert>

          <div>
            <Label htmlFor="utr">Unique Taxpayer Reference (UTR) *</Label>
            <Input
              id="utr"
              type="text"
              required
              value={utr}
              onChange={(e) => setUtr(e.target.value)}
              placeholder="1234567890"
              maxLength={10}
              disabled={loading}
              className="mt-1"
            />
            <p className="text-xs text-slate-500 mt-1">10-digit number from HMRC</p>
          </div>

          <div>
            <Label>HMRC CEST Assessment (Recommended)</Label>
            <div className="mt-2 space-y-3">
              <div>
                <Label htmlFor="cestFile" className="text-sm font-normal">
                  Upload CEST Assessment PDF (optional)
                </Label>
                <Input
                  id="cestFile"
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  disabled={loading}
                  className="mt-1"
                />
                {cestFile && (
                  <p className="text-xs text-green-600 mt-1">
                    Selected: {cestFile.name}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="cestResult" className="text-sm font-normal">
                  Or select result manually
                </Label>
                <RadioGroup value={cestResult} onValueChange={setCestResult} className="mt-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="outside_ir35" id="outside_ir35" />
                    <Label htmlFor="outside_ir35" className="font-normal cursor-pointer">
                      Outside IR35 (self-employed status confirmed)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="inside_ir35" id="inside_ir35" />
                    <Label htmlFor="inside_ir35" className="font-normal cursor-pointer">
                      Inside IR35 (employment status)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="unknown" id="unknown" />
                    <Label htmlFor="unknown" className="font-normal cursor-pointer">
                      Unknown / Not assessed yet
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {cestResult && (
                <div>
                  <Label htmlFor="cestDate" className="text-sm font-normal">
                    Assessment Date
                  </Label>
                  <Input
                    id="cestDate"
                    type="date"
                    value={cestDate}
                    onChange={(e) => setCestDate(e.target.value)}
                    disabled={loading}
                    className="mt-1"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {employmentStatus === 'umbrella' && (
        <div className="space-y-4 p-4 bg-purple-50 rounded-md border border-purple-200">
          <Alert>
            <AlertDescription>
              Your umbrella company will handle tax and National Insurance deductions.
              Payouts will be sent to your company's account.
            </AlertDescription>
          </Alert>

          <div>
            <Label htmlFor="umbrellaCompany">Umbrella Company Name *</Label>
            <Input
              id="umbrellaCompany"
              type="text"
              required
              value={umbrellaCompanyName}
              onChange={(e) => setUmbrellaCompanyName(e.target.value)}
              placeholder="e.g., Umbrella Corp Ltd"
              disabled={loading}
              className="mt-1"
            />
          </div>
        </div>
      )}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Saving...' : 'Save IR35 Status'}
      </Button>
    </form>
  );
}
