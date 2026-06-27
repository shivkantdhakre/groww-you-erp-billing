import React, { useCallback } from 'react';
import { Pressable, Text, ActivityIndicator, GestureResponderEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { colors, typography, spacing, radius, animations } from '../../constants';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ButtonProps extends React.ComponentPropsWithoutRef<typeof Pressable> {
  label: string;
  variant?: 'primary' | 'navy' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
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
      primary: { backgroundColor: colors.accent, borderColor: colors.accent },
      navy: { backgroundColor: colors.surfaceElevated, borderColor: colors.borderSubtle },
      outline: { backgroundColor: 'transparent', borderColor: colors.borderStrong },
      ghost: { backgroundColor: 'transparent', borderColor: 'transparent' },
    };

    const textColors = {
      primary: colors.textInverse,
      navy: colors.textPrimary,
      outline: colors.textPrimary,
      ghost: colors.textSecondary,
    };

    const sizeStyles = {
      sm: { paddingHorizontal: spacing.lg, minHeight: 44, borderRadius: radius.lg },
      md: { paddingHorizontal: spacing.xl, minHeight: 48, borderRadius: radius.lg },
      lg: { paddingHorizontal: spacing.xxl, minHeight: 56, borderRadius: radius.xl },
    };

    const textSizeStyles = {
      sm: typography.captionStrong,
      md: typography.bodyStrong,
      lg: typography.subheading,
    };

    const loaderColors = {
      primary: colors.textInverse,
      navy: colors.textPrimary,
      outline: colors.textPrimary,
      ghost: colors.textSecondary,
    };

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
      scale.value = animations.spring.standard(animations.motion.press.scaleDown);
    };

    const handlePressOut = () => {
      scale.value = animations.spring.standard(animations.motion.press.scaleUp);
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
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            opacity: disabled ? 0.4 : 1,
          },
          variantStyles[variant],
          sizeStyles[size],
          animatedStyle,
          props.style
        ]}
        className={className}
        {...props}
      >
        {loading ? (
          <ActivityIndicator color={loaderColors[variant]} className="mr-2" size="small" />
        ) : icon ? (
          <Ionicons name={icon} size={20} color={loaderColors[variant]} style={{ marginRight: 8 }} />
        ) : null}
        
        <Text 
          maxFontSizeMultiplier={1.2} 
          style={[
            textSizeStyles[size],
            { color: textColors[variant], textAlign: 'center' }
          ]}
        >
          {label}
        </Text>
      </AnimatedPressable>
    );
  }
);

Button.displayName = 'Button';
