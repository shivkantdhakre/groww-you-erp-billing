import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './button';

interface EmptyStateProps {
  icon?: any;
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
    <View className="items-center py-16 px-8">
      <View className="w-20 h-20 rounded-full bg-[#1A1F2E] border border-gray-800 items-center justify-center mb-5">
        <Ionicons name={icon} size={36} color="#4B5563" />
      </View>
      <Text className="text-gray-400 text-base font-bold text-center font-lexend">
        {title}
      </Text>
      {description && (
        <Text className="text-gray-500 text-sm text-center mt-2 font-inter leading-relaxed">
          {description}
        </Text>
      )}
      {actionLabel && onAction && (
        <View className="mt-6">
          <Button label={actionLabel} onPress={onAction} variant="primary" />
        </View>
      )}
    </View>
  );
}
