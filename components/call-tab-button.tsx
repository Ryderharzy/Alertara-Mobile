import React from 'react';
import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { TealColors } from '@/constants/theme';

export function CallTabButton(props: BottomTabBarButtonProps) {
  const {
    ref: _navigationRef,
    style: _navigationStyle,
    children: _navigationChildren,
    ...pressableProps
  } = props;

  return (
    <Pressable
      {...pressableProps}
      style={({ pressed }) => [
        styles.button,
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={styles.inner}>
        <IconSymbol name="phone" size={28} color="#fff" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    top: -20,
    justifyContent: 'center',
    alignItems: 'center',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: TealColors.primary,
  },
  inner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
