import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../../store/useStore';
import { colors, animations, typography, spacing, radius } from '../../constants';
import { useEffect, useRef } from 'react';

const TAB_ICONS: Record<string, { focused: any; default: any }> = {
  index: { focused: 'stats-chart', default: 'stats-chart-outline' },
  billing: { focused: 'cart', default: 'cart-outline' },
  invoices: { focused: 'receipt', default: 'receipt-outline' },
  inventory: { focused: 'cube', default: 'cube-outline' },
  scanner: { focused: 'scan', default: 'scan-outline' },
  profile: { focused: 'person', default: 'person-outline' },
};

function TabIcon({ routeName, color, size, focused }: { routeName: string; color: any; size: number; focused: boolean }) {
  const icons = TAB_ICONS[routeName] || { focused: 'ellipse', default: 'ellipse-outline' };
  
  return (
    <View style={{
      width: 48,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 16,
      backgroundColor: focused ? colors.accentSubtle : 'transparent',
    }}>
      <Ionicons name={focused ? icons.focused : icons.default} size={22} color={color} />
    </View>
  );
}

export default function TabLayout() {
  const offlineOutbox = useStore((state) => state.offlineOutbox);
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarItemStyle: { padding: 0 },
        tabBarStyle: {
          backgroundColor: colors.surfacePrimary,
          borderTopColor: colors.borderSubtle,
          paddingBottom: Platform.OS === 'ios' ? insets.bottom || 24 : insets.bottom || 12,
          paddingTop: spacing.xs,
          height: Platform.OS === 'ios' ? 64 + (insets.bottom || 24) : 60 + (insets.bottom || 12),
        },
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 8,
          fontWeight: '700',
          fontFamily: typography.captionStrong.fontFamily,
          marginTop: 2,
        },
        headerStyle: {
          backgroundColor: colors.surfacePrimary,
          borderBottomWidth: 1,
          borderBottomColor: colors.borderSubtle,
        },
        headerTitleStyle: {
          color: colors.textPrimary,
          fontWeight: 'bold',
          fontFamily: typography.title.fontFamily,
          fontSize: 18,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Executive Dashboard',
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size, focused }) => <TabIcon routeName="index" color={color} size={size} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="billing"
        options={{
          title: 'Sales Billing',
          tabBarLabel: 'Billing',
          tabBarIcon: ({ color, size, focused }) => <TabIcon routeName="billing" color={color} size={size} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          title: 'Sales Invoices',
          tabBarLabel: 'Invoices',
          tabBarIcon: ({ color, size, focused }) => <TabIcon routeName="invoices" color={color} size={size} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Live Inventory',
          tabBarLabel: 'Inventory',
          tabBarIcon: ({ color, size, focused }) => <TabIcon routeName="inventory" color={color} size={size} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: 'Stock Scanner',
          tabBarLabel: 'Scanner',
          tabBarIcon: ({ color, size, focused }) => <TabIcon routeName="scanner" color={color} size={size} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'My Profile',
          tabBarLabel: 'Profile',
          tabBarBadge: offlineOutbox.length > 0 ? offlineOutbox.length : undefined,
          tabBarBadgeStyle: { backgroundColor: '#F7941D', fontSize: 10, fontWeight: '700' },
          tabBarIcon: ({ color, size, focused }) => <TabIcon routeName="profile" color={color} size={size} focused={focused} />,
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
