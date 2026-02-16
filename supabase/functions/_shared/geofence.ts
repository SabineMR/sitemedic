/**
 * Geofence Utility Functions
 *
 * Server-side geofencing logic for automatic arrival/departure detection.
 *
 * WHY: Mobile apps can detect geofence entry/exit, but we need server-side validation
 * to prevent tampering and provide a single source of truth for billing.
 *
 * FEATURES:
 * - Haversine distance calculation (accurate for Earth's curvature)
 * - Geofence boundary checking
 * - Consecutive ping state machine (prevents GPS jitter false positives)
 * - Auto-create geofences from booking site address
 * - Configurable radius per site
 */

interface GeofenceConfig {
  center_latitude: number;
  center_longitude: number;
  radius_meters: number;
  require_consecutive_pings: number;
}

interface GeofenceState {
  inside_geofence: boolean;
  consecutive_pings_inside: number;
  consecutive_pings_outside: number;
  last_entry_time?: string;
  last_exit_time?: string;
}

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 *
 * WHY: Accurate distance calculation accounting for Earth's curvature.
 * More accurate than simple Pythagorean distance for geographic coordinates.
 *
 * @returns Distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180; // Convert to radians
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Check if a point is inside a geofence
 *
 * @param pingLat - Medic's current latitude
 * @param pingLng - Medic's current longitude
 * @param geofence - Geofence configuration
 * @returns true if inside, false if outside
 */
export function isInsideGeofence(
  pingLat: number,
  pingLng: number,
  geofence: GeofenceConfig
): boolean {
  const distance = calculateDistance(
    pingLat,
    pingLng,
    geofence.center_latitude,
    geofence.center_longitude
  );

  return distance <= geofence.radius_meters;
}

/**
 * Process geofence state transition
 *
 * WHY: Implements state machine to prevent GPS jitter false positives.
 * Requires N consecutive pings inside/outside before triggering event.
 *
 * @param currentState - Current geofence state
 * @param isInside - Is current ping inside geofence?
 * @param requireConsecutive - Number of consecutive pings required
 * @returns Updated state and event to trigger (if any)
 */
export function processGeofenceTransition(
  currentState: GeofenceState,
  isInside: boolean,
  requireConsecutive: number = 3
): {
  newState: GeofenceState;
  event?: 'entered' | 'exited';
} {
  const newState = { ...currentState };

  if (isInside) {
    // Inside geofence
    newState.consecutive_pings_inside++;
    newState.consecutive_pings_outside = 0;

    // Check if we should trigger entry event
    if (
      !currentState.inside_geofence &&
      newState.consecutive_pings_inside >= requireConsecutive
    ) {
      newState.inside_geofence = true;
      newState.last_entry_time = new Date().toISOString();
      return { newState, event: 'entered' };
    }
  } else {
    // Outside geofence
    newState.consecutive_pings_outside++;
    newState.consecutive_pings_inside = 0;

    // Check if we should trigger exit event
    if (
      currentState.inside_geofence &&
      newState.consecutive_pings_outside >= requireConsecutive
    ) {
      newState.inside_geofence = false;
      newState.last_exit_time = new Date().toISOString();
      return { newState, event: 'exited' };
    }
  }

  return { newState };
}

/**
 * Suggest optimal geofence radius based on site characteristics
 *
 * WHY: Different site types need different geofence sizes.
 * Large construction sites need larger geofences.
 *
 * @param siteType - Type of construction site
 * @returns Suggested radius in meters
 */
export function suggestGeofenceRadius(
  siteType: 'small' | 'medium' | 'large' | 'very_large'
): number {
  const radiusSuggestions = {
    small: 50, // Small urban sites (house renovations)
    medium: 75, // Standard construction sites (default)
    large: 150, // Large sites (multi-building projects)
    very_large: 300, // Very large sites (infrastructure, industrial)
  };

  return radiusSuggestions[siteType];
}

/**
 * Calculate geofence center from site address
 *
 * WHY: Geofence center should be at the site's geographic center,
 * not necessarily the address pin (which might be at the entrance).
 *
 * For now, we use the site address coordinates directly.
 * In future, could use Google Maps API to get building outline and calculate centroid.
 *
 * @param siteLat - Site address latitude
 * @param siteLng - Site address longitude
 * @returns Geofence center coordinates
 */
export function calculateGeofenceCenter(
  siteLat: number,
  siteLng: number
): { latitude: number; longitude: number } {
  // For MVP, use site coordinates directly
  // TODO: In future, use building outline to calculate true centroid
  return { latitude: siteLat, longitude: siteLng };
}

/**
 * Validate geofence configuration
 *
 * @param geofence - Geofence to validate
 * @returns Validation result
 */
export function validateGeofence(geofence: GeofenceConfig): {
  valid: boolean;
  error?: string;
} {
  // Check coordinates are valid
  if (
    geofence.center_latitude < -90 ||
    geofence.center_latitude > 90 ||
    geofence.center_longitude < -180 ||
    geofence.center_longitude > 180
  ) {
    return { valid: false, error: 'Invalid center coordinates' };
  }

  // Check radius is reasonable (20m minimum, 1km maximum)
  if (geofence.radius_meters < 20 || geofence.radius_meters > 1000) {
    return {
      valid: false,
      error: 'Radius must be between 20m and 1000m',
    };
  }

  // Check consecutive ping requirement is reasonable (1-10)
  if (
    geofence.require_consecutive_pings < 1 ||
    geofence.require_consecutive_pings > 10
  ) {
    return {
      valid: false,
      error: 'Consecutive pings must be between 1 and 10',
    };
  }

  return { valid: true };
}

/**
 * Get initial geofence state
 */
export function createInitialGeofenceState(): GeofenceState {
  return {
    inside_geofence: false,
    consecutive_pings_inside: 0,
    consecutive_pings_outside: 0,
  };
}

/**
 * Format geofence info for logging
 */
export function formatGeofenceInfo(geofence: GeofenceConfig, distance: number): string {
  const inside = distance <= geofence.radius_meters;
  return `Distance: ${distance.toFixed(1)}m, Radius: ${geofence.radius_meters}m, Status: ${
    inside ? 'INSIDE' : 'OUTSIDE'
  }`;
}
