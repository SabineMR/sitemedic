/**
 * SwipeableListItem - Reusable swipeable list item component
 *
 * Features:
 * - Swipe left to reveal delete action
 * - Swipe right to reveal edit/view action
 * - Animated swipe gestures
 * - Customizable action buttons
 */

import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

interface SwipeableListItemProps {
  children: React.ReactNode;
  onDelete?: () => void;
  onEdit?: () => void;
  deleteLabel?: string;
  editLabel?: string;
  showEdit?: boolean;
  showDelete?: boolean;
}

export default function SwipeableListItem({
  children,
  onDelete,
  onEdit,
  deleteLabel = 'Delete',
  editLabel = 'Edit',
  showEdit = true,
  showDelete = true,
}: SwipeableListItemProps) {
  const swipeableRef = useRef<Swipeable>(null);

  // Render right actions (shown when swiping left)
  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    if (!showDelete) return null;

    const translateX = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [0, 100],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View
        style={[
          styles.rightActionsContainer,
          { transform: [{ translateX }] },
        ]}
      >
        <Pressable
          style={styles.deleteButton}
          onPress={() => {
            swipeableRef.current?.close();
            onDelete?.();
          }}
        >
          <Text style={styles.deleteButtonText}>{deleteLabel}</Text>
        </Pressable>
      </Animated.View>
    );
  };

  // Render left actions (shown when swiping right)
  const renderLeftActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    if (!showEdit) return null;

    const translateX = dragX.interpolate({
      inputRange: [0, 100],
      outputRange: [-100, 0],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View
        style={[
          styles.leftActionsContainer,
          { transform: [{ translateX }] },
        ]}
      >
        <Pressable
          style={styles.editButton}
          onPress={() => {
            swipeableRef.current?.close();
            onEdit?.();
          }}
        >
          <Text style={styles.editButtonText}>{editLabel}</Text>
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={showDelete ? renderRightActions : undefined}
      renderLeftActions={showEdit ? renderLeftActions : undefined}
      overshootRight={false}
      overshootLeft={false}
      rightThreshold={40}
      leftThreshold={40}
    >
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  rightActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  leftActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
    borderRadius: 8,
    marginLeft: 8,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  editButton: {
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
    borderRadius: 8,
    marginRight: 8,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
