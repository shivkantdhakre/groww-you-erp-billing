import React, { useCallback } from 'react';
import { Pressable, Text, ActivityIndicator, GestureResponderEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ButtonProps extends React.ComponentPropsWithoutRef<typeof Pressable> {
  label: string;
  variant?: 'primary' | 'navy' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: any;
  haptic?: boolean;
  onPress?: (event: GestureResponderEvent) => void;
}

export const Button = React.forwardRef<React.ElementRef<typeof Pressable>, ButtonProps>(
  (
    {
      label,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled = false,
      icon,
      haptic = true,
      className = '',
      onPress,
      ...props
    },
    ref
  ) => {
    const scale = useSharedValue(1);

    const variantStyles = {
      primary: 'bg-action-orange border border-action-orange',
      navy: 'bg-[#1B3A5C] border border-[#1B3A5C]',
      outline: 'bg-transparent border border-gray-700',
      ghost: 'bg-transparent border border-transparent',
    };

    const textColors = {
      primary: 'text-[#0A0F1D]',
      navy: 'text-white',
      outline: 'text-white',
      ghost: 'text-gray-400',
    };

    const sizeStyles = {
      sm: 'px-4 min-h-[44px] justify-center rounded-xl',
      md: 'px-6 min-h-[48px] justify-center rounded-xl',
      lg: 'px-8 min-h-[56px] justify-center rounded-xl',
    };

    const textSizeStyles = {
      sm: 'text-xs font-semibold',
      md: 'text-sm font-bold',
      lg: 'text-base font-black',
    };

    const loaderColors = {
      primary: '#0A0F1D',
      navy: '#FFFFFF',
      outline: '#FFFFFF',
      ghost: '#9CA3AF',
    };

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
      scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
    };

    const handlePressOut = () => {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    };

    const handlePress = useCallback(
      (event: GestureResponderEvent) => {
        if (haptic && !disabled && !loading) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }
        if (onPress) onPress(event);
      },
      [haptic, disabled, loading, onPress]
    );

    return (
      <AnimatedPressable
        ref={ref}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        accessibilityRole="button"
        accessibilityState={{ disabled: disabled || loading }}
        className={`flex-row items-center justify-center border ${
          variantStyles[variant]
        } ${sizeStyles[size]} ${disabled ? 'opacity-40' : ''} ${className}`}
        style={animatedStyle}
        {...props}
      >
        {loading ? (
          <ActivityIndicator color={loaderColors[variant]} className="mr-2" size="small" />
        ) : icon ? (
          <Ionicons name={icon as any} size={20} color={loaderColors[variant]} style={{ marginRight: 8 }} />
        ) : null}
        
        <Text maxFontSizeMultiplier={1.2} className={`font-lexend tracking-wide text-center ${
          textColors[variant]
        } ${textSizeStyles[size]}`}>
          {label}
        </Text>
      </AnimatedPressable>
    );
  }
);

Button.displayName = 'Button';
