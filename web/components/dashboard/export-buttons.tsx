'use client';

/**
 * Export Buttons Component
 *
 * Dropdown menu with export options (CSV, PDF)
 *
 * Props:
 * - onExportCSV: Handler for CSV export
 * - onExportPDF: Handler for PDF export (optional)
 * - label: Button label (default: "Export")
 */

import * as React from 'react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ExportButtonsProps {
  onExportCSV: () => void;
  onExportPDF?: () => void;
  label?: string;
}

export function ExportButtons({
  onExportCSV,
  onExportPDF,
  label = 'Export',
}: ExportButtonsProps) {
  const [isExporting, setIsExporting] = React.useState(false);

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      await onExportCSV();
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    if (!onExportPDF) return;
    setIsExporting(true);
    try {
      await onExportPDF();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting}>
          {isExporting ? (
            <>
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              {label}
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportCSV}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Export as CSV
        </DropdownMenuItem>
        {onExportPDF && (
          <DropdownMenuItem onClick={handleExportPDF}>
            <FileText className="mr-2 h-4 w-4" />
            Export as PDF
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
