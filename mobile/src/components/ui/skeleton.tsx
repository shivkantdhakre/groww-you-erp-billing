import React, { useEffect } from 'react';
import { View, StyleSheet, DimensionValue } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  interpolate 
} from 'react-native-reanimated';

interface SkeletonProps {
  width?: DimensionValue;
  height: DimensionValue;
  className?: string;
}

export function Skeleton({ width = '100%', height, className }: SkeletonProps) {
  const translateX = useSharedValue(-1);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(1, { duration: 1200 }),
      -1, // Infinite repetition
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const offset = interpolate(translateX.value, [-1, 1], [-150, 150]);
    return {
      transform: [{ translateX: offset }],
    };
  });

  return (
    <View 
      style={{ width, height }} 
      className={`bg-[#1A1F2E] overflow-hidden rounded-lg relative ${className || ''}`}
    >
      {/* High-performance hardware-linked animated highlight mask overlay */}
      <Animated.View 
        style={[
          StyleSheet.absoluteFill, 
          { width: '50%', backgroundColor: 'rgba(255, 255, 255, 0.03)' }, 
          animatedStyle
        ]} 
      />
    </View>
  );
}
