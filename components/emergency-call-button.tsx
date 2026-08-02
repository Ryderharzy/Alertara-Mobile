import { FontAwesome5 } from '@expo/vector-icons';
import React from 'react';
import { GestureResponderEvent, Pressable, StyleSheet, View } from 'react-native';

const BUTTON_SIZE = 70;

interface EmergencyCallButtonProps {
  onPress?: (event: GestureResponderEvent) => void;
}

export function EmergencyCallButton({ onPress }: EmergencyCallButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Start emergency call"
      accessibilityHint="Opens the direct emergency call screen"
      onPress={onPress}
      hitSlop={12}
      style={({ pressed }) => [styles.touchTarget, pressed && styles.pressed]}
    >
      <View style={styles.button}>
        <FontAwesome5 name="phone-alt" size={29} color="#ffffff" solid />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touchTarget: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    zIndex: 102,
    elevation: 24,
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16a34a',
    borderWidth: 4,
    borderColor: '#071816',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 7,
    elevation: 24,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.95 }],
  },
});
