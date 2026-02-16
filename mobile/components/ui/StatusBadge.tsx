import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

export interface StatusBadgeProps {
  status: 'green' | 'amber' | 'red' | 'grey';
  label: string;
  size?: 'small' | 'large';
}

/**
 * StatusBadge - High-contrast status indicator
 *
 * Design specs:
 * - Large size (56pt height) for interactive use
 * - Small size (28pt height) for display-only contexts
 * - High contrast colors for outdoor readability
 * - Color-coded severity levels
 */
export default function StatusBadge({
  status,
  label,
  size = 'large',
}: StatusBadgeProps) {
  const getStatusColors = () => {
    switch (status) {
      case 'green':
        return {
          backgroundColor: '#10B981', // Green
          textColor: '#FFFFFF',
        };
      case 'amber':
        return {
          backgroundColor: '#F59E0B', // Amber
          textColor: '#1F2937', // Dark text for contrast
        };
      case 'red':
        return {
          backgroundColor: '#EF4444', // Red
          textColor: '#FFFFFF',
        };
      case 'grey':
        return {
          backgroundColor: '#9CA3AF', // Grey
          textColor: '#FFFFFF',
        };
      default:
        return {
          backgroundColor: '#9CA3AF',
          textColor: '#FFFFFF',
        };
    }
  };

  const statusColors = getStatusColors();
  const sizeStyle = size === 'large' ? styles.large : styles.small;

  return (
    <View
      style={[
        styles.badge,
        sizeStyle,
        { backgroundColor: statusColors.backgroundColor },
      ]}
    >
      <Text style={[styles.label, { color: statusColors.textColor }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  large: {
    minHeight: 56,
    paddingVertical: 16,
  },
  small: {
    minHeight: 28,
    paddingVertical: 6,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
});
