/**
 * Bulk Action Toolbar
 *
 * Floating toolbar that appears when rows are selected in admin tables.
 * Provides bulk approve/reject actions with loading states and confirmation dialogs.
 */

'use client';

import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CheckCircle, XCircle, X, Loader2 } from 'lucide-react';
import { useState, ReactNode } from 'react';

interface BulkActionToolbarProps {
  selectedCount: number;
  onApprove?: () => void;
  onReject?: () => void;
  onClear: () => void;
  isLoading?: boolean;
  children?: ReactNode;
}

export function BulkActionToolbar({
  selectedCount,
  onApprove,
  onReject,
  onClear,
  isLoading = false,
  children,
}: BulkActionToolbarProps) {
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);

  const handleApprove = () => {
    if (onApprove) {
      onApprove();
    }
  };

  const handleReject = () => {
    if (onReject) {
      onReject();
    }
    setRejectDialogOpen(false);
  };

  if (selectedCount === 0) return null;

  return (
    <>
      {/* Fixed toolbar at bottom of viewport */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
        <div className="bg-gray-800/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl px-6 py-4 flex items-center gap-4">
          {/* Selection count */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">{selectedCount}</span>
            </div>
            <span className="text-white font-medium">
              {selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected
            </span>
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-gray-700"></div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {onApprove && (
              <Button
                onClick={handleApprove}
                disabled={isLoading}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white shadow-lg shadow-green-500/20"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Approving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve
                  </>
                )}
              </Button>
            )}

            {onReject && (
              <Button
                onClick={() => setRejectDialogOpen(true)}
                disabled={isLoading}
                variant="destructive"
                className="shadow-lg shadow-red-500/20"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
            )}

            {children}

            {/* Clear selection */}
            <Button
              onClick={onClear}
              disabled={isLoading}
              variant="ghost"
              className="text-gray-300 hover:text-white hover:bg-gray-700/50"
            >
              <X className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </div>
        </div>
      </div>

      {/* Reject confirmation dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent className="bg-gray-800 border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Reject {selectedCount} {selectedCount === 1 ? 'item' : 'items'}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              This action cannot be undone. The selected {selectedCount === 1 ? 'item' : 'items'} will be
              marked as rejected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-700 text-white hover:bg-gray-600 border-gray-600">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white"
            >
              Confirm Rejection
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
