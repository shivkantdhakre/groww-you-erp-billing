import React from 'react';
import { View, ScrollView, ScrollViewProps, ViewProps, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../../constants';
import { OfflineBanner } from '../offline-banner';

interface ScreenLayoutProps extends ViewProps {
  children: React.ReactNode;
  scrollable?: boolean;
  refreshControl?: React.ReactElement<any>;
  scrollViewProps?: ScrollViewProps;
  hideOfflineBanner?: boolean;
}

export function ScreenLayout({ 
  children, 
  scrollable = true, 
  refreshControl,
  scrollViewProps,
  hideOfflineBanner = false,
  style,
  ...props 
}: ScreenLayoutProps) {
  
  const content = scrollable ? (
    <ScrollView
      className="flex-1"
      contentContainerStyle={[{ paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl }, scrollViewProps?.contentContainerStyle]}
      refreshControl={refreshControl}
      showsVerticalScrollIndicator={false}
      {...scrollViewProps}
    >
      {!hideOfflineBanner && <OfflineBanner />}
      <View style={{ paddingTop: spacing.lg }}>
        {children}
      </View>
    </ScrollView>
  ) : (
    <View className="flex-1" style={[{ paddingHorizontal: spacing.xl }, style]} {...props}>
      {!hideOfflineBanner && <OfflineBanner />}
      <View style={{ paddingTop: spacing.lg, flex: 1 }}>
        {children}
      </View>
    </View>
  );

  return (
    <SafeAreaView 
      edges={["top", "bottom", "left", "right"]} 
      style={{ flex: 1, backgroundColor: colors.backgroundPrimary }}
    >
      {content}
    </SafeAreaView>
  );
}
