import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../../store/useStore';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useEffect } from 'react';

const TAB_ICONS: Record<string, { focused: any; default: any }> = {
  index: { focused: 'stats-chart', default: 'stats-chart-outline' },
  billing: { focused: 'cart', default: 'cart-outline' },
  invoices: { focused: 'receipt', default: 'receipt-outline' },
  inventory: { focused: 'cube', default: 'cube-outline' },
  scanner: { focused: 'scan', default: 'scan-outline' },
  profile: { focused: 'person', default: 'person-outline' },
};

function TabIcon({ routeName, color, size }: { routeName: string; color: any; size: number }) {
  const icons = TAB_ICONS[routeName] || { focused: 'ellipse', default: 'ellipse-outline' };
  const isActive = String(color) === '#F7941D';
  return <Ionicons name={isActive ? icons.focused : icons.default} size={size} color={color} />;
}

export default function TabLayout() {
  const offlineOutbox = useStore((state) => state.offlineOutbox);
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#F7941D',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#1A1F2E',
          borderTopColor: '#1F2937',
          paddingBottom: Platform.OS === 'ios' ? insets.bottom || 24 : insets.bottom || 12,
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 64 + (insets.bottom || 24) : 58 + (insets.bottom || 12),
        },
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          fontFamily: 'Inter_600SemiBold',
          marginTop: 2,
        },
        headerStyle: {
          backgroundColor: '#1A1F2E',
          borderBottomWidth: 1,
          borderBottomColor: '#1F2937',
        },
        headerTitleStyle: {
          color: '#FFFFFF',
          fontWeight: 'bold',
          fontFamily: 'Lexend_700Bold',
          fontSize: 18,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Executive Dashboard',
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size }) => <TabIcon routeName="index" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="billing"
        options={{
          title: 'Sales Billing',
          tabBarLabel: 'Billing',
          tabBarIcon: ({ color, size }) => <TabIcon routeName="billing" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          title: 'Sales Invoices',
          tabBarLabel: 'Invoices',
          tabBarIcon: ({ color, size }) => <TabIcon routeName="invoices" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Live Inventory',
          tabBarLabel: 'Inventory',
          tabBarIcon: ({ color, size }) => <TabIcon routeName="inventory" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: 'Stock Scanner',
          tabBarLabel: 'Scanner',
          tabBarIcon: ({ color, size }) => <TabIcon routeName="scanner" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'My Profile',
          tabBarLabel: 'Profile',
          tabBarBadge: offlineOutbox.length > 0 ? offlineOutbox.length : undefined,
          tabBarBadgeStyle: { backgroundColor: '#F7941D', fontSize: 10, fontWeight: '700' },
          tabBarIcon: ({ color, size }) => <TabIcon routeName="profile" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="ui-demo"
        options={{
          title: 'UI Gallery',
          href: null,
        }}
      />
    </Tabs>
  );
}
