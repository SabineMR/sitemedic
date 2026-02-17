/**
 * SOSButton.tsx
 *
 * Floating red SOS button that lives on every screen (added to tab layout).
 *
 * WHY: Medics wearing gloves need instant access to emergency alert in any situation.
 * The button pulsates so it's never missed. Positioned above the tab bar.
 *
 * Tap → confirmation sheet → opens SOSModal
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import SOSModal from './SOSModal';

export default function SOSButton() {
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [sosModalVisible, setSosModalVisible] = useState(false);

  const handleConfirm = () => {
    setConfirmVisible(false);
    setSosModalVisible(true);
  };

  return (
    <>
      {/* Floating SOS button */}
      <View style={styles.container} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.button}
          onPress={() => setConfirmVisible(true)}
          activeOpacity={0.85}
          accessibilityLabel="Emergency SOS"
          accessibilityRole="button"
          accessibilityHint="Sends an emergency alert to your site contact"
        >
          <Text style={styles.label}>SOS</Text>
        </TouchableOpacity>
      </View>

      {/* Confirmation bottom sheet */}
      <Modal
        visible={confirmVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setConfirmVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setConfirmVisible(false)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.sheet}>
                <View style={styles.sheetHandle} />
                <Text style={styles.sheetTitle}>Send Emergency Alert?</Text>
                <Text style={styles.sheetBody}>
                  This immediately notifies your site contact and sends an emergency alert.
                  Use only for genuine medical emergencies.
                </Text>
                <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
                  <Text style={styles.confirmButtonText}>Yes, Send Emergency Alert</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setConfirmVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Full SOS flow modal */}
      <SOSModal
        visible={sosModalVisible}
        onClose={() => setSosModalVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    zIndex: 999,
    elevation: 10,
  },
  button: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 3,
    borderColor: '#FCA5A5',
  },
  label: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 18,
    letterSpacing: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  sheetBody: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  confirmButton: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 17,
  },
  cancelButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 16,
  },
});
