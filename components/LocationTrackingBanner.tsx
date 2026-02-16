/**
 * LocationTrackingBanner.tsx
 *
 * Persistent banner shown to medic during active shift tracking.
 *
 * WHY: Provides visual feedback that tracking is active, shows status,
 * and allows manual arrival/departure marking if needed.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { locationTrackingService } from '../services/LocationTrackingService';

interface Props {
  booking: any;
  medicId: string;
  onArrived: () => void;
  onDeparted: () => void;
}

export const LocationTrackingBanner: React.FC<Props> = ({
  booking,
  medicId,
  onArrived,
  onDeparted,
}) => {
  const [status, setStatus] = useState(locationTrackingService.getStatus());
  const [batteryLevel, setBatteryLevel] = useState(100);

  useEffect(() => {
    // Update status every 5 seconds
    const interval = setInterval(() => {
      setStatus(locationTrackingService.getStatus());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleMarkArrived = async () => {
    try {
      await locationTrackingService.markArrived(medicId);
      onArrived();
    } catch (error) {
      console.error('Error marking arrival:', error);
      alert('Failed to mark arrival');
    }
  };

  const handleMarkDeparture = async () => {
    try {
      await locationTrackingService.markDeparture(medicId);
      onDeparted();
    } catch (error) {
      console.error('Error marking departure:', error);
      alert('Failed to mark departure');
    }
  };

  if (!status.isTracking) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Status Indicator */}
      <View style={styles.statusRow}>
        <View
          style={[
            styles.statusDot,
            { backgroundColor: status.insideGeofence ? '#10B981' : '#3B82F6' },
          ]}
        />
        <Text style={styles.statusText}>
          {status.insideGeofence ? 'On-site' : 'Traveling to site'}
        </Text>

        {/* Offline queue indicator */}
        {status.queueSize > 0 && (
          <View style={styles.queueBadge}>
            <Text style={styles.queueText}>{status.queueSize} queued</Text>
          </View>
        )}
      </View>

      {/* Booking Info */}
      <Text style={styles.bookingText}>
        {booking.site_name} • {booking.shift_hours}hr shift
      </Text>

      {/* Manual Control Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.arrivedButton]}
          onPress={handleMarkArrived}
          disabled={status.insideGeofence}
        >
          <Text style={styles.buttonText}>Mark Arrived</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.departureButton]}
          onPress={handleMarkDeparture}
          disabled={!status.insideGeofence}
        >
          <Text style={styles.buttonText}>Mark Departure</Text>
        </TouchableOpacity>
      </View>

      {/* Info Text */}
      <Text style={styles.infoText}>
        Location updates every 30 seconds
        {status.queueSize > 0 && ' • Offline - will sync when connected'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1F2937',
    padding: 16,
    borderRadius: 12,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  queueBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  queueText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  bookingText: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  arrivedButton: {
    backgroundColor: '#10B981',
  },
  departureButton: {
    backgroundColor: '#EF4444',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  infoText: {
    color: '#6B7280',
    fontSize: 12,
    textAlign: 'center',
  },
});
