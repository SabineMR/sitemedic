/**
 * BeaconService.ts
 *
 * BLE beacon fallback for check-in/check-out when GPS satellite signal is
 * unavailable (underground plant rooms, steel-framed buildings, confined spaces).
 *
 * HOW IT WORKS:
 * 1. Admin assigns a Bluetooth iBeacon UUID to each job site via the admin portal
 * 2. App scans for BLE devices every 5 seconds during an active shift
 * 3. When the medic's phone detects the site beacon 3 consecutive scans in a row,
 *    it records an "arrived_on_site" event locally with the exact timestamp
 * 4. When the beacon is not detected for 3 consecutive scans, "left_site" is recorded
 * 5. All beacon events are queued offline (beacon implies no signal) and sync when
 *    connectivity returns, alongside the GPS ping queue
 * 6. Events are labelled source="beacon_auto" so the admin timeline can distinguish
 *    GPS geofence check-ins from Bluetooth beacon check-ins
 *
 * SUPPORTS: iBeacon (Apple) and Eddystone-UID (Google) — both standard formats
 *           found on any off-the-shelf BLE beacon
 *
 * FALLBACK PRIORITY: GPS geofence → BLE beacon → manual button press
 * Beacon only fires events when GPS tracking hasn't already done so.
 */

import { BleManager, Device, State } from 'react-native-ble-plx';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../src/lib/supabase';

// Storage keys
const BEACON_CONFIG_KEY = '@sitemedic:beacon_configs';
const BEACON_EVENT_QUEUE_KEY = '@sitemedic:beacon_event_queue';

// Scanning config
const SCAN_INTERVAL_MS = 5000;       // Scan every 5 seconds
const CONSECUTIVE_SCANS_REQUIRED = 3; // Require 3 consecutive detections before firing event
const RSSI_THRESHOLD = -80;           // Signal must be stronger than -80 dBm (within ~10m)

// iBeacon Apple company identifier
const APPLE_COMPANY_ID = '4c00';

// Types

export interface BeaconConfig {
  uuid: string;        // iBeacon UUID (lowercase, with hyphens e.g. "f7826da6-4fa2-4e98-8024-bc5b71e0893e")
  major?: number;      // Optional iBeacon major (can scope to a specific site group)
  minor?: number;      // Optional iBeacon minor (can scope to specific spot on site)
  siteId: string;
  bookingId: string;
  siteName: string;
}

interface BeaconShiftEvent {
  medic_id: string;
  booking_id: string;
  event_type: string;
  event_timestamp: string;
  source: 'beacon_auto';
  notes: string;
  device_info: {
    beacon_uuid: string;
    beacon_major?: number;
    beacon_minor?: number;
    rssi: number;
    consecutive_scans: number;
  };
}

interface BeaconState {
  consecutiveDetections: number;
  consecutiveMisses: number;
  isOnSite: boolean;
  lastDetectedAt?: string;
  lastExitAt?: string;
  lastRssi?: number;
}

class BeaconService {
  private bleManager: BleManager | null = null;
  private isScanning = false;
  private knownBeacons: BeaconConfig[] = [];
  private beaconStates: Map<string, BeaconState> = new Map(); // keyed by beacon UUID
  private scanIntervalId: ReturnType<typeof setInterval> | null = null;
  private eventQueue: BeaconShiftEvent[] = [];
  private currentMedicId: string | null = null;
  private currentBookingId: string | null = null;
  // Track which beacons GPS has already handled so we don't double-fire
  private gpsHandledEvents: Set<string> = new Set();

  /**
   * Initialise BLE manager (call once at app startup)
   */
  async init(): Promise<void> {
    try {
      this.bleManager = new BleManager();

      // Wait for BLE to be powered on before doing anything
      await new Promise<void>((resolve, reject) => {
        const sub = this.bleManager!.onStateChange((state) => {
          if (state === State.PoweredOn) {
            sub.remove();
            resolve();
          } else if (state === State.Unsupported || state === State.Unauthorized) {
            sub.remove();
            reject(new Error(`BLE not available: ${state}`));
          }
        }, true);
      });

      await this.loadBeaconConfigs();
      await this.loadEventQueue();
      console.log('[BeaconService] Initialized — known beacons:', this.knownBeacons.length);
    } catch (error) {
      console.warn('[BeaconService] Init failed (BLE unavailable):', error);
      // Non-fatal — GPS is the primary system; beacons are fallback
    }
  }

  /**
   * Start beacon scanning for an active shift
   *
   * WHY: Called when a shift starts, alongside GPS tracking. The service
   * watches for any of the known site beacons while the shift is active.
   */
  async startScanning(medicId: string, bookingId: string): Promise<void> {
    if (!this.bleManager) {
      console.warn('[BeaconService] BLE not available — skipping beacon scan');
      return;
    }

    if (this.isScanning) {
      console.warn('[BeaconService] Already scanning');
      return;
    }

    this.currentMedicId = medicId;
    this.currentBookingId = bookingId;
    this.isScanning = true;

    // Initialise state for all known beacons
    for (const beacon of this.knownBeacons) {
      if (!this.beaconStates.has(beacon.uuid)) {
        this.beaconStates.set(beacon.uuid, {
          consecutiveDetections: 0,
          consecutiveMisses: 0,
          isOnSite: false,
        });
      }
    }

    console.log('[BeaconService] Scanning started for', this.knownBeacons.length, 'beacon(s)');
    await this.runScanCycle();

    // Schedule repeated scans
    this.scanIntervalId = setInterval(() => this.runScanCycle(), SCAN_INTERVAL_MS);
  }

  /**
   * Stop beacon scanning at end of shift
   */
  stopScanning(): void {
    if (this.scanIntervalId) {
      clearInterval(this.scanIntervalId);
      this.scanIntervalId = null;
    }

    if (this.bleManager && this.isScanning) {
      this.bleManager.stopDeviceScan();
    }

    this.isScanning = false;
    this.currentMedicId = null;
    this.currentBookingId = null;
    console.log('[BeaconService] Scanning stopped');
  }

  /**
   * Tell the beacon service that GPS has already handled an arrival/departure
   * so we don't fire a duplicate event for the same beacon.
   */
  notifyGpsHandled(eventType: 'arrived_on_site' | 'left_site', beaconUuid: string): void {
    const key = `${eventType}:${beaconUuid}`;
    this.gpsHandledEvents.add(key);
    // Clear after 10 minutes so beacon can handle future events on same shift
    setTimeout(() => this.gpsHandledEvents.delete(key), 10 * 60 * 1000);
  }

  /**
   * Sync any queued beacon events to the server
   * Called when connectivity is restored (same trigger as GPS ping sync)
   */
  async syncEventQueue(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    console.log(`[BeaconService] Syncing ${this.eventQueue.length} queued beacon events`);

    const sorted = [...this.eventQueue].sort(
      (a, b) => new Date(a.event_timestamp).getTime() - new Date(b.event_timestamp).getTime()
    );

    const synced: string[] = [];

    for (const event of sorted) {
      try {
        const { error } = await supabase.functions.invoke('medic-shift-event', { body: event });
        if (error) {
          console.error('[BeaconService] Failed to sync event:', error);
          break;
        }
        synced.push(event.event_timestamp);
        console.log('[BeaconService] Synced:', event.event_type, 'at', event.event_timestamp);
      } catch {
        break;
      }
    }

    this.eventQueue = this.eventQueue.filter((e) => !synced.includes(e.event_timestamp));
    await AsyncStorage.setItem(BEACON_EVENT_QUEUE_KEY, JSON.stringify(this.eventQueue));
  }

  /**
   * Get number of queued beacon events (for status display)
   */
  getQueueSize(): number {
    return this.eventQueue.length;
  }

  /**
   * Load beacon configurations assigned by admin for each site
   */
  async loadBeaconConfigs(): Promise<void> {
    const json = await AsyncStorage.getItem(BEACON_CONFIG_KEY);
    if (json) {
      this.knownBeacons = JSON.parse(json);
    }
  }

  /**
   * Update beacon configs from server (call when booking loads)
   */
  async refreshBeaconConfigs(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('site_beacons')
        .select('uuid, major, minor, site_id, booking_id, site_name')
        .eq('is_active', true);

      if (!error && data) {
        this.knownBeacons = data.map((row: any) => ({
          uuid: row.uuid.toLowerCase(),
          major: row.major,
          minor: row.minor,
          siteId: row.site_id,
          bookingId: row.booking_id,
          siteName: row.site_name,
        }));
        await AsyncStorage.setItem(BEACON_CONFIG_KEY, JSON.stringify(this.knownBeacons));
        console.log('[BeaconService] Refreshed', this.knownBeacons.length, 'beacon config(s)');
      }
    } catch (error) {
      console.warn('[BeaconService] Could not refresh beacon configs:', error);
    }
  }

  // ─────────────────────────────────────────────────────────
  // Private methods
  // ─────────────────────────────────────────────────────────

  /**
   * Run one BLE scan cycle (3 seconds active scan, then process results)
   */
  private async runScanCycle(): Promise<void> {
    if (!this.bleManager || !this.isScanning) return;

    const detectedUuids = new Set<string>();

    try {
      await new Promise<void>((resolve) => {
        // Scan for 3 seconds, then resolve
        const timeout = setTimeout(() => {
          this.bleManager!.stopDeviceScan();
          resolve();
        }, 3000);

        this.bleManager!.startDeviceScan(
          null, // No UUID filter at scan level — we parse manually for iBeacon
          { allowDuplicates: false },
          (error, device) => {
            if (error || !device) return;

            const matchedUuid = this.parseDevice(device);
            if (matchedUuid) {
              detectedUuids.add(matchedUuid);
            }
          }
        );
      });
    } catch (error) {
      console.warn('[BeaconService] Scan error:', error);
    }

    // Update state for each known beacon and fire events if threshold met
    for (const beacon of this.knownBeacons) {
      await this.updateBeaconState(beacon, detectedUuids.has(beacon.uuid));
    }
  }

  /**
   * Parse a BLE device advertisement to check if it's a known iBeacon or Eddystone
   * Returns the matched beacon UUID string, or null if not recognised
   */
  private parseDevice(device: Device): string | null {
    // ── iBeacon parsing ───────────────────────────────────────────────────────
    // iBeacon manufacturer data layout (25 bytes):
    //   [0-1]  Apple company ID: 0x4C 0x00
    //   [2]    iBeacon type: 0x02
    //   [3]    iBeacon length: 0x15
    //   [4-19] Proximity UUID (16 bytes)
    //   [20-21] Major (big-endian)
    //   [22-23] Minor (big-endian)
    //   [24]   TX Power
    if (device.manufacturerData) {
      try {
        const raw = Buffer.from(device.manufacturerData, 'base64');
        if (
          raw.length >= 25 &&
          raw[0] === 0x4c && raw[1] === 0x00 && // Apple company ID
          raw[2] === 0x02 &&                      // iBeacon type
          raw[3] === 0x15                         // iBeacon length (21 bytes)
        ) {
          const uuidBytes = raw.slice(4, 20);
          const uuid = [
            uuidBytes.slice(0, 4).toString('hex'),
            uuidBytes.slice(4, 6).toString('hex'),
            uuidBytes.slice(6, 8).toString('hex'),
            uuidBytes.slice(8, 10).toString('hex'),
            uuidBytes.slice(10, 16).toString('hex'),
          ].join('-').toLowerCase();

          const major = (raw[20] << 8) | raw[21];
          const minor = (raw[22] << 8) | raw[23];
          const rssi = device.rssi ?? -999;

          const matched = this.knownBeacons.find((b) => {
            if (b.uuid !== uuid) return false;
            if (b.major !== undefined && b.major !== major) return false;
            if (b.minor !== undefined && b.minor !== minor) return false;
            return rssi >= RSSI_THRESHOLD;
          });

          if (matched) {
            console.log(`[BeaconService] iBeacon detected: ${uuid} RSSI ${rssi}`);
            return matched.uuid;
          }
        }
      } catch {
        // Not a valid iBeacon — ignore and try Eddystone
      }
    }

    // ── Eddystone-UID parsing ─────────────────────────────────────────────────
    // Eddystone uses service data with service UUID 0xFEAA
    // Frame type 0x00 = Eddystone-UID
    if (device.serviceData) {
      const eddystoneData = device.serviceData['0000feaa-0000-1000-8000-00805f9b34fb'];
      if (eddystoneData) {
        try {
          const raw = Buffer.from(eddystoneData, 'base64');
          if (raw[0] === 0x00) { // UID frame type
            // Bytes 2-11: 10-byte Namespace ID
            // Bytes 12-17: 6-byte Instance ID
            const namespace = raw.slice(2, 12).toString('hex');
            const instance = raw.slice(12, 18).toString('hex');
            // We store Eddystone as "eddystone:<namespace>:<instance>" in BeaconConfig uuid field
            const eddystoneId = `eddystone:${namespace}:${instance}`.toLowerCase();
            const rssi = device.rssi ?? -999;

            const matched = this.knownBeacons.find(
              (b) => b.uuid === eddystoneId && rssi >= RSSI_THRESHOLD
            );

            if (matched) {
              console.log(`[BeaconService] Eddystone-UID detected: ${eddystoneId} RSSI ${rssi}`);
              return matched.uuid;
            }
          }
        } catch {
          // Not Eddystone
        }
      }
    }

    return null;
  }

  /**
   * Update consecutive detection state for a beacon and fire arrival/departure
   * events when the threshold is crossed
   */
  private async updateBeaconState(beacon: BeaconConfig, detected: boolean): Promise<void> {
    if (!this.currentMedicId || !this.currentBookingId) return;

    const state = this.beaconStates.get(beacon.uuid) ?? {
      consecutiveDetections: 0,
      consecutiveMisses: 0,
      isOnSite: false,
    };

    if (detected) {
      state.consecutiveDetections++;
      state.consecutiveMisses = 0;
    } else {
      state.consecutiveMisses++;
      state.consecutiveDetections = 0;
    }

    this.beaconStates.set(beacon.uuid, state);

    // ── Arrival ───────────────────────────────────────────────────────────────
    if (
      !state.isOnSite &&
      state.consecutiveDetections >= CONSECUTIVE_SCANS_REQUIRED &&
      !this.gpsHandledEvents.has(`arrived_on_site:${beacon.uuid}`)
    ) {
      state.isOnSite = true;
      state.lastDetectedAt = new Date().toISOString();
      console.log('[BeaconService] ARRIVAL detected via beacon:', beacon.siteName);

      await this.queueOrSendEvent({
        medic_id: this.currentMedicId,
        booking_id: this.currentBookingId,
        event_type: 'arrived_on_site',
        event_timestamp: state.lastDetectedAt,
        source: 'beacon_auto',
        notes: `Bluetooth beacon check-in at ${beacon.siteName} (${CONSECUTIVE_SCANS_REQUIRED} consecutive detections)`,
        device_info: {
          beacon_uuid: beacon.uuid,
          beacon_major: beacon.major,
          beacon_minor: beacon.minor,
          rssi: state.lastRssi ?? RSSI_THRESHOLD,
          consecutive_scans: CONSECUTIVE_SCANS_REQUIRED,
        },
      });
    }

    // ── Departure ─────────────────────────────────────────────────────────────
    if (
      state.isOnSite &&
      state.consecutiveMisses >= CONSECUTIVE_SCANS_REQUIRED &&
      !this.gpsHandledEvents.has(`left_site:${beacon.uuid}`)
    ) {
      state.isOnSite = false;
      state.lastExitAt = new Date().toISOString();
      console.log('[BeaconService] DEPARTURE detected via beacon:', beacon.siteName);

      await this.queueOrSendEvent({
        medic_id: this.currentMedicId,
        booking_id: this.currentBookingId,
        event_type: 'left_site',
        event_timestamp: state.lastExitAt,
        source: 'beacon_auto',
        notes: `Bluetooth beacon check-out at ${beacon.siteName} (${CONSECUTIVE_SCANS_REQUIRED} consecutive misses)`,
        device_info: {
          beacon_uuid: beacon.uuid,
          beacon_major: beacon.major,
          beacon_minor: beacon.minor,
          rssi: state.lastRssi ?? RSSI_THRESHOLD,
          consecutive_scans: CONSECUTIVE_SCANS_REQUIRED,
        },
      });
    }
  }

  /**
   * Send event immediately if online, otherwise queue it.
   * Beacons usually imply no signal so we almost always queue.
   */
  private async queueOrSendEvent(event: BeaconShiftEvent): Promise<void> {
    try {
      const { data } = await supabase.functions.invoke('medic-shift-event', { body: event });
      if (data) {
        console.log('[BeaconService] Event sent live:', event.event_type);
        return;
      }
    } catch {
      // Offline or error — fall through to queue
    }

    // Queue for sync when signal returns
    this.eventQueue.push(event);
    await AsyncStorage.setItem(BEACON_EVENT_QUEUE_KEY, JSON.stringify(this.eventQueue));
    console.log(`[BeaconService] Event queued (${this.eventQueue.length} total):`, event.event_type);
  }

  private async loadEventQueue(): Promise<void> {
    const json = await AsyncStorage.getItem(BEACON_EVENT_QUEUE_KEY);
    if (json) {
      this.eventQueue = JSON.parse(json);
      console.log(`[BeaconService] Loaded ${this.eventQueue.length} queued beacon events`);
    }
  }
}

// Singleton
export const beaconService = new BeaconService();
export default beaconService;
