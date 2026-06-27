import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { colors, spacing, typography } from '../../constants';

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl }}>
      <ActivityIndicator size="large" color={colors.accent} />
      {message && (
        <Text style={{ color: colors.textSecondary, ...typography.body, marginTop: spacing.lg }}>
          {message}
        </Text>
      )}
    </View>
  );
}
