/**
 * Storage utility for PDF uploads and signed URL generation
 * Phase 5: PDF Generation - Plan 02
 *
 * Handles:
 * - Uploading generated PDFs to Supabase Storage
 * - Generating time-limited signed URLs (7 days)
 * - Saving report metadata to weekly_reports table
 */

import { SupabaseClient } from 'npm:@supabase/supabase-js@2';

interface UploadResult {
  storagePath: string;
  signedUrl: string;
  expiresAt: Date;
}

interface ReportMetadata {
  orgId: string;
  weekEnding: string;
  storagePath: string;
  signedUrl: string;
  signedUrlExpiresAt: Date;
  fileSizeBytes: number;
  generationTimeMs: number;
  triggerType: 'cron' | 'manual';
  emailSent?: boolean;
  emailSentTo?: string;
}

/**
 * Upload PDF to Supabase Storage and generate signed URL
 *
 * @param supabase - Supabase client with service_role permissions
 * @param pdfBuffer - PDF file as Uint8Array
 * @param orgId - Organization ID for folder organization
 * @param weekEnding - Week ending date in YYYY-MM-DD format
 * @returns Storage path, signed URL, and expiration date
 */
export async function uploadReportPDF(
  supabase: SupabaseClient,
  pdfBuffer: Uint8Array,
  orgId: string,
  weekEnding: string
): Promise<UploadResult> {
  try {
    // Format: reports/{orgId}/weekly-report-{weekEnding}.pdf
    const dateStr = weekEnding.split('T')[0]; // Extract YYYY-MM-DD
    const storagePath = `reports/${orgId}/weekly-report-${dateStr}.pdf`;

    console.log(`📤 Uploading PDF to storage: ${storagePath}`);

    // Upload PDF with upsert to replace existing reports
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('safety-reports')
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true, // Replace existing report if re-generating
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    console.log(`✅ PDF uploaded successfully: ${uploadData.path}`);

    // Generate signed URL valid for 7 days (604800 seconds)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('safety-reports')
      .createSignedUrl(storagePath, 604800);

    if (signedUrlError) {
      throw new Error(`Signed URL generation failed: ${signedUrlError.message}`);
    }

    if (!signedUrlData?.signedUrl) {
      throw new Error('Signed URL is empty');
    }

    // Calculate expiration date (7 days from now)
    const expiresAt = new Date(Date.now() + 604800 * 1000);

    console.log(`🔗 Signed URL generated (expires: ${expiresAt.toISOString()})`);

    return {
      storagePath,
      signedUrl: signedUrlData.signedUrl,
      expiresAt,
    };
  } catch (error) {
    console.error('❌ Storage operation failed:', error);
    throw error;
  }
}

/**
 * Save report metadata to weekly_reports table
 *
 * @param supabase - Supabase client with service_role permissions
 * @param metadata - Report metadata to save
 * @returns Report ID
 */
export async function saveReportMetadata(
  supabase: SupabaseClient,
  metadata: ReportMetadata
): Promise<string> {
  try {
    console.log('💾 Saving report metadata...');

    // Upsert into weekly_reports (unique on org_id + week_ending)
    const { data, error } = await supabase
      .from('weekly_reports')
      .upsert(
        {
          org_id: metadata.orgId,
          week_ending: metadata.weekEnding.split('T')[0], // DATE type expects YYYY-MM-DD
          storage_path: metadata.storagePath,
          signed_url: metadata.signedUrl,
          signed_url_expires_at: metadata.signedUrlExpiresAt.toISOString(),
          file_size_bytes: metadata.fileSizeBytes,
          generation_time_ms: metadata.generationTimeMs,
          trigger_type: metadata.triggerType,
          email_sent: metadata.emailSent || false,
          email_sent_to: metadata.emailSentTo || null,
        },
        {
          onConflict: 'org_id,week_ending',
        }
      )
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to save report metadata: ${error.message}`);
    }

    console.log(`✅ Report metadata saved: ${data.id}`);
    return data.id;
  } catch (error) {
    console.error('❌ Failed to save report metadata:', error);
    throw error;
  }
}
