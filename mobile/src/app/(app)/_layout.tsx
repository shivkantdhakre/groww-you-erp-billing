import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../../store/useStore';

export default function TabLayout() {
  const offlineOutbox = useStore((state) => state.offlineOutbox);
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#F7941D', // Brand Orange Accent
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#1A1F2E',
          borderTopColor: '#1F2937',
          paddingBottom: Platform.OS === 'ios' ? insets.bottom || 24 : insets.bottom || 12,
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 64 + (insets.bottom || 24) : 58 + (insets.bottom || 12),
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
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="billing"
        options={{
          title: 'Sales Billing',
          tabBarLabel: 'Billing',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          title: 'Sales Invoices',
          tabBarLabel: 'Invoices',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="receipt-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Live Inventory',
          tabBarLabel: 'Inventory',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: 'Stock Scanner',
          tabBarLabel: 'Scanner',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="scan-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'My Profile',
          tabBarLabel: 'Profile',
          tabBarBadge: offlineOutbox.length > 0 ? offlineOutbox.length : undefined,
          tabBarBadgeStyle: { backgroundColor: '#F7941D' },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ui-demo"
        options={{
          title: 'UI Gallery',
          href: null, // Hides from tab bar
        }}
      />
    </Tabs>
  );
}
