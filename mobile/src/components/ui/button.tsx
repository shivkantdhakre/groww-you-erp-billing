import React from 'react';
import { Pressable, Text, ActivityIndicator, GestureResponderEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ButtonProps extends React.ComponentPropsWithoutRef<typeof Pressable> {
  label: string;
  variant?: 'primary' | 'navy' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: any;
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
      className = '',
      onPress,
      ...props
    },
    ref
  ) => {
    // Dynamic variant styles
    const variantStyles = {
      primary: 'bg-action-orange border border-action-orange active:opacity-90',
      navy: 'bg-[#1B3A5C] border border-[#1B3A5C] active:opacity-90',
      outline: 'bg-transparent border border-gray-700 active:bg-gray-800/10',
      ghost: 'bg-transparent border border-transparent active:bg-gray-800/10',
    };

    // Dynamic text colors
    const textColors = {
      primary: 'text-[#0A0F1D]', // dark contrast on brand orange
      navy: 'text-white',
      outline: 'text-white',
      ghost: 'text-gray-400',
    };

    // Dynamic button sizing
    const sizeStyles = {
      sm: 'px-4 min-h-[44px] justify-center rounded-xl',
      md: 'px-6 min-h-[48px] justify-center rounded-2xl',
      lg: 'px-8 min-h-[56px] justify-center rounded-2xl',
    };

    // Dynamic text sizing
    const textSizeStyles = {
      sm: 'text-xs font-semibold',
      md: 'text-sm font-bold',
      lg: 'text-base font-black',
    };

    // Activity Indicator colors
    const loaderColors = {
      primary: '#0A0F1D',
      navy: '#FFFFFF',
      outline: '#FFFFFF',
      ghost: '#9CA3AF',
    };

    return (
      <Pressable
        ref={ref}
        onPress={onPress}
        disabled={disabled || loading}
        accessibilityRole="button"
        accessibilityState={{ disabled: disabled || loading }}
        className={`flex-row items-center justify-center border ${
          variantStyles[variant]
        } ${sizeStyles[size]} ${disabled ? 'opacity-40' : ''} ${className}`}
        {...props}
      >
        {loading ? (
          <ActivityIndicator color={loaderColors[variant]} className="mr-2" size="small" />
        ) : icon ? (
          <Ionicons name={icon as any} size={20} color={loaderColors[variant]} style={{ marginRight: 8 }} />
        ) : null}
        
        <Text className={`font-lexend tracking-wide text-center ${
          textColors[variant]
        } ${textSizeStyles[size]}`}>
          {label}
        </Text>
      </Pressable>
    );
  }
);

Button.displayName = 'Button';
