import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';

export interface BottomSheetPickerItem {
  id: string;
  label: string;
  icon?: string;
}

export interface BottomSheetPickerProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  items?: BottomSheetPickerItem[];
  onSelect?: (id: string) => void;
  selectedId?: string;
  renderCustomContent?: () => React.ReactNode;
}

/**
 * BottomSheetPicker - Gloves-on friendly picker modal
 *
 * Design specs:
 * - Uses @gorhom/bottom-sheet for smooth animations
 * - 56pt minimum row height for gloves-on tapping
 * - Scrollable content for long lists
 * - Visual feedback for selected items
 * - Keyboard-aware behavior
 */
export default function BottomSheetPicker({
  visible,
  onClose,
  title,
  items,
  onSelect,
  selectedId,
  renderCustomContent,
}: BottomSheetPickerProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['50%', '90%'], []);

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [visible]);

  const handleItemPress = useCallback(
    (id: string) => {
      if (onSelect) {
        onSelect(id);
      }
      onClose();
    },
    [onSelect, onClose]
  );

  if (!visible) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      onClose={onClose}
      enablePanDownToClose
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
    >
      {/* Title bar */}
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Pressable
          onPress={onClose}
          style={styles.closeButton}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>

      {/* Scrollable items or custom content */}
      <BottomSheetScrollView style={styles.scrollView}>
        {renderCustomContent ? (
          renderCustomContent()
        ) : (
          items?.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => handleItemPress(item.id)}
              style={({ pressed }) => [
                styles.item,
                pressed && styles.itemPressed,
                selectedId === item.id && styles.itemSelected,
              ]}
            >
              <Text style={styles.itemLabel}>
                {item.icon && `${item.icon} `}
                {item.label}
              </Text>
              {selectedId === item.id && <Text style={styles.checkmark}>✓</Text>}
            </Pressable>
          ))
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  closeButton: {
    minHeight: 56,
    minWidth: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 24,
    color: '#6B7280',
  },
  scrollView: {
    flex: 1,
  },
  item: {
    minHeight: 56,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  itemLabel: {
    fontSize: 18,
    fontWeight: '500',
    color: '#1F2937',
  },
  itemPressed: {
    backgroundColor: '#F9FAFB',
  },
  itemSelected: {
    backgroundColor: '#EFF6FF',
  },
  checkmark: {
    fontSize: 24,
    color: '#2563EB',
    fontWeight: '700',
  },
});
