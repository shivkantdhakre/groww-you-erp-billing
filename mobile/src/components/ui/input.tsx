import React, { useState } from 'react';
import { View, Text, TextInput, TextInputProps, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: any; // Ionicons name or custom icon node
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
      <View className={`mb-4 ${className}`}>
        {label ? (
          <Text className="text-gray-400 font-lexend font-semibold text-xs mb-1.5 uppercase tracking-wider">
            {label}
          </Text>
        ) : null}

        <View
          className={`flex-row items-center bg-[#1A1F2E] border rounded-2xl px-4 h-12.5 ${
            error
              ? 'border-red-500'
              : isFocused
              ? 'border-secondary' // brand orange
              : 'border-gray-800'
          }`}
        >
          {icon ? (
            <Ionicons
              name={icon}
              size={20}
              color={error ? '#EF4444' : isFocused ? '#F7941D' : '#6B7280'}
              style={{ marginRight: 10 }}
            />
          ) : null}

          <TextInput
            ref={ref}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholderTextColor="#6B7280"
            className="flex-1 text-white font-inter text-sm h-full"
            accessibilityLabel={label}
            {...props}
          />

          {trailingIcon ? <View className="ml-2">{trailingIcon}</View> : null}
        </View>

        {error ? (
          <Text className="text-red-500 font-inter text-xs mt-1">
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
      <View className={`mb-4 ${className}`}>
        {label ? (
          <Text className="text-gray-400 font-lexend font-semibold text-xs mb-1.5 uppercase tracking-wider">
            {label}
          </Text>
        ) : null}

        <View className="flex-row items-center gap-2">
          {/* Minus Button */}
          <TouchableOpacity
            onPress={decrement}
            activeOpacity={0.7}
            className="bg-[#1A1F2E] border border-gray-800 rounded-2xl w-12 h-12.5 items-center justify-center"
          >
            <Ionicons name="remove" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Core Input Wrapper */}
          <View
            className={`flex-row items-center flex-1 bg-[#1A1F2E] border rounded-2xl px-4 h-12.5 ${
              error
                ? 'border-red-500'
                : isFocused
                ? 'border-secondary'
                : 'border-gray-800'
            }`}
          >
            <TextInput
              ref={ref}
              value={value}
              onChangeText={onChangeText}
              onFocus={handleFocus}
              onBlur={handleBlur}
              keyboardType="decimal-pad"
              placeholderTextColor="#6B7280"
              className="flex-1 text-white font-inter text-center font-bold text-base h-full"
              accessibilityLabel={label}
              {...props}
            />
          </View>

          {/* Plus Button */}
          <TouchableOpacity
            onPress={increment}
            activeOpacity={0.7}
            className="bg-[#1A1F2E] border border-gray-800 rounded-2xl w-12 h-12.5 items-center justify-center"
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {error ? (
          <Text className="text-red-500 font-inter text-xs mt-1">
            {error}
          </Text>
        ) : null}
      </View>
    );
  }
);

NumericInput.displayName = 'NumericInput';
