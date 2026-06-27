import { useEffect, useState } from "react";
import { View, Text, ScrollView, RefreshControl, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../../components/ui/card";
import { useStore } from "../../store/useStore";
import { Ionicons } from "@expo/vector-icons";
import { OfflineBanner } from "../../components/offline-banner";
import { shareInvoicePDF } from "../../utils/pdfShare";
import { useRouter, Href } from "expo-router";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Skeleton } from "../../components/ui/skeleton";
import { LinearGradient } from "expo-linear-gradient";
import { Button } from "../../components/ui/button";
import { ScreenLayout } from "../../components/ui/ScreenLayout";
import { colors, radius, shadows, typography, spacing } from "../../constants";
import * as Haptics from "expo-haptics";

export default function DashboardScreen() {
  const summary = useStore((state) => state.summary);
  const fetchSummary = useStore((state) => state.fetchSummary);
  const user = useStore((state) => state.user);
  const isOffline = useStore((state) => state.isOffline);
  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sharingId, setSharingId] = useState<number | null>(null);

  const loadDashboardData = async () => {
    try {
      await fetchSummary();
    } catch (err) {
      console.error("Failed to load dashboard metrics:", err);
    }
  };

  const handleRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  useEffect(() => {
    setLoading(true);
    loadDashboardData().finally(() => setLoading(false));
  }, []);

  const handleShareDashboardInvoice = async (invoiceId: number, invoiceNo: string) => {
    if (isOffline) {
      Alert.alert(
        "Connection Offline",
        "PDF invoice generation requires an active network connection to fetch from the server. Please reconnect and try again.",
        [{ text: "OK" }]
      );
      return;
    }

    setSharingId(invoiceId);
    try {
      // Dashboards typically default to standard A4 layouts for share sheets
      await shareInvoicePDF({ invoiceId, invoiceNo, layout: "A4" });
    } catch (err: any) {
      Alert.alert(
        "Sharing Failed",
        err.message || "An error occurred while compiling and sharing the invoice.",
        [{ text: "OK" }]
      );
    } finally {
      setSharingId(null);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  if (loading && !summary) {
    return (
      <ScreenLayout hideOfflineBanner>
        <Skeleton height={100} className="mb-6" />
        <Skeleton height={140} className="mb-6" />
        <Skeleton height={200} className="mb-6" />
        <Skeleton height={200} className="mb-6" />
      </ScreenLayout>
    );
  }

  // Fallback default values
  const todaySales = summary?.todayStats?.sales || 0;
  const totalReceivables = summary?.monthlyStats?.outstanding || 0;
  const lowStockItems = summary?.lowStockItems || [];
  const recentActivities = summary?.recentActivities || [];

  return (
    <ScreenLayout
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />
      }
    >
      <View style={{ flex: 1 }}>


        {/* Welcome Greeting */}
        <Animated.View entering={FadeInUp.duration(400).delay(100)} className="mb-6 flex-row justify-between items-center" style={{ marginTop: -4 }}>
          <View className="flex-1 mr-4">
            <Text style={{ color: colors.textSecondary, ...typography.body }}>Welcome back,</Text>
            <Text style={{ color: colors.textPrimary, ...typography.title }} className="mt-1">
              {user?.name || "Wholesale Owner"}
            </Text>
            <Text style={{ color: colors.textSecondary, ...typography.caption }} className="mt-0.5">Groww You ERP - Live Insights</Text>
          </View>
          {__DEV__ && (
            <TouchableOpacity
              onPress={() => router.push("/ui-demo" as Href)}
              activeOpacity={0.7}
              className="bg-gray-800/40 border border-gray-800/80 p-2.5 rounded-xl"
              accessibilityRole="button"
              accessibilityLabel="View UI Component Gallery"
            >
              <Ionicons name="color-palette-outline" size={20} color="#F7941D" />
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View entering={FadeInUp.duration(400).delay(150)} className="flex-row gap-3 mb-6">
          <TouchableOpacity
            onPress={() => router.push('/(app)/billing' as Href)}
            activeOpacity={0.8}
            className="flex-1 bg-[#F7941D]/10 border border-[#F7941D]/20 rounded-2xl p-4 items-center min-h-[80px] justify-center"
          >
            <Ionicons name="cart-outline" size={24} color="#F7941D" />
            <Text className="text-white text-xs font-bold mt-1.5 font-inter">New Sale</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/(app)/scanner' as Href)}
            activeOpacity={0.8}
            className="flex-1 bg-[#1B3A5C]/30 border border-[#1B3A5C]/40 rounded-2xl p-4 items-center min-h-[80px] justify-center"
          >
            <Ionicons name="scan-outline" size={24} color="#60A5FA" />
            <Text className="text-white text-xs font-bold mt-1.5 font-inter">Scan</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/(app)/invoices' as Href)}
            activeOpacity={0.8}
            className="flex-1 bg-[#1B3A5C]/30 border border-[#1B3A5C]/40 rounded-2xl p-4 items-center min-h-[80px] justify-center"
          >
            <Ionicons name="receipt-outline" size={24} color="#60A5FA" />
            <Text className="text-white text-xs font-bold mt-1.5 font-inter">Invoices</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Primary KPI Metrics Row */}
        <Animated.View entering={FadeInUp.duration(400).delay(200)} className="flex-row gap-4 mb-6">
          
          {/* Today's Sales Card */}
          <View className="flex-1 overflow-hidden" style={{
            borderRadius: radius.card,
            borderWidth: 1,
            borderColor: colors.borderSubtle,
            ...shadows.cardElevated
          }}>
            <LinearGradient
              colors={['#132F2D', '#183B38', '#1E4440']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View className="p-5">
              <View className="p-2.5 bg-emerald-500/10 rounded-xl w-11 h-11 items-center justify-center mb-4">
                <Ionicons name="trending-up" size={20} color="#10B981" />
              </View>
              <Text className="text-gray-400 text-xs font-semibold uppercase tracking-wider font-lexend">Today's Sales</Text>
              <Text className="text-white text-2xl font-black mt-1 font-lexend">{formatCurrency(todaySales)}</Text>
              <View className="flex-row items-end gap-[3px] mt-3 h-6">
                {[0.4, 0.6, 0.45, 0.7, 0.55, 0.8, 0.65].map((h, i) => (
                  <View key={i} className="flex-1 rounded-t-sm bg-emerald-400/50" style={{ height: `${h * 100}%` }} />
                ))}
              </View>
              <Text className="text-emerald-400 text-[10px] font-semibold mt-1.5 font-inter">Live from register</Text>
            </View>
          </View>

          {/* Receivables Card */}
          <View className="flex-1 overflow-hidden" style={{
            borderRadius: radius.card,
            borderWidth: 1,
            borderColor: colors.borderSubtle,
            ...shadows.cardElevated
          }}>
            <LinearGradient
              colors={['#253652', '#2E4668', '#35517A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View className="p-5">
              <View className="p-2.5 bg-blue-400/10 rounded-xl w-11 h-11 items-center justify-center mb-4">
                <Ionicons name="wallet-outline" size={20} color="#60A5FA" />
              </View>
              <Text className="text-gray-400 text-xs font-semibold uppercase tracking-wider font-lexend">Receivables</Text>
              <Text className="text-white text-2xl font-black mt-1 font-lexend">{formatCurrency(totalReceivables)}</Text>
              <View className="flex-row items-end gap-[3px] mt-3 h-6">
                {[0.5, 0.55, 0.6, 0.5, 0.65, 0.6, 0.7].map((h, i) => (
                  <View key={i} className="flex-1 rounded-t-sm bg-blue-400/40" style={{ height: `${h * 100}%` }} />
                ))}
              </View>
              <Text className="text-blue-400 text-[10px] font-semibold mt-1.5 font-inter">Total outstanding credit</Text>
            </View>
          </View>

        </Animated.View>

        {/* Low Stock Alerts Section */}
        <Animated.View entering={FadeInUp.duration(400).delay(300)}>
          <Card className="mb-6">
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-row items-center gap-2">
              <Ionicons name="alert-circle-outline" size={20} color="#EF4444" />
              <Text className="text-white text-base font-bold font-lexend">Critical Low Stock Alerts</Text>
            </View>
            <View className="bg-red-500/10 px-2.5 py-0.5 rounded-full">
              <Text className="text-red-500 text-xs font-black">{lowStockItems.length}</Text>
            </View>
          </View>

          {lowStockItems.length === 0 ? (
            <Text className="text-gray-400 text-sm py-2 font-inter">All warehouse item stock balances are healthy!</Text>
          ) : (
            <View className="space-y-3">
              {lowStockItems.slice(0, 5).map((item: any, idx: number) => (
                <View key={idx} className="flex-row justify-between items-center py-2.5 border-b border-gray-800/40">
                  <Text className="text-gray-200 text-sm font-semibold flex-1 mr-4" numberOfLines={1}>{item.name}</Text>
                  <View className="bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-xl">
                    <Text className="text-red-500 text-xs font-bold">{item.stock} left</Text>
                  </View>
                </View>
              ))}
              {lowStockItems.length > 5 && (
                <Text className="text-gray-400 text-xs text-center mt-2 font-inter">
                  + {lowStockItems.length - 5} more item alerts. Scan code to audit.
                </Text>
              )}
            </View>
          )}
          </Card>
        </Animated.View>

        {/* Recent Activity Logs */}
        <Animated.View entering={FadeInUp.duration(400).delay(400)}>
          <Card className="mb-12">
          <View className="flex-row items-center gap-2 mb-4">
            <Ionicons name="receipt-outline" size={20} color="#F7941D" />
            <Text className="text-white text-base font-bold font-lexend">Recent Store Activity</Text>
          </View>

          {recentActivities.length === 0 ? (
            <View className="py-4 items-center">
              <Text className="text-gray-400 text-sm mb-4 font-inter text-center">No recent database operations logged.</Text>
              <Button label="Create a New Sale" onPress={() => router.push('/(app)/billing' as Href)} variant="primary" />
            </View>
          ) : (
            <View className="space-y-3">
              {recentActivities.map((act: any) => {
                const isSalesInvoice = act.action === "Sales Invoice" && String(act.id).startsWith("i_");
                const invoiceId = isSalesInvoice ? parseInt(String(act.id).replace("i_", "")) : null;

                return (
                  <View key={act.id} className="flex-row justify-between items-center border-b" style={{ minHeight: 64, borderColor: colors.borderSubtle, paddingVertical: spacing.md }}>
                    <View className="flex-1 mr-3">
                      <Text style={{ color: colors.textPrimary, ...typography.bodyStrong }}>{act.name}</Text>
                      <Text style={{ color: colors.textSecondary, ...typography.label, marginTop: 2 }}>{act.action}</Text>
                    </View>
                    
                    <View className="flex-row items-center gap-3">
                      {isSalesInvoice && invoiceId !== null ? (
                        <TouchableOpacity
                          onPress={() => handleShareDashboardInvoice(invoiceId, act.name)}
                          activeOpacity={0.7}
                          className="items-center justify-center rounded-xl"
                          style={{
                            minHeight: 48,
                            minWidth: 48,
                            backgroundColor: 'transparent',
                          }}
                          accessibilityRole="button"
                          accessibilityLabel="Share Invoice"
                        >
                          <View style={{ width: 32, height: 32, borderRadius: radius.md, backgroundColor: colors.accentSubtle, alignItems: 'center', justifyContent: 'center', borderColor: colors.borderFocus, borderWidth: 1 }}>
                            <Ionicons name="share-social-outline" size={16} color={colors.accent} />
                          </View>
                        </TouchableOpacity>
                      ) : null}
                      <View style={{ width: 60, alignItems: 'flex-end' }}>
                        <Text style={{ color: colors.textMuted, ...typography.captionStrong, fontVariant: ['tabular-nums'] }}>
                          {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
          </Card>
        </Animated.View>

      </View>

      {/* Full-screen Loading Overlay for generation/download */}
      {sharingId !== null && (
        <View className="absolute top-0 bottom-0 left-0 right-0 bg-[#0A0F1D]/85 justify-center items-center z-50">
          <View className="p-6 bg-[#1A1F2E] border border-gray-800 rounded-2xl items-center shadow-2xl max-w-[80%]">
            <ActivityIndicator size="large" color="#F7941D" />
            <Text className="text-white text-base font-bold mt-4 text-center">
              Generating PDF Receipt...
            </Text>
            <Text className="text-gray-400 text-xs mt-1 text-center">
              Compiling invoice layout and spawning sharing interface
            </Text>
          </View>
        </View>
      )}
    </ScreenLayout>
  );
}
