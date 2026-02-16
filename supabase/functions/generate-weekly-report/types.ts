/**
 * Type definitions for weekly safety report PDF generation
 * Phase 5: PDF Generation - Plan 01
 */

export interface WeeklyReportData {
  projectName: string;
  weekEnding: string; // Formatted date e.g., "14 February 2026"
  medicName: string;
  generatedAt: string; // ISO timestamp
  complianceScore: ComplianceScore;
  treatments: TreatmentRow[];
  nearMisses: NearMissRow[];
  safetyChecks: SafetyCheckRow[];
  weeklyStats: WeeklyStats;
}

export interface ComplianceScore {
  status: 'red' | 'amber' | 'green';
  dailyCheckDone: boolean;
  overdueFollowups: number;
  expiredCerts: number; // Hard-coded 0 for Phase 7
  riddorDeadlines: number;
}

export interface TreatmentRow {
  date: string; // Formatted date
  workerName: string;
  injuryType: string;
  bodyPart: string;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  outcome: 'returned_to_work' | 'sent_home' | 'hospital_referral' | 'ambulance_called';
  isRiddor: boolean;
}

export interface NearMissRow {
  date: string; // Formatted date
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  correctiveAction: string;
}

export interface SafetyCheckRow {
  date: string; // Formatted date
  overallStatus: 'pass' | 'fail' | 'partial';
  passCount: number;
  failCount: number;
  totalItems: number;
}

export interface WeeklyStats {
  treatmentCount: number;
  nearMissCount: number;
  workersOnSite: number;
  dailyChecksCompleted: number;
  dailyChecksRequired: number; // Total days in week with expected checks
}
