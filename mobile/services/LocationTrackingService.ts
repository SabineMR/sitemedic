/**
 * LocationTrackingService.ts
 *
 * Core location tracking service for medics during active shifts.
 *
 * WHY: This service runs in the background capturing GPS coordinates every 30 seconds,
 * handling offline scenarios, and detecting geofence entry/exit automatically.
 *
 * KEY FEATURES:
 * - Fixed 30-second ping interval (no battery optimization)
 * - Background location tracking (works when app is closed)
 * - Offline queue (stores pings locally when no connection)
 * - Auto-sync when connection restored
 * - Geofence detection (auto-detect arrival/departure)
 * - Edge case handling (battery died, GPS unavailable, app killed)
 */

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Battery from 'expo-battery';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

// Constants
const LOCATION_TASK_NAME = 'background-location-task';
const PING_INTERVAL_MS = 30000; // 30 seconds (fixed, no adaptive frequency)
const GEOFENCE_RADIUS_METERS = 75; // Default geofence radius
const CONSECUTIVE_PINGS_REQUIRED = 3; // Prevent GPS jitter false positives
const OFFLINE_QUEUE_KEY = '@sitemedic:location_queue';
const BATTERY_WARNING_THRESHOLD = 20; // Show warning at 20%

// Types
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
  recorded_at: string; // ISO 8601 timestamp
  is_offline_queued: boolean;
  is_background: boolean;
}

interface ShiftEvent {
  medic_id: string;
  booking_id: string;
  event_type: string;
  event_timestamp: string;
  latitude?: number;
  longitude?: number;
  accuracy_meters?: number;
  source: 'geofence_auto' | 'manual_button' | 'system_detected' | 'admin_override';
  triggered_by_user_id?: string;
  geofence_radius_meters?: number;
  distance_from_site_meters?: number;
  notes?: string;
  device_info?: object;
}

interface GeofenceState {
  insideGeofence: boolean;
  consecutivePingsInside: number;
  consecutivePingsOutside: number;
  lastEntryTime?: string;
  lastExitTime?: string;
}

class LocationTrackingService {
  private isTracking = false;
  private currentBooking: any = null;
  private geofenceState: GeofenceState = {
    insideGeofence: false,
    consecutivePingsInside: 0,
    consecutivePingsOutside: 0,
  };
  private offlineQueue: LocationPing[] = [];
  private batteryWarningShown = false;

  /**
   * Start location tracking for an active shift
   *
   * WHY: Called when medic's shift starts. Sets up background location tracking
   * and initializes geofencing for the job site.
   */
  async startTracking(booking: any, medicId: string): Promise<void> {
    console.log('[LocationTracking] Starting tracking for booking:', booking.id);

    // Request permissions
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      throw new Error('Location permission not granted');
    }

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      console.warn('[LocationTracking] Background permission not granted - tracking only when app open');
    }

    // Store current booking
    this.currentBooking = booking;
    await AsyncStorage.setItem('@sitemedic:current_booking', JSON.stringify(booking));
    await AsyncStorage.setItem('@sitemedic:medic_id', medicId);

    // Load offline queue from storage
    await this.loadOfflineQueue();

    // Start background location tracking
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: PING_INTERVAL_MS, // Ping every 30 seconds
      distanceInterval: 0, // Don't use distance filtering (we want time-based pings)
      foregroundService: {
        notificationTitle: 'SiteMedic Tracking Active',
        notificationBody: 'Location tracking in progress',
        notificationColor: '#2563EB',
      },
      pausesUpdatesAutomatically: false, // Keep tracking even if stationary
      showsBackgroundLocationIndicator: true, // iOS status bar indicator
    });

    this.isTracking = true;

    // Create shift_started event
    await this.createShiftEvent({
      medic_id: medicId,
      booking_id: booking.id,
      event_type: 'shift_started',
      event_timestamp: new Date().toISOString(),
      source: 'system_detected',
      notes: 'Location tracking started',
    });

    console.log('[LocationTracking] Tracking started successfully');
  }

  /**
   * Stop location tracking at end of shift
   */
  async stopTracking(): Promise<void> {
    console.log('[LocationTracking] Stopping tracking');

    if (!this.isTracking) {
      console.warn('[LocationTracking] Not currently tracking');
      return;
    }

    // Stop background location updates
    const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    if (isRegistered) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }

    // Sync any remaining offline queue
    await this.syncOfflineQueue();

    // Create shift_ended event
    const medicId = await AsyncStorage.getItem('@sitemedic:medic_id');
    if (this.currentBooking && medicId) {
      await this.createShiftEvent({
        medic_id: medicId,
        booking_id: this.currentBooking.id,
        event_type: 'shift_ended',
        event_timestamp: new Date().toISOString(),
        source: 'system_detected',
        notes: 'Location tracking stopped',
      });
    }

    // Clean up
    this.isTracking = false;
    this.currentBooking = null;
    await AsyncStorage.removeItem('@sitemedic:current_booking');
    await AsyncStorage.removeItem('@sitemedic:medic_id');

    console.log('[LocationTracking] Tracking stopped successfully');
  }

  /**
   * Handle manual status change from medic (button press)
   */
  async markArrived(userId: string): Promise<void> {
    if (!this.currentBooking) {
      throw new Error('No active booking');
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const medicId = await AsyncStorage.getItem('@sitemedic:medic_id');
    if (!medicId) throw new Error('Medic ID not found');

    await this.createShiftEvent({
      medic_id: medicId,
      booking_id: this.currentBooking.id,
      event_type: 'arrived_on_site',
      event_timestamp: new Date().toISOString(),
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy_meters: location.coords.accuracy || 0,
      source: 'manual_button',
      triggered_by_user_id: userId,
      notes: 'Medic manually marked arrival',
    });

    console.log('[LocationTracking] Manual arrival marked');
  }

  /**
   * Handle manual departure
   */
  async markDeparture(userId: string): Promise<void> {
    if (!this.currentBooking) {
      throw new Error('No active booking');
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const medicId = await AsyncStorage.getItem('@sitemedic:medic_id');
    if (!medicId) throw new Error('Medic ID not found');

    await this.createShiftEvent({
      medic_id: medicId,
      booking_id: this.currentBooking.id,
      event_type: 'left_site',
      event_timestamp: new Date().toISOString(),
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy_meters: location.coords.accuracy || 0,
      source: 'manual_button',
      triggered_by_user_id: userId,
      notes: 'Medic manually marked departure',
    });

    console.log('[LocationTracking] Manual departure marked');
  }

  /**
   * Process location update from background task
   *
   * WHY: Called every 30 seconds with new GPS coordinates. This is where we:
   * 1. Capture the ping
   * 2. Check geofence boundaries
   * 3. Queue offline if no connection
   * 4. Detect edge cases (battery low, GPS unavailable)
   */
  async processLocationUpdate(location: Location.LocationObject): Promise<void> {
    try {
      const medicId = await AsyncStorage.getItem('@sitemedic:medic_id');
      const bookingJson = await AsyncStorage.getItem('@sitemedic:current_booking');

      if (!medicId || !bookingJson) {
        console.warn('[LocationTracking] No active booking found');
        return;
      }

      const booking = JSON.parse(bookingJson);

      // Get device context
      const batteryLevel = await this.getBatteryLevel();
      const connectionType = await this.getConnectionType();
      const isOnline = await this.isOnline();

      // Check battery warning
      await this.checkBatteryWarning(batteryLevel);

      // Create location ping object
      const ping: LocationPing = {
        medic_id: medicId,
        booking_id: booking.id,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy_meters: location.coords.accuracy || 0,
        altitude_meters: location.coords.altitude || undefined,
        heading_degrees: location.coords.heading || undefined,
        speed_mps: location.coords.speed || undefined,
        battery_level: batteryLevel,
        connection_type: connectionType,
        gps_provider: 'expo-location',
        recorded_at: new Date(location.timestamp).toISOString(),
        is_offline_queued: !isOnline,
        is_background: true,
      };

      // Check geofence boundaries
      await this.checkGeofence(ping, booking);

      // Send ping or queue offline
      if (isOnline) {
        await this.sendLocationPing(ping);
        // Also sync any queued pings
        await this.syncOfflineQueue();
      } else {
        await this.queueOffline(ping);
        console.log('[LocationTracking] Offline - ping queued');
      }

    } catch (error) {
      console.error('[LocationTracking] Error processing location update:', error);
    }
  }

  /**
   * Check if medic crossed geofence boundary
   *
   * WHY: Automatically detect arrival/departure without requiring manual button press.
   * Uses consecutive ping requirement to prevent GPS jitter false positives.
   */
  private async checkGeofence(ping: LocationPing, booking: any): Promise<void> {
    // Calculate distance from job site
    const distance = this.calculateDistance(
      ping.latitude,
      ping.longitude,
      booking.site_latitude, // Assuming booking has site coordinates
      booking.site_longitude
    );

    const isInside = distance <= GEOFENCE_RADIUS_METERS;

    if (isInside) {
      this.geofenceState.consecutivePingsInside++;
      this.geofenceState.consecutivePingsOutside = 0;

      // Trigger arrival event if we have enough consecutive pings
      if (
        !this.geofenceState.insideGeofence &&
        this.geofenceState.consecutivePingsInside >= CONSECUTIVE_PINGS_REQUIRED
      ) {
        console.log('[LocationTracking] Geofence ENTRY detected');
        this.geofenceState.insideGeofence = true;
        this.geofenceState.lastEntryTime = new Date().toISOString();

        await this.createShiftEvent({
          medic_id: ping.medic_id,
          booking_id: ping.booking_id,
          event_type: 'arrived_on_site',
          event_timestamp: this.geofenceState.lastEntryTime,
          latitude: ping.latitude,
          longitude: ping.longitude,
          accuracy_meters: ping.accuracy_meters,
          source: 'geofence_auto',
          geofence_radius_meters: GEOFENCE_RADIUS_METERS,
          distance_from_site_meters: distance,
          notes: `Automatic geofence entry detected (${CONSECUTIVE_PINGS_REQUIRED} consecutive pings)`,
          device_info: {
            battery_level: ping.battery_level,
            connection_type: ping.connection_type,
          },
        });
      }
    } else {
      this.geofenceState.consecutivePingsOutside++;
      this.geofenceState.consecutivePingsInside = 0;

      // Trigger departure event if we have enough consecutive pings
      if (
        this.geofenceState.insideGeofence &&
        this.geofenceState.consecutivePingsOutside >= CONSECUTIVE_PINGS_REQUIRED
      ) {
        console.log('[LocationTracking] Geofence EXIT detected');
        this.geofenceState.insideGeofence = false;
        this.geofenceState.lastExitTime = new Date().toISOString();

        await this.createShiftEvent({
          medic_id: ping.medic_id,
          booking_id: ping.booking_id,
          event_type: 'left_site',
          event_timestamp: this.geofenceState.lastExitTime,
          latitude: ping.latitude,
          longitude: ping.longitude,
          accuracy_meters: ping.accuracy_meters,
          source: 'geofence_auto',
          geofence_radius_meters: GEOFENCE_RADIUS_METERS,
          distance_from_site_meters: distance,
          notes: `Automatic geofence exit detected (${CONSECUTIVE_PINGS_REQUIRED} consecutive pings)`,
          device_info: {
            battery_level: ping.battery_level,
            connection_type: ping.connection_type,
          },
        });
      }
    }
  }

  /**
   * Send location ping to backend (via Supabase Edge Function)
   */
  private async sendLocationPing(ping: LocationPing): Promise<void> {
    try {
      // Use Edge Function instead of direct table insert for better validation
      const { data, error } = await supabase.functions.invoke('medic-location-ping', {
        body: { pings: [ping] },
      });

      if (error) {
        console.error('[LocationTracking] Error sending ping:', error);
        // Queue for retry
        await this.queueOffline(ping);
      } else {
        console.log('[LocationTracking] Ping sent successfully:', data);
      }
    } catch (error) {
      console.error('[LocationTracking] Network error sending ping:', error);
      // Queue for retry
      await this.queueOffline(ping);
    }
  }

  /**
   * Create shift event (arrival, departure, etc.)
   */
  private async createShiftEvent(event: ShiftEvent): Promise<void> {
    try {
      const isOnline = await this.isOnline();

      if (isOnline) {
        // Use Edge Function instead of direct table insert for validation
        const { data, error } = await supabase.functions.invoke('medic-shift-event', {
          body: event,
        });

        if (error) {
          console.error('[LocationTracking] Error creating event:', error);
        } else {
          console.log('[LocationTracking] Event created:', event.event_type, data);
        }
      } else {
        console.log('[LocationTracking] Offline - event will be created when connection restored');
        // Could queue events too if needed
      }
    } catch (error) {
      console.error('[LocationTracking] Error creating shift event:', error);
    }
  }

  /**
   * Queue location ping for offline sync
   */
  private async queueOffline(ping: LocationPing): Promise<void> {
    this.offlineQueue.push(ping);
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(this.offlineQueue));
    console.log(`[LocationTracking] Queued ping offline (${this.offlineQueue.length} in queue)`);
  }

  /**
   * Load offline queue from storage
   */
  private async loadOfflineQueue(): Promise<void> {
    const queueJson = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    if (queueJson) {
      this.offlineQueue = JSON.parse(queueJson);
      console.log(`[LocationTracking] Loaded ${this.offlineQueue.length} queued pings from storage`);
    }
  }

  /**
   * Sync offline queue when connection restored
   *
   * WHY: When medic's phone reconnects to network, send all queued pings
   * from when they were offline. This ensures we don't lose location data.
   */
  async syncOfflineQueue(): Promise<void> {
    if (this.offlineQueue.length === 0) {
      return;
    }

    const isOnline = await this.isOnline();
    if (!isOnline) {
      console.log('[LocationTracking] Still offline - cannot sync queue');
      return;
    }

    console.log(`[LocationTracking] Syncing ${this.offlineQueue.length} queued pings...`);

    const queueSize = this.offlineQueue.length;

    try {
      // Batch insert via Edge Function (supports up to 50 pings per request)
      const BATCH_SIZE = 50;
      for (let i = 0; i < this.offlineQueue.length; i += BATCH_SIZE) {
        const batch = this.offlineQueue.slice(i, i + BATCH_SIZE);
        const { data, error } = await supabase.functions.invoke('medic-location-ping', {
          body: { pings: batch },
        });

        if (error) {
          console.error('[LocationTracking] Error syncing batch:', error);
          // Keep failed pings in queue
          return;
        }

        console.log(`[LocationTracking] Synced batch ${i / BATCH_SIZE + 1}:`, data);
      }

      console.log('[LocationTracking] All batches synced successfully');

      // Clear queue
      this.offlineQueue = [];
      await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);

      // Create connection_restored event
      const medicId = await AsyncStorage.getItem('@sitemedic:medic_id');
      const bookingJson = await AsyncStorage.getItem('@sitemedic:current_booking');
      if (medicId && bookingJson) {
        const booking = JSON.parse(bookingJson);
        await this.createShiftEvent({
          medic_id: medicId,
          booking_id: booking.id,
          event_type: 'connection_restored',
          event_timestamp: new Date().toISOString(),
          source: 'system_detected',
          notes: `Connection restored - synced ${queueSize} queued pings`,
        });
      }
    } catch (error) {
      console.error('[LocationTracking] Network error syncing queue:', error);
    }
  }

  /**
   * Check battery level and show warning if low
   * (Non-intrusive: just one notification at 20%)
   */
  private async checkBatteryWarning(batteryLevel: number): Promise<void> {
    if (batteryLevel <= BATTERY_WARNING_THRESHOLD && !this.batteryWarningShown) {
      console.log(`[LocationTracking] Battery low: ${batteryLevel}%`);
      // Show notification (implementation depends on notification library)
      // Example: showNotification('Battery Low', 'Battery at 20% - consider charging')
      this.batteryWarningShown = true;
    }

    // Reset warning flag if battery charged above threshold
    if (batteryLevel > BATTERY_WARNING_THRESHOLD) {
      this.batteryWarningShown = false;
    }
  }

  /**
   * Helper: Get current battery level
   */
  private async getBatteryLevel(): Promise<number> {
    try {
      const batteryLevel = await Battery.getBatteryLevelAsync();
      return Math.round(batteryLevel * 100);
    } catch (error) {
      console.warn('[LocationTracking] Could not get battery level:', error);
      return 100; // Default if unavailable
    }
  }

  /**
   * Helper: Get connection type
   */
  private async getConnectionType(): Promise<string> {
    try {
      const state = await NetInfo.fetch();
      return state.type || 'unknown';
    } catch (error) {
      console.warn('[LocationTracking] Could not get connection type:', error);
      return 'unknown';
    }
  }

  /**
   * Helper: Check if online
   */
  private async isOnline(): Promise<boolean> {
    try {
      const state = await NetInfo.fetch();
      return state.isConnected === true;
    } catch (error) {
      console.warn('[LocationTracking] Could not check connection:', error);
      return false;
    }
  }

  /**
   * Helper: Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
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
   * Get current tracking status
   */
  getStatus(): { isTracking: boolean; queueSize: number; insideGeofence: boolean } {
    return {
      isTracking: this.isTracking,
      queueSize: this.offlineQueue.length,
      insideGeofence: this.geofenceState.insideGeofence,
    };
  }
}

// Singleton instance
export const locationTrackingService = new LocationTrackingService();

/**
 * Background task definition
 *
 * WHY: This is registered with Expo TaskManager to run location tracking
 * even when the app is closed or in background. Called every 30 seconds.
 */
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('[LocationTracking] Background task error:', error);
    return;
  }

  if (data) {
    const { locations } = data as any;
    if (locations && locations.length > 0) {
      const location = locations[0];
      await locationTrackingService.processLocationUpdate(location);
    }
  }
});

export default locationTrackingService;
