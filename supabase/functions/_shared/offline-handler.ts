/**
 * Offline Handler - Server-side utilities for offline ping processing
 *
 * WHY: When medics' phones reconnect after being offline, we receive batches
 * of location pings with timestamps in the past. We need to:
 * - Validate timestamps aren't too old (>24 hours = discard)
 * - Detect out-of-order pings (e.g., ping from 2PM arrives after ping from 3PM)
 * - Handle duplicate pings (same medic + timestamp)
 * - Flag suspicious patterns (e.g., 100 pings in 2 minutes = time travel?)
 *
 * FEATURES:
 * - Age validation (reject pings >24 hours old)
 * - Duplicate detection (same recorded_at timestamp)
 * - Out-of-order detection (timestamps not chronological)
 * - Rate anomaly detection (too many pings in short time)
 * - Metadata enrichment (add offline_batch_info)
 */

interface LocationPing {
  medic_id: string;
  booking_id: string;
  latitude: number;
  longitude: number;
  accuracy_meters: number;
  altitude_meters?: number;
  heading_degrees?: number;
  speed_mps?: number;
  battery_level: number;
  connection_type: string;
  gps_provider: string;
  recorded_at: string; // Device timestamp (when GPS reading captured)
  is_offline_queued: boolean;
  is_background: boolean;
}

interface ValidationResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
  enrichedPing?: LocationPing & {
    received_at?: string; // Server timestamp
    latency_seconds?: number; // Difference between recorded_at and received_at
    is_out_of_order?: boolean;
    offline_batch_id?: string;
  };
}

interface OfflineBatchStats {
  totalPings: number;
  oldestPing: string; // ISO timestamp
  newestPing: string;
  timeSpan: number; // Seconds from oldest to newest
  duplicates: number;
  outOfOrder: number;
  tooOld: number;
  anomalyDetected: boolean;
}

// Constants
const MAX_PING_AGE_HOURS = 24; // Reject pings >24 hours old
const MAX_PINGS_PER_MINUTE = 10; // Normal: 2 per minute (30s interval)
const EXPECTED_PING_INTERVAL_SECONDS = 30;

/**
 * Validate offline ping timestamp and metadata
 */
export function validateOfflinePing(
  ping: LocationPing,
  previousPing?: LocationPing
): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const receivedAt = new Date();
  const recordedAt = new Date(ping.recorded_at);

  // Check 1: Validate recorded_at is valid date
  if (isNaN(recordedAt.getTime())) {
    errors.push('Invalid recorded_at timestamp');
    return { valid: false, warnings, errors };
  }

  // Check 2: Reject pings from the future (clock skew >5 mins = suspicious)
  const now = Date.now();
  const timeDiff = recordedAt.getTime() - now;
  if (timeDiff > 5 * 60 * 1000) {
    errors.push(
      `Ping from future (${Math.round(timeDiff / 1000 / 60)} minutes ahead) - possible clock skew`
    );
    return { valid: false, warnings, errors };
  }

  // Check 3: Reject pings older than 24 hours
  const age = now - recordedAt.getTime();
  const ageHours = age / 1000 / 60 / 60;
  if (ageHours > MAX_PING_AGE_HOURS) {
    errors.push(`Ping too old (${Math.round(ageHours)} hours) - discarding`);
    return { valid: false, warnings, errors };
  }

  // Warning: Ping older than 1 hour (but still accepted)
  if (ageHours > 1) {
    warnings.push(`Ping is ${Math.round(ageHours)} hours old`);
  }

  // Check 4: Detect out-of-order pings
  let isOutOfOrder = false;
  if (previousPing) {
    const prevRecordedAt = new Date(previousPing.recorded_at);
    if (recordedAt < prevRecordedAt) {
      isOutOfOrder = true;
      warnings.push(
        `Out-of-order ping (recorded ${Math.round((prevRecordedAt.getTime() - recordedAt.getTime()) / 1000)}s before previous ping)`
      );
    }
  }

  // Check 5: Validate is_offline_queued flag is set
  if (!ping.is_offline_queued && ageHours > 0.5) {
    warnings.push('Ping >30 mins old but is_offline_queued=false (should be true)');
  }

  // Enrich ping with server-side metadata
  const enrichedPing = {
    ...ping,
    received_at: receivedAt.toISOString(),
    latency_seconds: Math.round(age / 1000),
    is_out_of_order: isOutOfOrder,
  };

  return {
    valid: true,
    warnings,
    errors,
    enrichedPing,
  };
}

/**
 * Validate entire offline batch (detect anomalies)
 */
export function validateOfflineBatch(pings: LocationPing[]): {
  valid: boolean;
  stats: OfflineBatchStats;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (pings.length === 0) {
    return {
      valid: true,
      stats: {
        totalPings: 0,
        oldestPing: '',
        newestPing: '',
        timeSpan: 0,
        duplicates: 0,
        outOfOrder: 0,
        tooOld: 0,
        anomalyDetected: false,
      },
      warnings,
      errors,
    };
  }

  // Sort pings by recorded_at
  const sortedPings = [...pings].sort(
    (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
  );

  const oldestPing = sortedPings[0];
  const newestPing = sortedPings[sortedPings.length - 1];
  const timeSpan =
    (new Date(newestPing.recorded_at).getTime() - new Date(oldestPing.recorded_at).getTime()) / 1000;

  // Detect duplicates (same recorded_at timestamp)
  const timestamps = new Set<string>();
  let duplicates = 0;
  for (const ping of pings) {
    if (timestamps.has(ping.recorded_at)) {
      duplicates++;
    }
    timestamps.add(ping.recorded_at);
  }

  // Detect out-of-order pings
  let outOfOrder = 0;
  for (let i = 1; i < sortedPings.length; i++) {
    const prevIndex = pings.findIndex((p) => p.recorded_at === sortedPings[i - 1].recorded_at);
    const currIndex = pings.findIndex((p) => p.recorded_at === sortedPings[i].recorded_at);
    if (currIndex < prevIndex) {
      outOfOrder++;
    }
  }

  // Count pings that are too old
  const now = Date.now();
  let tooOld = 0;
  for (const ping of pings) {
    const age = (now - new Date(ping.recorded_at).getTime()) / 1000 / 60 / 60;
    if (age > MAX_PING_AGE_HOURS) {
      tooOld++;
    }
  }

  // Anomaly detection: Rate check
  let anomalyDetected = false;
  const expectedPingsForTimeSpan = Math.ceil(timeSpan / EXPECTED_PING_INTERVAL_SECONDS);
  const actualPings = pings.length;
  const pingRate = actualPings / (timeSpan / 60); // Pings per minute

  if (pingRate > MAX_PINGS_PER_MINUTE) {
    anomalyDetected = true;
    warnings.push(
      `High ping rate: ${Math.round(pingRate)} pings/min (expected: ${60 / EXPECTED_PING_INTERVAL_SECONDS})`
    );
  }

  if (actualPings > expectedPingsForTimeSpan * 1.5) {
    anomalyDetected = true;
    warnings.push(
      `Too many pings: ${actualPings} pings in ${Math.round(timeSpan / 60)} minutes (expected: ~${expectedPingsForTimeSpan})`
    );
  }

  // Warnings for issues
  if (duplicates > 0) {
    warnings.push(`${duplicates} duplicate timestamps detected`);
  }

  if (outOfOrder > 0) {
    warnings.push(`${outOfOrder} out-of-order pings detected`);
  }

  if (tooOld > 0) {
    errors.push(`${tooOld} pings are >24 hours old and will be discarded`);
  }

  const stats: OfflineBatchStats = {
    totalPings: pings.length,
    oldestPing: oldestPing.recorded_at,
    newestPing: newestPing.recorded_at,
    timeSpan,
    duplicates,
    outOfOrder,
    tooOld,
    anomalyDetected,
  };

  return {
    valid: tooOld < pings.length, // Valid if at least some pings are acceptable
    stats,
    warnings,
    errors,
  };
}

/**
 * Generate unique batch ID for tracking offline batches
 */
export function generateBatchId(): string {
  return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Detect potential GPS spoofing or tampering
 */
export function detectGpsSpoofing(ping: LocationPing): {
  suspicious: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  let suspicious = false;

  // Check 1: Perfect accuracy (GPS is never perfect)
  if (ping.accuracy_meters !== null && ping.accuracy_meters < 1) {
    suspicious = true;
    reasons.push('Suspiciously perfect GPS accuracy (<1m)');
  }

  // Check 2: Zero speed and heading (moving medic should have some speed)
  if (ping.speed_mps === 0 && ping.heading_degrees === 0) {
    // This alone isn't suspicious (medic could be stationary)
    // But combined with other factors it's a red flag
  }

  // Check 3: Coordinates have suspicious precision (e.g., exactly 51.5074, -0.1278)
  const latDecimals = (ping.latitude.toString().split('.')[1] || '').length;
  const lngDecimals = (ping.longitude.toString().split('.')[1] || '').length;
  if (latDecimals < 4 || lngDecimals < 4) {
    suspicious = true;
    reasons.push('Suspiciously low coordinate precision (<4 decimals)');
  }

  // Check 4: Impossible speed (>200 km/h = 55.5 m/s)
  if (ping.speed_mps !== null && ping.speed_mps > 55.5) {
    suspicious = true;
    reasons.push(`Impossible speed: ${Math.round(ping.speed_mps * 3.6)} km/h`);
  }

  return { suspicious, reasons };
}

/**
 * Create audit log entry for offline batch
 */
export function createOfflineBatchAuditLog(stats: OfflineBatchStats, medicId: string, bookingId: string) {
  return {
    action_type: 'offline_batch_received',
    actor_type: 'system',
    medic_id: medicId,
    booking_id: bookingId,
    metadata: {
      batch_stats: stats,
      received_at: new Date().toISOString(),
    },
  };
}
