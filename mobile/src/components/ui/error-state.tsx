import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './button';
import { colors, radius, typography, spacing } from '../../constants';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({ 
  title = 'Something went wrong', 
  description = 'An error occurred while loading this content. Please try again.', 
  onRetry 
}: ErrorStateProps) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl }}>
      <View style={{ 
        width: 64, 
        height: 64, 
        borderRadius: radius.full, 
        backgroundColor: colors.errorSubtle, 
        alignItems: 'center', 
        justifyContent: 'center', 
        marginBottom: spacing.lg 
      }}>
        <Ionicons name="alert-circle" size={32} color={colors.error} />
      </View>
      <Text style={{ color: colors.textPrimary, ...typography.title, textAlign: 'center', marginBottom: spacing.xs }}>
        {title}
      </Text>
      <Text style={{ color: colors.textSecondary, ...typography.body, textAlign: 'center', marginBottom: spacing.xl }}>
        {description}
      </Text>
      {onRetry && (
        <Button label="Try Again" onPress={onRetry} variant="outline" icon="refresh" />
      )}
    </View>
  );
}
