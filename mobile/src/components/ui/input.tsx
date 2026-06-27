import React, { useState } from 'react';
import { View, Text, TextInput, TextInputProps, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, typography, spacing } from '../../constants';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap; // Ionicons name or custom icon node
  trailingIcon?: React.ReactNode;
}

export const Input = React.forwardRef<TextInput, InputProps>(
  ({ label, error, icon, trailingIcon, onFocus, onBlur, className = '', ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);

    const handleFocus = (e: any) => {
      setIsFocused(true);
      if (onFocus) onFocus(e);
    };

    const handleBlur = (e: any) => {
      setIsFocused(false);
      if (onBlur) onBlur(e);
    };

    return (
      <View style={{ marginBottom: spacing.md }} className={className}>
        {label ? (
          <Text maxFontSizeMultiplier={1.2} style={{ color: colors.textSecondary, ...typography.label, marginBottom: spacing.xxs }}>
            {label}
          </Text>
        ) : null}

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surfacePrimary,
            borderWidth: 1,
            borderRadius: radius.lg,
            paddingHorizontal: spacing.lg,
            height: 56,
            borderColor: error ? colors.error : isFocused ? colors.borderFocus : colors.borderSubtle
          }}
        >
          {icon ? (
            <Ionicons
              name={icon}
              size={20}
              color={error ? colors.error : isFocused ? colors.accent : colors.textMuted}
              style={{ marginRight: 10 }}
            />
          ) : null}

          <TextInput
            ref={ref}
            maxFontSizeMultiplier={1.2}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholderTextColor={colors.textMuted}
            style={{ flex: 1, color: colors.textPrimary, ...typography.body }}
            accessibilityLabel={label}
            {...props}
          />

          {trailingIcon ? <View className="ml-2">{trailingIcon}</View> : null}
        </View>

        {error ? (
          <Text maxFontSizeMultiplier={1.2} style={{ color: colors.error, ...typography.caption, marginTop: spacing.xxs }}>
            {error}
          </Text>
        ) : null}
      </View>
    );
  }
);

Input.displayName = 'Input';

interface NumericInputProps extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  label?: string;
  value: string;
  onChangeText: (val: string) => void;
  min?: number;
  max?: number;
  step?: number;
  error?: string;
}

export const NumericInput = React.forwardRef<TextInput, NumericInputProps>(
  ({ label, value, onChangeText, min = 0, max = 999999, step = 1, error, onFocus, onBlur, className = '', ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);

    const handleFocus = (e: any) => {
      setIsFocused(true);
      if (onFocus) onFocus(e);
    };

    const handleBlur = (e: any) => {
      setIsFocused(false);
      
      // Perform onBlur boundary check and sanitization to prevent cursor-jumping
      let sanitized = value.trim();
      
      // If empty or invalid, fallback to min or 0
      if (sanitized === '' || isNaN(Number(sanitized))) {
        onChangeText(min.toString());
      } else {
        let numericVal = Number(sanitized);
        if (numericVal < min) {
          numericVal = min;
        } else if (numericVal > max) {
          numericVal = max;
        }
        onChangeText(numericVal.toString());
      }

      if (onBlur) onBlur(e);
    };

    // Increment control
    const increment = () => {
      const current = parseFloat(value) || 0;
      const next = Math.min(current + step, max);
      onChangeText(next.toString());
    };

    // Decrement control
    const decrement = () => {
      const current = parseFloat(value) || 0;
      const next = Math.max(current - step, min);
      onChangeText(next.toString());
    };

    return (
      <View style={{ marginBottom: spacing.md }} className={className}>
        {label ? (
          <Text maxFontSizeMultiplier={1.2} style={{ color: colors.textSecondary, ...typography.label, marginBottom: spacing.xxs }}>
            {label}
          </Text>
        ) : null}

        <View className="flex-row items-center gap-2">
          {/* Minus Button */}
          <TouchableOpacity
            onPress={decrement}
            activeOpacity={0.7}
            style={{
              backgroundColor: colors.surfacePrimary,
              borderWidth: 1,
              borderColor: colors.borderSubtle,
              borderRadius: radius.lg,
              width: 48,
              height: 56,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="remove" size={20} color={colors.textPrimary} />
          </TouchableOpacity>

          {/* Core Input Wrapper */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              flex: 1,
              backgroundColor: colors.surfacePrimary,
              borderWidth: 1,
              borderRadius: radius.lg,
              paddingHorizontal: spacing.lg,
              height: 56,
              borderColor: error ? colors.error : isFocused ? colors.borderFocus : colors.borderSubtle
            }}
          >
            <TextInput
              ref={ref}
              maxFontSizeMultiplier={1.2}
              value={value}
              onChangeText={onChangeText}
              onFocus={handleFocus}
              onBlur={handleBlur}
              keyboardType="decimal-pad"
              placeholderTextColor={colors.textMuted}
              style={{ flex: 1, color: colors.textPrimary, ...typography.bodyStrong, textAlign: 'center' }}
              accessibilityLabel={label}
              {...props}
            />
          </View>

          {/* Plus Button */}
          <TouchableOpacity
            onPress={increment}
            activeOpacity={0.7}
            style={{
              backgroundColor: colors.surfacePrimary,
              borderWidth: 1,
              borderColor: colors.borderSubtle,
              borderRadius: radius.lg,
              width: 48,
              height: 56,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="add" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {error ? (
          <Text maxFontSizeMultiplier={1.2} style={{ color: colors.error, ...typography.caption, marginTop: spacing.xxs }}>
            {error}
          </Text>
        ) : null}
      </View>
    );
  }
);

NumericInput.displayName = 'NumericInput';
