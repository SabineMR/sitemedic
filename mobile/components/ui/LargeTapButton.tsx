import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

export interface LargeTapButtonProps {
  onPress: () => void;
  label: string;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: string;
  disabled?: boolean;
}

/**
 * LargeTapButton - Gloves-on friendly button component
 *
 * Design specs:
 * - 56pt minimum height/width (exceeds iOS 44pt and Android 48pt guidelines)
 * - Extended hit slop for easier tapping with gloves
 * - High contrast colors for outdoor sunlight readability
 * - Visual press feedback
 */
export default function LargeTapButton({
  onPress,
  label,
  variant = 'primary',
  icon,
  disabled = false,
}: LargeTapButtonProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: '#2563EB', // Blue
          textColor: '#FFFFFF',
        };
      case 'secondary':
        return {
          backgroundColor: '#E5E7EB', // Light grey
          textColor: '#1F2937', // Dark grey text
        };
      case 'danger':
        return {
          backgroundColor: '#EF4444', // Red
          textColor: '#FFFFFF',
        };
      default:
        return {
          backgroundColor: '#2563EB',
          textColor: '#FFFFFF',
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: variantStyles.backgroundColor },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
    >
      <Text style={[styles.label, { color: variantStyles.textColor }]}>
        {icon && `${icon} `}
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 56,
    minWidth: 56,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 8,
    marginVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
});
