/**
 * SignaturePad - Full-screen signature canvas
 *
 * Features:
 * - Full-screen modal for maximum drawing area
 * - Thick pen stroke (3-4px) for gloves-on signing
 * - Large buttons (56pt minimum) for Clear, Save, Cancel
 * - Base64 PNG output for storage
 *
 * Note: SignatureCanvas may show blank in Expo Go dev mode (Research Pitfall 4).
 * This is expected behavior. Works in production builds and dev client builds.
 */

import React, { useRef } from 'react';
import { Modal, View, StyleSheet, Text, Pressable } from 'react-native';
import SignatureCanvas from 'react-native-signature-canvas';

export interface SignaturePadProps {
  onSave: (base64: string) => void;
  visible: boolean;
  onClose: () => void;
  title?: string;
}

/**
 * SignaturePad component for capturing digital signatures
 *
 * Uses react-native-signature-canvas with full-screen modal.
 * Generates base64 PNG on signature completion.
 */
export default function SignaturePad({
  onSave,
  visible,
  onClose,
  title = 'Sign here',
}: SignaturePadProps) {
  const signatureRef = useRef<any>(null);

  const handleOK = (signature: string) => {
    // signature is base64 PNG string
    onSave(signature);
    onClose();
  };

  const handleClear = () => {
    signatureRef.current?.clearSignature();
  };

  const handleEmpty = () => {
    console.log('Signature cleared');
  };

  // WebView custom styles for large tap targets and high contrast
  const webStyle = `
    .m-signature-pad--footer {
      display: flex;
      justify-content: space-between;
      padding: 16px;
      background-color: #F9FAFB;
    }
    .m-signature-pad {
      box-shadow: none;
      border: none;
    }
    .m-signature-pad--body {
      border: 2px solid #E5E7EB;
      background-color: #FFFFFF;
    }
    canvas {
      background-color: white;
    }
    button {
      padding: 16px 32px;
      font-size: 18px;
      min-height: 56px; /* Large tap target (56pt for gloves) */
      min-width: 120px;
      border-radius: 8px;
      border: none;
      font-weight: 600;
      cursor: pointer;
    }
    button[data-action="clear"] {
      background-color: #6B7280;
      color: white;
    }
    button[data-action="save"] {
      background-color: #2563EB;
      color: white;
    }
    button:active {
      opacity: 0.8;
    }
  `;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header with title and cancel button */}
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Pressable
            onPress={onClose}
            style={styles.cancelButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
        </View>

        {/* Full-screen signature canvas */}
        <View style={styles.canvasContainer}>
          <SignatureCanvas
            ref={signatureRef}
            onOK={handleOK}
            onEmpty={handleEmpty}
            onClear={handleClear}
            descriptionText={title}
            clearText="Clear"
            confirmText="Save"
            webStyle={webStyle}
            penColor="#000000" // Black ink
            dotSize={3} // Thick stroke for gloves (Research Pattern 4)
            minWidth={3}
            maxWidth={4}
            backgroundColor="#FFFFFF"
          />
        </View>

        {/* Instructions */}
        <View style={styles.footer}>
          <Text style={styles.instructions}>
            Sign with your finger. Use Clear to start over, Save when finished.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  cancelButton: {
    minHeight: 44, // Minimum tap target
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444', // Red
  },
  canvasContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3, // Android shadow
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  instructions: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});
