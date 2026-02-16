import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';

export interface PresetTemplateCardProps {
  label: string;
  icon: string;
  subtitle: string;
  onPress: () => void;
  isSelected?: boolean;
}

/**
 * PresetTemplateCard - Large tappable card for quick treatment templates
 *
 * Design specs:
 * - Large tappable card: minHeight 80, full width
 * - Icon on left (32px), label (bold), subtitle below
 * - High contrast colors for outdoor sunlight readability
 * - Press feedback: opacity 0.8
 * - Gloves-on friendly (56pt minimum tap target)
 */
export default function PresetTemplateCard({
  label,
  icon,
  subtitle,
  onPress,
  isSelected = false,
}: PresetTemplateCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        isSelected && styles.cardSelected,
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 80,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  cardPressed: {
    opacity: 0.8,
  },
  iconContainer: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  icon: {
    fontSize: 32,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
  },
});
