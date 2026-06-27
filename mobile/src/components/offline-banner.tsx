import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { Skeleton } from './ui/skeleton';
import { colors, radius, typography, spacing } from '../constants';

export function OfflineBanner() {
  const isOffline = useStore((state) => state.isOffline);
  const hasHydrated = useStore((state) => state.hasHydrated);
  const lastSyncedAt = useStore((state) => state.lastSyncedAt);
  const [relativeTime, setRelativeTime] = useState('');

  const calculateRelativeTime = (isoString: string | null) => {
    if (!isoString) return 'never';
    const now = new Date();
    const synced = new Date(isoString);
    const diffMs = now.getTime() - synced.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMins / 60);

    if (diffMins < 1) {
      return 'just now';
    } else if (diffMins === 1) {
      return '1 minute ago';
    } else if (diffMins < 60) {
      return `${diffMins} minutes ago`;
    } else if (diffHrs === 1) {
      return '1 hour ago';
    } else {
      return `${diffHrs} hours ago`;
    }
  };

  useEffect(() => {
    if (!isOffline) return;

    // Set initial value
    setRelativeTime(calculateRelativeTime(lastSyncedAt));

    // Update relative time description every 30 seconds
    const interval = setInterval(() => {
      setRelativeTime(calculateRelativeTime(lastSyncedAt));
    }, 30000);

    return () => clearInterval(interval);
  }, [isOffline, lastSyncedAt]);

  if (!hasHydrated) {
    return <Skeleton height={70} className="mb-5 rounded-2xl" />;
  }

  if (!isOffline) return null;

  return (
    <View style={{
      backgroundColor: colors.warningSubtle,
      borderColor: 'rgba(245, 158, 11, 0.2)',
      borderWidth: 1,
      padding: spacing.lg,
      borderRadius: radius.lg,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.xl,
      gap: spacing.md
    }}>
      <Ionicons name="cloud-offline-outline" size={24} color={colors.warning} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.warning, ...typography.bodyStrong }}>Offline Mode</Text>
        <Text style={{ color: colors.warning, opacity: 0.8, ...typography.caption, marginTop: spacing.xxs }}>
          Showing cached data (synced {relativeTime}).
        </Text>
      </View>
    </View>
  );
}
