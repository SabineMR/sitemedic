/**
 * Weekly Reports List Component
 *
 * Displays generated weekly safety reports with download links
 * Provides on-demand report generation button
 * Auto-refreshes every 60 seconds to pick up newly generated reports
 */

'use client';

import { useState } from 'react';
import { useReports, generateReport, getDownloadUrl, type WeeklyReport } from '@/lib/queries/reports';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileDown,
  Download,
  Mail,
  Clock,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { formatDistanceToNow, format, parseISO } from 'date-fns';

interface ReportsListProps {
  initialData: WeeklyReport[];
}

export function ReportsList({ initialData }: ReportsListProps) {
  const { data: reports } = useReports(initialData);
  const [isGenerating, setIsGenerating] = useState(false);
  const supabase = createClient();

  // Handle on-demand report generation
  const handleGenerate = async () => {
    try {
      setIsGenerating(true);

      // Generate the report
      const blob = await generateReport(supabase);

      // Trigger browser download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `safety-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Wait a moment for the report to be saved to the database, then refetch
      setTimeout(() => {
        // Refetch will happen automatically via polling
      }, 2000);
    } catch (error) {
      console.error('Failed to generate report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle report download
  const handleDownload = async (report: WeeklyReport) => {
    try {
      // Get fresh signed URL
      const url = await getDownloadUrl(supabase, report.storage_path);

      // Open in new tab (browser will handle PDF download/viewing)
      window.open(url, '_blank');
    } catch (error) {
      console.error('Failed to download report:', error);
      alert('Failed to download report. Please try again.');
    }
  };

  // Format file size
  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return 'Unknown';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  // Format generation time
  const formatGenerationTime = (ms: number | null): string => {
    if (!ms) return 'Unknown';
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="space-y-6">
      {/* Header with generate button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Weekly Safety Reports</h2>
          <p className="text-muted-foreground">
            Generated reports for HSE audits and compliance tracking
          </p>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <FileDown className="h-4 w-4" />
              Generate Report
            </>
          )}
        </Button>
      </div>

      {/* Reports list */}
      {reports && reports.length > 0 ? (
        <div className="grid gap-4">
          {reports.map((report) => (
            <Card key={report.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      Week Ending {format(parseISO(report.week_ending), 'dd MMM yyyy')}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Generated {formatDistanceToNow(parseISO(report.created_at), { addSuffix: true })}
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(report)}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {/* File size */}
                  <div className="flex items-center gap-1">
                    <span className="font-medium">{formatFileSize(report.file_size_bytes)}</span>
                  </div>

                  {/* Generation time */}
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>Generated in {formatGenerationTime(report.generation_time_ms)}</span>
                  </div>

                  {/* Trigger type badge */}
                  <div>
                    <Badge variant={report.trigger_type === 'cron' ? 'default' : 'secondary'}>
                      {report.trigger_type === 'cron' ? 'Auto' : 'Manual'}
                    </Badge>
                  </div>

                  {/* Email status */}
                  <div className="flex items-center gap-1">
                    {report.email_sent ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span>Email sent</span>
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4" />
                        <span>No email</span>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-10">
            <div className="text-center text-muted-foreground">
              <FileDown className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No reports generated yet</p>
              <p className="text-sm">
                Click &quot;Generate Report&quot; to create your first weekly safety report.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
