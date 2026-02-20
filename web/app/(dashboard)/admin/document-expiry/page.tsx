/**
 * Bulk Document Expiry Dashboard
 * Phase 46-02: Expiry Tracking & Alerts
 *
 * Org admin view showing all documents expiring across all medics.
 * Summary cards (expired/expiring/current), tabbed data table with
 * category filter and expiry status badges.
 */

'use client';

import { useState } from 'react';
import {
  useExpiringDocuments,
  useDocumentExpirySummary,
  useDocumentCategories,
} from '@/lib/queries/admin/document-expiry';
import type { ExpiringDocumentRow } from '@/lib/queries/admin/document-expiry';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, XCircle, FileWarning } from 'lucide-react';
import { format, parseISO } from 'date-fns';

// =============================================================================
// STATUS BADGE
// =============================================================================

function ExpiryStatusBadge({ status }: { status: ExpiringDocumentRow['status'] }) {
  switch (status) {
    case 'expired':
      return (
        <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
          Expired
        </Badge>
      );
    case 'expiring-soon':
      return (
        <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
          Expiring Soon
        </Badge>
      );
    case 'current':
      return (
        <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
          Current
        </Badge>
      );
  }
}

// =============================================================================
// DAYS REMAINING CELL
// =============================================================================

function DaysRemainingCell({ days }: { days: number }) {
  if (days < 0) {
    return (
      <span className="text-red-600 font-medium">
        {Math.abs(days)} days ago
      </span>
    );
  }
  if (days <= 7) {
    return (
      <span className="text-red-600 font-medium">
        {days} days
      </span>
    );
  }
  if (days <= 30) {
    return (
      <span className="text-amber-600">
        {days} days
      </span>
    );
  }
  return <span>{days} days</span>;
}

// =============================================================================
// TAB CONFIGURATION
// =============================================================================

type TabKey = '30' | 'all' | 'expired';

interface TabConfig {
  daysWindow: number;
  includeExpired: boolean;
  emptyMessage: string;
}

const TAB_CONFIGS: Record<TabKey, TabConfig> = {
  '30': {
    daysWindow: 30,
    includeExpired: false,
    emptyMessage: 'No documents expiring in the next 30 days',
  },
  'all': {
    daysWindow: 365,
    includeExpired: false,
    emptyMessage: 'No expiring documents found',
  },
  'expired': {
    daysWindow: 0,
    includeExpired: true,
    emptyMessage: 'No expired documents',
  },
};

// =============================================================================
// PAGE COMPONENT
// =============================================================================

export default function DocumentExpiryPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('30');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);

  // Fetch summary (aggregate counts)
  const {
    data: summary,
    isLoading: summaryLoading,
  } = useDocumentExpirySummary();

  // Fetch document categories for filter
  const { data: categories = [] } = useDocumentCategories();

  // Fetch expiring documents based on active tab and category filter
  const tabConfig = TAB_CONFIGS[activeTab];
  const {
    data: documents = [],
    isLoading: documentsLoading,
  } = useExpiringDocuments(
    tabConfig.daysWindow,
    selectedCategory,
    tabConfig.includeExpired
  );

  // Calculate compliance rate for subtitle
  const totalDocs = summary?.total_documents ?? 0;
  const currentDocs = summary?.current_count ?? 0;
  const complianceRate = totalDocs > 0
    ? Math.round((currentDocs / totalDocs) * 100)
    : 100;

  function handleCategoryChange(value: string) {
    setSelectedCategory(value === 'all' ? undefined : value);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <FileWarning className="h-7 w-7 text-amber-600" />
          <h1 className="text-3xl font-bold">Document Expiry</h1>
        </div>
        <p className="text-muted-foreground mt-1">
          {summaryLoading
            ? 'Loading...'
            : `${totalDocs} documents tracked \u2022 ${complianceRate}% current`}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {summaryLoading ? '-' : summary?.expired_count ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">Non-compliant</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {summaryLoading ? '-' : summary?.expiring_soon_count ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">Within 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {summaryLoading ? '-' : summary?.current_count ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">All documents valid</p>
          </CardContent>
        </Card>
      </div>

      {/* Data Table with Tabs and Category Filter */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Expiring Documents</CardTitle>
              <CardDescription>
                Track document expiry across all medics
              </CardDescription>
            </div>

            {/* Category Filter */}
            <Select
              value={selectedCategory ?? 'all'}
              onValueChange={handleCategoryChange}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.slug}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
            <TabsList>
              <TabsTrigger value="30">30 Days</TabsTrigger>
              <TabsTrigger value="all">All Expiring</TabsTrigger>
              <TabsTrigger value="expired">Expired</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              {documentsLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading documents...
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
                  <p className="text-muted-foreground">{tabConfig.emptyMessage}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium text-sm">Medic Name</th>
                        <th className="text-left py-3 px-4 font-medium text-sm">Document Category</th>
                        <th className="text-left py-3 px-4 font-medium text-sm">File Name</th>
                        <th className="text-left py-3 px-4 font-medium text-sm">Expiry Date</th>
                        <th className="text-left py-3 px-4 font-medium text-sm">Days Remaining</th>
                        <th className="text-left py-3 px-4 font-medium text-sm">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map((doc) => (
                        <tr
                          key={`${doc.document_id}-${doc.expiry_date}`}
                          className="border-b hover:bg-accent"
                        >
                          <td className="py-3 px-4 text-sm">{doc.medic_name}</td>
                          <td className="py-3 px-4 text-sm">{doc.category_name}</td>
                          <td className="py-3 px-4 text-sm font-mono text-xs truncate max-w-[200px]">
                            {doc.file_name}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {format(parseISO(doc.expiry_date), 'dd MMM yyyy')}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            <DaysRemainingCell days={doc.days_remaining} />
                          </td>
                          <td className="py-3 px-4">
                            <ExpiryStatusBadge status={doc.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
