/**
 * Admin Territory Query Hooks
 *
 * TanStack Query hooks for fetching territory coverage data with utilization metrics,
 * gap detection, and color-coded map display.
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useRequireOrg } from '@/contexts/org-context';

// =============================================================================
// TYPES
// =============================================================================

export interface TerritoryWithMetrics {
  // Core territory fields
  id: string;
  postcode_sector: string;
  region: string;
  primary_medic_id: string | null;
  secondary_medic_id: string | null;
  max_travel_minutes: number;
  notes: string | null;
  created_at: string;
  updated_at: string;

  // Computed metrics from territory_metrics
  utilization_pct: number; // 0-100
  primary_medic_name: string | null;
  secondary_medic_name: string | null;

  // Recent metrics
  recent_metrics: {
    total_bookings: number;
    confirmed_bookings: number;
    rejected_bookings: number;
    rejection_rate: number; // 0-100
    fulfillment_rate: number; // 0-100
  };

  // Hiring trigger tracking
  hiring_trigger_weeks: number; // Number of consecutive weeks with hiring triggers

  // Map coordinates (approximate centroid for postcode area)
  lat: number;
  lng: number;
}

export interface AssignMedicParams {
  territory_id: string;
  medic_id: string;
  role: 'primary' | 'secondary';
}

export interface UnassignMedicParams {
  territory_id: string;
  role: 'primary' | 'secondary';
}

export interface CoverageGapAlert {
  territory_id: string;
  postcode_sector: string;
  region: string;
  rejection_rate: number;
  total_bookings: number;
  rejected_bookings: number;
  severity: 'warning' | 'critical';
  message: string;
}

// =============================================================================
// UK POSTCODE CENTROIDS
// =============================================================================

/**
 * Approximate centroid coordinates for major UK postcode areas.
 *
 * This avoids needing a geocoding API or OS Data Hub boundary polygons.
 * Sufficient accuracy for admin overview map with circle markers.
 *
 * Source: Approximate centroids from UK postcode area definitions.
 */
export const UK_POSTCODE_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  // London - East
  'E1': { lat: 51.517, lng: -0.056 },
  'E2': { lat: 51.531, lng: -0.054 },
  'E3': { lat: 51.533, lng: -0.025 },
  'E4': { lat: 51.607, lng: -0.014 },
  'E5': { lat: 51.558, lng: -0.056 },
  'E6': { lat: 51.525, lng: 0.047 },
  'E7': { lat: 51.556, lng: 0.019 },
  'E8': { lat: 51.548, lng: -0.056 },
  'E9': { lat: 51.544, lng: -0.042 },
  'E10': { lat: 51.574, lng: -0.012 },
  'E11': { lat: 51.561, lng: 0.009 },
  'E12': { lat: 51.548, lng: 0.049 },
  'E13': { lat: 51.521, lng: 0.024 },
  'E14': { lat: 51.503, lng: -0.019 },
  'E15': { lat: 51.543, lng: -0.005 },
  'E16': { lat: 51.507, lng: 0.023 },
  'E17': { lat: 51.587, lng: -0.019 },
  'E18': { lat: 51.596, lng: 0.024 },

  // London - East Central
  'EC1': { lat: 51.522, lng: -0.106 },
  'EC2': { lat: 51.517, lng: -0.089 },
  'EC3': { lat: 51.512, lng: -0.084 },
  'EC4': { lat: 51.513, lng: -0.102 },

  // London - North
  'N1': { lat: 51.539, lng: -0.103 },
  'N2': { lat: 51.590, lng: -0.159 },
  'N3': { lat: 51.602, lng: -0.189 },
  'N4': { lat: 51.570, lng: -0.102 },
  'N5': { lat: 51.558, lng: -0.094 },
  'N6': { lat: 51.570, lng: -0.143 },
  'N7': { lat: 51.551, lng: -0.118 },
  'N8': { lat: 51.588, lng: -0.115 },
  'N9': { lat: 51.626, lng: -0.069 },
  'N10': { lat: 51.593, lng: -0.141 },
  'N11': { lat: 51.611, lng: -0.105 },
  'N12': { lat: 51.617, lng: -0.170 },
  'N13': { lat: 51.618, lng: -0.113 },
  'N14': { lat: 51.651, lng: -0.133 },
  'N15': { lat: 51.590, lng: -0.081 },
  'N16': { lat: 51.560, lng: -0.077 },
  'N17': { lat: 51.596, lng: -0.066 },
  'N18': { lat: 51.612, lng: -0.049 },
  'N19': { lat: 51.565, lng: -0.136 },
  'N20': { lat: 51.628, lng: -0.166 },
  'N21': { lat: 51.646, lng: -0.087 },
  'N22': { lat: 51.602, lng: -0.119 },

  // London - Northwest
  'NW1': { lat: 51.534, lng: -0.141 },
  'NW2': { lat: 51.561, lng: -0.213 },
  'NW3': { lat: 51.550, lng: -0.174 },
  'NW4': { lat: 51.590, lng: -0.222 },
  'NW5': { lat: 51.553, lng: -0.144 },
  'NW6': { lat: 51.543, lng: -0.193 },
  'NW7': { lat: 51.614, lng: -0.232 },
  'NW8': { lat: 51.530, lng: -0.176 },
  'NW9': { lat: 51.598, lng: -0.254 },
  'NW10': { lat: 51.542, lng: -0.242 },
  'NW11': { lat: 51.578, lng: -0.195 },

  // London - Southeast
  'SE1': { lat: 51.499, lng: -0.091 },
  'SE2': { lat: 51.487, lng: 0.149 },
  'SE3': { lat: 51.464, lng: 0.008 },
  'SE4': { lat: 51.464, lng: -0.035 },
  'SE5': { lat: 51.482, lng: -0.086 },
  'SE6': { lat: 51.430, lng: -0.019 },
  'SE7': { lat: 51.492, lng: 0.017 },
  'SE8': { lat: 51.483, lng: -0.030 },
  'SE9': { lat: 51.445, lng: 0.061 },
  'SE10': { lat: 51.483, lng: 0.002 },
  'SE11': { lat: 51.490, lng: -0.110 },
  'SE12': { lat: 51.445, lng: 0.024 },
  'SE13': { lat: 51.455, lng: -0.011 },
  'SE14': { lat: 51.473, lng: -0.048 },
  'SE15': { lat: 51.479, lng: -0.067 },
  'SE16': { lat: 51.495, lng: -0.052 },
  'SE17': { lat: 51.491, lng: -0.095 },
  'SE18': { lat: 51.489, lng: 0.098 },
  'SE19': { lat: 51.419, lng: -0.080 },
  'SE20': { lat: 51.411, lng: -0.062 },
  'SE21': { lat: 51.437, lng: -0.086 },
  'SE22': { lat: 51.454, lng: -0.070 },
  'SE23': { lat: 51.442, lng: -0.039 },
  'SE24': { lat: 51.463, lng: -0.106 },
  'SE25': { lat: 51.397, lng: -0.095 },
  'SE26': { lat: 51.425, lng: -0.053 },
  'SE27': { lat: 51.432, lng: -0.108 },
  'SE28': { lat: 51.508, lng: 0.094 },

  // London - Southwest
  'SW1': { lat: 51.498, lng: -0.140 },
  'SW2': { lat: 51.451, lng: -0.122 },
  'SW3': { lat: 51.492, lng: -0.165 },
  'SW4': { lat: 51.460, lng: -0.136 },
  'SW5': { lat: 51.490, lng: -0.191 },
  'SW6': { lat: 51.476, lng: -0.205 },
  'SW7': { lat: 51.494, lng: -0.176 },
  'SW8': { lat: 51.481, lng: -0.127 },
  'SW9': { lat: 51.469, lng: -0.116 },
  'SW10': { lat: 51.483, lng: -0.182 },
  'SW11': { lat: 51.464, lng: -0.167 },
  'SW12': { lat: 51.431, lng: -0.158 },
  'SW13': { lat: 51.465, lng: -0.262 },
  'SW14': { lat: 51.465, lng: -0.266 },
  'SW15': { lat: 51.455, lng: -0.226 },
  'SW16': { lat: 51.420, lng: -0.123 },
  'SW17': { lat: 51.424, lng: -0.168 },
  'SW18': { lat: 51.450, lng: -0.188 },
  'SW19': { lat: 51.421, lng: -0.203 },
  'SW20': { lat: 51.407, lng: -0.194 },

  // London - West
  'W1': { lat: 51.516, lng: -0.148 },
  'W2': { lat: 51.516, lng: -0.184 },
  'W3': { lat: 51.518, lng: -0.270 },
  'W4': { lat: 51.494, lng: -0.264 },
  'W5': { lat: 51.514, lng: -0.302 },
  'W6': { lat: 51.492, lng: -0.227 },
  'W7': { lat: 51.515, lng: -0.336 },
  'W8': { lat: 51.501, lng: -0.195 },
  'W9': { lat: 51.526, lng: -0.198 },
  'W10': { lat: 51.523, lng: -0.218 },
  'W11': { lat: 51.514, lng: -0.205 },
  'W12': { lat: 51.509, lng: -0.232 },
  'W13': { lat: 51.514, lng: -0.324 },
  'W14': { lat: 51.494, lng: -0.213 },

  // London - West Central
  'WC1': { lat: 51.522, lng: -0.123 },
  'WC2': { lat: 51.514, lng: -0.125 },

  // Manchester
  'M1': { lat: 53.477, lng: -2.232 },
  'M2': { lat: 53.481, lng: -2.246 },
  'M3': { lat: 53.483, lng: -2.254 },
  'M4': { lat: 53.484, lng: -2.218 },
  'M5': { lat: 53.477, lng: -2.274 },
  'M6': { lat: 53.495, lng: -2.291 },
  'M7': { lat: 53.504, lng: -2.267 },
  'M8': { lat: 53.505, lng: -2.237 },
  'M9': { lat: 53.521, lng: -2.200 },
  'M11': { lat: 53.473, lng: -2.191 },
  'M12': { lat: 53.464, lng: -2.212 },
  'M13': { lat: 53.453, lng: -2.225 },
  'M14': { lat: 53.449, lng: -2.240 },
  'M15': { lat: 53.463, lng: -2.254 },
  'M16': { lat: 53.453, lng: -2.277 },
  'M17': { lat: 53.464, lng: -2.300 },
  'M18': { lat: 53.432, lng: -2.196 },
  'M19': { lat: 53.439, lng: -2.179 },
  'M20': { lat: 53.429, lng: -2.239 },
  'M21': { lat: 53.441, lng: -2.272 },
  'M22': { lat: 53.397, lng: -2.252 },
  'M23': { lat: 53.377, lng: -2.238 },
  'M24': { lat: 53.555, lng: -2.165 },
  'M25': { lat: 53.565, lng: -2.122 },

  // Birmingham
  'B1': { lat: 52.481, lng: -1.898 },
  'B2': { lat: 52.485, lng: -1.910 },
  'B3': { lat: 52.490, lng: -1.909 },
  'B4': { lat: 52.478, lng: -1.904 },
  'B5': { lat: 52.469, lng: -1.895 },
  'B6': { lat: 52.492, lng: -1.896 },
  'B7': { lat: 52.497, lng: -1.888 },
  'B8': { lat: 52.486, lng: -1.870 },
  'B9': { lat: 52.471, lng: -1.874 },
  'B10': { lat: 52.466, lng: -1.861 },
  'B11': { lat: 52.453, lng: -1.886 },
  'B12': { lat: 52.455, lng: -1.906 },
  'B13': { lat: 52.444, lng: -1.910 },
  'B14': { lat: 52.432, lng: -1.914 },
  'B15': { lat: 52.465, lng: -1.929 },
  'B16': { lat: 52.481, lng: -1.937 },
  'B17': { lat: 52.457, lng: -1.959 },
  'B18': { lat: 52.499, lng: -1.920 },
  'B19': { lat: 52.505, lng: -1.909 },
  'B20': { lat: 52.512, lng: -1.911 },
  'B21': { lat: 52.500, lng: -1.934 },

  // Leeds
  'LS1': { lat: 53.800, lng: -1.549 },
  'LS2': { lat: 53.805, lng: -1.556 },
  'LS3': { lat: 53.816, lng: -1.563 },
  'LS4': { lat: 53.820, lng: -1.585 },
  'LS5': { lat: 53.815, lng: -1.603 },
  'LS6': { lat: 53.824, lng: -1.577 },
  'LS7': { lat: 53.811, lng: -1.532 },
  'LS8': { lat: 53.833, lng: -1.511 },
  'LS9': { lat: 53.798, lng: -1.516 },
  'LS10': { lat: 53.782, lng: -1.531 },
  'LS11': { lat: 53.781, lng: -1.571 },
  'LS12': { lat: 53.796, lng: -1.594 },
  'LS13': { lat: 53.818, lng: -1.633 },
  'LS14': { lat: 53.831, lng: -1.489 },
  'LS15': { lat: 53.806, lng: -1.464 },

  // Sheffield
  'S1': { lat: 53.380, lng: -1.470 },
  'S2': { lat: 53.370, lng: -1.468 },
  'S3': { lat: 53.393, lng: -1.479 },
  'S4': { lat: 53.408, lng: -1.451 },
  'S5': { lat: 53.420, lng: -1.492 },
  'S6': { lat: 53.394, lng: -1.516 },
  'S7': { lat: 53.364, lng: -1.495 },
  'S8': { lat: 53.335, lng: -1.533 },
  'S9': { lat: 53.412, lng: -1.403 },
  'S10': { lat: 53.376, lng: -1.506 },
  'S11': { lat: 53.366, lng: -1.512 },
  'S12': { lat: 53.338, lng: -1.446 },
  'S13': { lat: 53.343, lng: -1.388 },

  // Bristol
  'BS1': { lat: 51.454, lng: -2.596 },
  'BS2': { lat: 51.463, lng: -2.570 },
  'BS3': { lat: 51.441, lng: -2.605 },
  'BS4': { lat: 51.437, lng: -2.565 },
  'BS5': { lat: 51.478, lng: -2.552 },
  'BS6': { lat: 51.477, lng: -2.600 },
  'BS7': { lat: 51.485, lng: -2.595 },
  'BS8': { lat: 51.464, lng: -2.622 },
  'BS9': { lat: 51.493, lng: -2.635 },
  'BS10': { lat: 51.520, lng: -2.592 },
  'BS11': { lat: 51.471, lng: -2.665 },
  'BS13': { lat: 51.421, lng: -2.588 },
  'BS14': { lat: 51.413, lng: -2.537 },
  'BS15': { lat: 51.443, lng: -2.497 },
  'BS16': { lat: 51.498, lng: -2.514 },

  // Cardiff
  'CF10': { lat: 51.481, lng: -3.182 },
  'CF11': { lat: 51.476, lng: -3.203 },
  'CF14': { lat: 51.508, lng: -3.205 },
  'CF15': { lat: 51.528, lng: -3.253 },
  'CF23': { lat: 51.503, lng: -3.150 },
  'CF24': { lat: 51.493, lng: -3.162 },
  'CF3': { lat: 51.522, lng: -3.014 },
  'CF5': { lat: 51.479, lng: -3.240 },

  // Edinburgh
  'EH1': { lat: 55.951, lng: -3.190 },
  'EH2': { lat: 55.952, lng: -3.207 },
  'EH3': { lat: 55.953, lng: -3.217 },
  'EH4': { lat: 55.969, lng: -3.254 },
  'EH5': { lat: 55.973, lng: -3.174 },
  'EH6': { lat: 55.975, lng: -3.167 },
  'EH7': { lat: 55.961, lng: -3.159 },
  'EH8': { lat: 55.948, lng: -3.171 },
  'EH9': { lat: 55.932, lng: -3.186 },
  'EH10': { lat: 55.925, lng: -3.198 },
  'EH11': { lat: 55.934, lng: -3.240 },
  'EH12': { lat: 55.938, lng: -3.273 },

  // Glasgow
  'G1': { lat: 55.860, lng: -4.251 },
  'G2': { lat: 55.864, lng: -4.263 },
  'G3': { lat: 55.871, lng: -4.282 },
  'G4': { lat: 55.874, lng: -4.255 },
  'G5': { lat: 55.848, lng: -4.259 },
  'G11': { lat: 55.872, lng: -4.316 },
  'G12': { lat: 55.879, lng: -4.294 },
  'G13': { lat: 55.892, lng: -4.332 },
  'G14': { lat: 55.888, lng: -4.352 },
  'G15': { lat: 55.923, lng: -4.403 },
  'G20': { lat: 55.889, lng: -4.271 },
  'G21': { lat: 55.873, lng: -4.221 },
  'G31': { lat: 55.844, lng: -4.193 },
  'G32': { lat: 55.842, lng: -4.172 },
  'G33': { lat: 55.873, lng: -4.156 },
  'G40': { lat: 55.846, lng: -4.224 },
  'G41': { lat: 55.838, lng: -4.276 },
  'G42': { lat: 55.831, lng: -4.263 },
  'G43': { lat: 55.816, lng: -4.282 },
  'G44': { lat: 55.816, lng: -4.257 },
  'G45': { lat: 55.809, lng: -4.227 },
  'G46': { lat: 55.789, lng: -4.303 },
  'G51': { lat: 55.858, lng: -4.313 },
  'G52': { lat: 55.858, lng: -4.362 },
  'G53': { lat: 55.835, lng: -4.348 },

  // Liverpool
  'L1': { lat: 53.408, lng: -2.983 },
  'L2': { lat: 53.406, lng: -2.998 },
  'L3': { lat: 53.412, lng: -2.990 },
  'L4': { lat: 53.433, lng: -2.975 },
  'L5': { lat: 53.429, lng: -2.960 },
  'L6': { lat: 53.416, lng: -2.961 },
  'L7': { lat: 53.405, lng: -2.962 },
  'L8': { lat: 53.386, lng: -2.970 },
  'L9': { lat: 53.461, lng: -2.996 },
  'L10': { lat: 53.476, lng: -2.971 },
  'L11': { lat: 53.443, lng: -2.936 },
  'L12': { lat: 53.454, lng: -2.930 },
  'L13': { lat: 53.423, lng: -2.935 },
  'L14': { lat: 53.411, lng: -2.916 },
  'L15': { lat: 53.396, lng: -2.939 },
  'L16': { lat: 53.393, lng: -2.907 },
  'L17': { lat: 53.378, lng: -2.939 },
  'L18': { lat: 53.362, lng: -2.897 },
  'L19': { lat: 53.363, lng: -2.933 },
  'L20': { lat: 53.453, lng: -3.004 },
};

// =============================================================================
// SERVER FUNCTIONS
// =============================================================================

/**
 * Fetch all territories with utilization metrics and medic assignments.
 * IMPORTANT: Now accepts supabase and orgId parameters for org-scoped filtering.
 *
 * Joins territories with medics and territory_metrics tables.
 * Uses parallel queries to avoid N+1 issues.
 */
export async function fetchTerritoriesWithMetrics(supabase: SupabaseClient, orgId: string): Promise<TerritoryWithMetrics[]> {
  // Fetch all territories for this org
  const { data: territories, error: territoriesError } = await supabase
    .from('territories')
    .select('*')
    .eq('org_id', orgId) // CRITICAL: Filter by org_id
    .order('postcode_sector', { ascending: true });

  if (territoriesError) {
    console.error('Error fetching territories:', territoriesError);
    throw territoriesError;
  }

  if (!territories || territories.length === 0) {
    return [];
  }

  const territoryIds = territories.map(t => t.id);
  const postcodeSectors = territories.map(t => t.postcode_sector);
  const medicIds = [
    ...territories.map(t => t.primary_medic_id),
    ...territories.map(t => t.secondary_medic_id)
  ].filter((id): id is string => id !== null);

  // Fetch all data in parallel to avoid N+1 queries for this org
  const [medicsResult, metricsResult] = await Promise.all([
    // 1. Fetch medics for this org
    medicIds.length > 0
      ? supabase
          .from('medics')
          .select('id, first_name, last_name')
          .eq('org_id', orgId) // CRITICAL: Filter by org_id
          .in('id', medicIds)
      : Promise.resolve({ data: [] }),

    // 2. Fetch latest territory metrics for each postcode sector for this org
    supabase
      .from('territory_metrics')
      .select('*')
      .eq('org_id', orgId) // CRITICAL: Filter by org_id
      .in('postcode_sector', postcodeSectors)
      .order('metric_date', { ascending: false })
  ]);

  // Create lookup maps
  const medicsById = new Map<string, { first_name: string; last_name: string }>();
  if (medicsResult.data) {
    medicsResult.data.forEach(medic => {
      medicsById.set(medic.id, { first_name: medic.first_name, last_name: medic.last_name });
    });
  }

  // Get most recent metric for each postcode sector
  const metricsByPostcode = new Map<string, any>();
  if (metricsResult.data) {
    metricsResult.data.forEach(metric => {
      if (!metricsByPostcode.has(metric.postcode_sector)) {
        metricsByPostcode.set(metric.postcode_sector, metric);
      }
    });
  }

  // Combine all data
  return territories.map(territory => {
    const metric = metricsByPostcode.get(territory.postcode_sector);
    const primaryMedic = territory.primary_medic_id
      ? medicsById.get(territory.primary_medic_id)
      : null;
    const secondaryMedic = territory.secondary_medic_id
      ? medicsById.get(territory.secondary_medic_id)
      : null;

    // Get coordinates from centroids map
    // Extract base postcode (first 2-4 chars before number)
    const postcodeBase = territory.postcode_sector.match(/^[A-Z]+\d+/)?.[0] || territory.postcode_sector;
    const coords = UK_POSTCODE_CENTROIDS[postcodeBase] || { lat: 51.505, lng: -0.09 }; // Default to London center

    return {
      ...territory,
      utilization_pct: metric ? Math.round(metric.primary_medic_utilization) : 0,
      primary_medic_name: primaryMedic
        ? `${primaryMedic.first_name} ${primaryMedic.last_name}`
        : null,
      secondary_medic_name: secondaryMedic
        ? `${secondaryMedic.first_name} ${secondaryMedic.last_name}`
        : null,
      recent_metrics: {
        total_bookings: metric?.total_bookings || 0,
        confirmed_bookings: metric?.confirmed_bookings || 0,
        rejected_bookings: metric?.rejected_bookings || 0,
        rejection_rate: metric?.rejection_rate || 0,
        fulfillment_rate: metric?.fulfillment_rate || 100,
      },
      hiring_trigger_weeks: metric?.hiring_trigger_weeks || 0,
      lat: coords.lat,
      lng: coords.lng,
    };
  });
}

// =============================================================================
// REACT QUERY HOOKS
// =============================================================================

/**
 * Query hook for territories with metrics.
 * IMPORTANT: Now uses org context to filter territories.
 *
 * Features:
 * - 60-second polling for real-time updates
 * - Initial data support for server-side rendering
 */
export function useTerritories(initialData?: TerritoryWithMetrics[]) {
  const supabase = createClient();
  const orgId = useRequireOrg(); // Get current user's org_id

  return useQuery({
    queryKey: ['admin', 'territories', 'with-metrics', orgId], // Include orgId in cache key
    queryFn: () => fetchTerritoriesWithMetrics(supabase, orgId),
    refetchInterval: 60000, // 60 seconds
    staleTime: 30000, // Consider data fresh for 30s
    initialData,
  });
}

/**
 * Mutation hook to assign medic to territory (primary or secondary role).
 *
 * Features:
 * - Optimistic updates for instant UI feedback
 * - Automatic rollback on error
 * - Invalidates both territory and medic queries on success
 */
export function useAssignMedicToTerritory() {
  const queryClient = useQueryClient();
  const orgId = useRequireOrg();

  return useMutation({
    mutationFn: async (params: AssignMedicParams) => {
      const response = await fetch('/api/admin/territories/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to assign medic');
      }

      return response.json();
    },
    onMutate: async (params) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['admin', 'territories', 'with-metrics', orgId] });

      // Snapshot previous value
      const previousTerritories = queryClient.getQueryData<TerritoryWithMetrics[]>(['admin', 'territories', 'with-metrics', orgId]);

      // Fetch medic name from medics cache to avoid fetching
      const medicsData = queryClient.getQueryData<any[]>(['admin', 'medics', 'with-metrics', orgId]);
      const medic = medicsData?.find((m: any) => m.id === params.medic_id);
      const medicName = medic ? `${medic.first_name} ${medic.last_name}` : null;

      // Optimistically update
      if (previousTerritories) {
        queryClient.setQueryData<TerritoryWithMetrics[]>(
          ['admin', 'territories', 'with-metrics', orgId],
          previousTerritories.map(territory =>
            territory.id === params.territory_id
              ? {
                  ...territory,
                  ...(params.role === 'primary'
                    ? {
                        primary_medic_id: params.medic_id,
                        primary_medic_name: medicName,
                      }
                    : {
                        secondary_medic_id: params.medic_id,
                        secondary_medic_name: medicName,
                      }),
                }
              : territory
          )
        );
      }

      return { previousTerritories };
    },
    onError: (err, params, context) => {
      // Rollback on error
      if (context?.previousTerritories) {
        queryClient.setQueryData(['admin', 'territories', 'with-metrics', orgId], context.previousTerritories);
      }
      console.error('Error assigning medic to territory:', err);
    },
    onSuccess: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['admin', 'territories', 'with-metrics', orgId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'medics', 'with-metrics', orgId] });
    },
  });
}

/**
 * Mutation hook to unassign medic from territory (remove primary or secondary).
 *
 * Features:
 * - Optimistic updates for instant UI feedback
 * - Automatic rollback on error
 * - Invalidates both territory and medic queries on success
 */
export function useUnassignMedic() {
  const queryClient = useQueryClient();
  const orgId = useRequireOrg();

  return useMutation({
    mutationFn: async (params: UnassignMedicParams) => {
      const response = await fetch('/api/admin/territories/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          territory_id: params.territory_id,
          medic_id: null,
          role: params.role,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to unassign medic');
      }

      return response.json();
    },
    onMutate: async (params) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['admin', 'territories', 'with-metrics', orgId] });

      // Snapshot previous value
      const previousTerritories = queryClient.getQueryData<TerritoryWithMetrics[]>(['admin', 'territories', 'with-metrics', orgId]);

      // Optimistically update
      if (previousTerritories) {
        queryClient.setQueryData<TerritoryWithMetrics[]>(
          ['admin', 'territories', 'with-metrics', orgId],
          previousTerritories.map(territory =>
            territory.id === params.territory_id
              ? {
                  ...territory,
                  ...(params.role === 'primary'
                    ? {
                        primary_medic_id: null,
                        primary_medic_name: null,
                      }
                    : {
                        secondary_medic_id: null,
                        secondary_medic_name: null,
                      }),
                }
              : territory
          )
        );
      }

      return { previousTerritories };
    },
    onError: (err, params, context) => {
      // Rollback on error
      if (context?.previousTerritories) {
        queryClient.setQueryData(['admin', 'territories', 'with-metrics', orgId], context.previousTerritories);
      }
      console.error('Error unassigning medic from territory:', err);
    },
    onSuccess: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['admin', 'territories', 'with-metrics', orgId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'medics', 'with-metrics', orgId] });
    },
  });
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Calculate coverage gaps for territories.
 *
 * A coverage gap exists when rejection rate > 10% AND total bookings > 10.
 * - Warning severity: rejection rate 10-25%
 * - Critical severity: rejection rate > 25%
 *
 * WHY minimum volume filter: Prevents false positives from low-volume territories.
 * A territory with 1 booking and 1 rejection (100% rejection) isn't a coverage gap,
 * it's statistical noise. Require 10+ bookings for meaningful analysis.
 */
export function calculateCoverageGaps(territories: TerritoryWithMetrics[]): CoverageGapAlert[] {
  return territories
    .filter(t => t.recent_metrics.rejection_rate > 10 && t.recent_metrics.total_bookings > 10)
    .map(t => ({
      territory_id: t.id,
      postcode_sector: t.postcode_sector,
      region: t.region,
      rejection_rate: t.recent_metrics.rejection_rate,
      total_bookings: t.recent_metrics.total_bookings,
      rejected_bookings: t.recent_metrics.rejected_bookings,
      severity: t.recent_metrics.rejection_rate > 25 ? 'critical' : 'warning',
      message: `Coverage Gap in ${t.postcode_sector}: ${t.recent_metrics.rejected_bookings}/${t.recent_metrics.total_bookings} bookings rejected (${t.recent_metrics.rejection_rate.toFixed(1)}%). Consider assigning additional medics.`
    }));
}

/**
 * Get color hex value for utilization percentage.
 *
 * Color coding:
 * - Green (#22c55e): < 50% (plenty of capacity)
 * - Yellow (#eab308): 50-80% (moderate load)
 * - Red (#ef4444): > 80% (high utilization, approaching capacity)
 */
export function getUtilizationColor(pct: number): string {
  if (pct < 50) return '#22c55e';
  if (pct <= 80) return '#eab308';
  return '#ef4444';
}
