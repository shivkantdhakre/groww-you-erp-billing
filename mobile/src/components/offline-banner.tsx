import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';

export function OfflineBanner() {
  const isOffline = useStore((state) => state.isOffline);
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

  if (!isOffline) return null;

  return (
    <View className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex-row items-center mb-5 gap-3">
      <Ionicons name="cloud-offline-outline" size={24} color="#F59E0B" />
      <View className="flex-1">
        <Text className="text-amber-500 font-bold text-sm">Offline Mode</Text>
        <Text className="text-amber-500/80 text-xs mt-0.5">
          Showing cached data (synced {relativeTime}).
        </Text>
      </View>
    </View>
  );
}
