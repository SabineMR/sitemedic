/**
 * Schedule Board Page
 *
 * Admin dashboard for drag-and-drop schedule management
 *
 * WHY: This page provides admins with a visual interface to assign medics to bookings.
 * It completes Task #7 from the auto-scheduling backend by giving admins manual control
 * when auto-scheduling confidence is low or when they want to make strategic assignments.
 *
 * KEY FEATURES:
 * - Week-based view with navigation (prev/next week)
 * - Real-time updates when bookings change
 * - Visual medic utilization indicators
 * - Conflict detection on assignment
 * - Connection status indicator
 *
 * NAVIGATION:
 * - Accessible from /admin/schedule-board
 * - Linked in admin sidebar
 */

'use client';

import { useEffect } from 'react';
import { useScheduleBoardStore } from '@/stores/useScheduleBoardStore';
import { ScheduleGrid } from '@/components/admin/schedule/ScheduleGrid';

export default function ScheduleBoardPage() {
  const {
    fetchScheduleData,
    subscribe,
    unsubscribe,
    selectedWeekStart,
    setWeek,
    isLoading,
    error,
    isConnected,
    medics,
    getUnassignedBookings,
  } = useScheduleBoardStore();

  const unassignedCount = getUnassignedBookings().length;

  // Initialize data and real-time subscription on mount
  useEffect(() => {
    fetchScheduleData();
    subscribe();

    return () => {
      unsubscribe();
    };
  }, [selectedWeekStart]); // Re-fetch when week changes

  /**
   * Navigate to previous week
   */
  const handlePrevWeek = () => {
    const prev = new Date(selectedWeekStart);
    prev.setDate(prev.getDate() - 7);
    setWeek(prev.toISOString().split('T')[0]);
  };

  /**
   * Navigate to next week
   */
  const handleNextWeek = () => {
    const next = new Date(selectedWeekStart);
    next.setDate(next.getDate() + 7);
    setWeek(next.toISOString().split('T')[0]);
  };

  /**
   * Jump to current week
   */
  const handleToday = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    setWeek(monday.toISOString().split('T')[0]);
  };

  /**
   * Format week range for display (e.g., "Feb 15-21, 2026")
   */
  const formatWeekRange = (): string => {
    const start = new Date(selectedWeekStart);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
    const startDay = start.getDate();
    const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
    const endDay = end.getDate();
    const year = end.getFullYear();

    if (startMonth === endMonth) {
      return `${startMonth} ${startDay}-${endDay}, ${year}`;
    } else {
      return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            📅 Schedule Board
            {/* Connection Indicator */}
            <span
              className={`w-3 h-3 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-gray-600'
              } animate-pulse`}
              title={isConnected ? 'Real-time connected' : 'Connecting...'}
            />
          </h1>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm">
            <div className="text-gray-400">
              <span className="font-medium text-white">{medics.length}</span> medics
            </div>
            {unassignedCount > 0 && (
              <div className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full font-medium">
                {unassignedCount} unassigned
              </div>
            )}
          </div>
        </div>

        {/* Week Navigation */}
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrevWeek}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium"
          >
            ← Previous
          </button>

          <button
            onClick={handleToday}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            Today
          </button>

          <span className="text-white font-medium text-lg flex-1 text-center">
            {formatWeekRange()}
          </span>

          <button
            onClick={handleNextWeek}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Mock Data Info Banner */}
      {error && error.includes('mock data') && (
        <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500 rounded-lg text-yellow-400">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <div className="font-medium">Using Mock Data (Development Mode)</div>
              <div className="text-sm mt-1 text-yellow-300">
                Supabase isn't running. You're seeing sample data for UI testing.
              </div>
              <div className="text-xs mt-2 bg-yellow-500/20 p-2 rounded">
                <strong>To use real data:</strong>
                <ol className="list-decimal list-inside mt-1 space-y-1">
                  <li>Start Docker Desktop</li>
                  <li>Run: <code className="bg-black/30 px-1 rounded">supabase start</code></li>
                  <li>Refresh this page</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error State (non-mock errors) */}
      {error && !error.includes('mock data') && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-400">
          <div className="font-medium">Error loading schedule</div>
          <div className="text-sm mt-1">{error}</div>
          <button
            onClick={fetchScheduleData}
            className="mt-2 px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded transition-colors text-sm"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && !error && (
        <div className="text-center text-gray-400 py-12">
          <div className="text-4xl mb-3 animate-spin">⏳</div>
          <div className="text-lg">Loading schedule...</div>
        </div>
      )}

      {/* Schedule Grid */}
      {!isLoading && !error && <ScheduleGrid />}

      {/* Instructions (for first-time users) */}
      {!isLoading && medics.length > 0 && unassignedCount > 0 && (
        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500 rounded-lg text-blue-400">
          <div className="font-medium mb-1">💡 How to use</div>
          <div className="text-sm text-blue-300">
            Drag bookings from the "Unassigned Bookings" section to medic cells to assign shifts.
            The system will automatically check for conflicts like double-bookings, missing
            certifications, and overtime violations.
          </div>
        </div>
      )}
    </div>
  );
}
