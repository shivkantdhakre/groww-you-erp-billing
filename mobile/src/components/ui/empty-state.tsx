import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './button';
import { colors, radius, typography, spacing } from '../../constants';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon = 'cube-outline',
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing.massive, paddingHorizontal: spacing.xxl }}>
      <View style={{ width: 80, height: 80, borderRadius: radius.full, backgroundColor: colors.surfacePrimary, borderWidth: 1, borderColor: colors.borderSubtle, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl }}>
        <Ionicons name={icon} size={36} color={colors.textSecondary} />
      </View>
      <Text style={{ color: colors.textSecondary, ...typography.title, textAlign: 'center' }}>
        {title}
      </Text>
      {description && (
        <Text style={{ color: colors.textMuted, ...typography.body, textAlign: 'center', marginTop: spacing.xs }}>
          {description}
        </Text>
      )}
      {actionLabel && onAction && (
        <View style={{ marginTop: spacing.xxl }}>
          <Button label={actionLabel} onPress={onAction} variant="primary" />
        </View>
      )}
    </View>
  );
}
