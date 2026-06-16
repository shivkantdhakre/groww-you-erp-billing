import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface PageHeaderProps {
  title: string;
  subtext?: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  showBack?: boolean;
}

export function PageHeader({ title, subtext, onBack, rightAction, showBack }: PageHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Determine whether to display the back arrow
  const canGoBack = showBack !== undefined ? showBack : router.canGoBack();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    }
  };

  return (
    <View
      style={{ paddingTop: Math.max(insets.top, 16) }}
      className="bg-[#1A1F2E] border-b border-gray-800 px-5 pb-4 shadow-md"
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1 mr-4">
          {canGoBack ? (
            <TouchableOpacity
              onPress={handleBack}
              activeOpacity={0.7}
              className="mr-3.5 p-1 bg-gray-800/30 rounded-xl border border-gray-800/50"
              accessibilityRole="button"
              accessibilityLabel="Go Back"
            >
              <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          ) : null}

          <View className="flex-1">
            <Text className="text-white font-lexend font-black text-lg tracking-wide" numberOfLines={1}>
              {title}
            </Text>
            {subtext ? (
              <Text className="text-gray-400 font-inter text-xs mt-0.5" numberOfLines={1}>
                {subtext}
              </Text>
            ) : null}
          </View>
        </View>

        {rightAction ? <View>{rightAction}</View> : null}
      </View>
    </View>
  );
}
