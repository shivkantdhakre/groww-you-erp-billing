import { useEffect, useState } from "react";
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Alert } from "react-native";
import { useStore } from "../../store/useStore";
import { Ionicons } from "@expo/vector-icons";
import { OfflineBanner } from "../../components/offline-banner";
import { shareInvoicePDF } from "../../utils/pdfShare";
import { useRouter } from "expo-router";

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
      <View className="flex-1 bg-[#0A0F1D] justify-center items-center">
        <ActivityIndicator size="large" color="#F7941D" />
        <Text className="text-gray-400 text-sm mt-4">Loading dashboard statistics...</Text>
      </View>
    );
  }

  // Fallback default values
  const todaySales = summary?.todayStats?.sales || 0;
  const totalReceivables = summary?.monthlyStats?.outstanding || 0;
  const lowStockItems = summary?.lowStockItems || [];
  const recentActivities = summary?.recentActivities || [];

  return (
    <View className="flex-1 bg-[#0A0F1D]">
      <ScrollView
        className="flex-1 px-5 pt-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#F7941D" />
        }
      >
        {/* Offline Status Warning Banner */}
        <OfflineBanner />

        {/* Welcome Greeting */}
        <View className="mb-6 flex-row justify-between items-center">
          <View className="flex-1 mr-4">
            <Text className="text-gray-400 text-sm">Welcome back,</Text>
            <Text className="text-white text-2xl font-black mt-1">
              {user?.name || "Wholesale Owner"}
            </Text>
            <Text className="text-gray-500 text-xs mt-0.5">Groww You ERP - Live Insights</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/ui-demo")}
            activeOpacity={0.7}
            className="bg-gray-800/40 border border-gray-800/80 p-2.5 rounded-xl"
            accessibilityRole="button"
            accessibilityLabel="View UI Component Gallery"
          >
            <Ionicons name="color-palette-outline" size={20} color="#F7941D" />
          </TouchableOpacity>
        </View>

        {/* Primary KPI Metrics Row */}
        <View className="flex-row gap-4 mb-6">
          
          {/* Today's Sales Card */}
          <View className="flex-1 bg-[#1A1F2E] border border-gray-800 rounded-2xl p-4 shadow-xl">
            <View className="p-2 bg-emerald-500/10 rounded-xl w-10 h-10 items-center justify-center mb-3">
              <Ionicons name="trending-up" size={20} color="#10B981" />
            </View>
            <Text className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Today's Sales</Text>
            <Text className="text-white text-xl font-black mt-1.5">{formatCurrency(todaySales)}</Text>
            <Text className="text-emerald-500 text-[10px] font-semibold mt-1">Live from register</Text>
          </View>

          {/* Total Receivables Card */}
          <View className="flex-1 bg-[#1A1F2E] border border-gray-800 rounded-2xl p-4 shadow-xl">
            <View className="p-2 bg-primary/20 rounded-xl w-10 h-10 items-center justify-center mb-3">
              <Ionicons name="wallet-outline" size={20} color="#60A5FA" />
            </View>
            <Text className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Receivables</Text>
            <Text className="text-white text-xl font-black mt-1.5">{formatCurrency(totalReceivables)}</Text>
            <Text className="text-gray-500 text-[10px] mt-1">Total outstanding credit</Text>
          </View>

        </View>

        {/* Low Stock Alerts Section */}
        <View className="bg-[#1A1F2E] border border-gray-800 rounded-2xl p-5 mb-6 shadow-xl">
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-row items-center gap-2">
              <Ionicons name="alert-circle-outline" size={20} color="#EF4444" />
              <Text className="text-white text-base font-bold">Critical Low Stock Alerts</Text>
            </View>
            <View className="bg-red-500/10 px-2.5 py-0.5 rounded-full">
              <Text className="text-red-500 text-xs font-black">{lowStockItems.length}</Text>
            </View>
          </View>

          {lowStockItems.length === 0 ? (
            <Text className="text-gray-500 text-sm py-2">All warehouse item stock balances are healthy!</Text>
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
                <Text className="text-gray-500 text-xs text-center mt-2">
                  + {lowStockItems.length - 5} more item alerts. Scan code to audit.
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Recent Activity Logs */}
        <View className="bg-[#1A1F2E] border border-gray-800 rounded-2xl p-5 mb-12 shadow-xl">
          <View className="flex-row items-center gap-2 mb-4">
            <Ionicons name="receipt-outline" size={20} color="#F7941D" />
            <Text className="text-white text-base font-bold">Recent Store Activity</Text>
          </View>

          {recentActivities.length === 0 ? (
            <Text className="text-gray-500 text-sm py-2">No recent database operations logged.</Text>
          ) : (
            <View className="space-y-3">
              {recentActivities.map((act: any) => {
                const isSalesInvoice = act.action === "Sales Invoice" && act.id.startsWith("i_");
                const invoiceId = isSalesInvoice ? parseInt(act.id.replace("i_", "")) : null;

                return (
                  <View key={act.id} className="flex-row justify-between items-center py-3 border-b border-gray-800/40">
                    <View className="flex-1 mr-3">
                      <Text className="text-gray-200 text-sm font-bold">{act.name}</Text>
                      <Text className="text-gray-500 text-[10px] mt-0.5">{act.action}</Text>
                    </View>
                    
                    <View className="flex-row items-center gap-3">
                      {isSalesInvoice && invoiceId !== null && (
                        <TouchableOpacity
                          onPress={() => handleShareDashboardInvoice(invoiceId, act.name)}
                          activeOpacity={0.7}
                          className="bg-[#F7941D]/10 border border-[#F7941D]/20 p-2 rounded-lg"
                        >
                          <Ionicons name="share-social-outline" size={14} color="#F7941D" />
                        </TouchableOpacity>
                      )}
                      <Text className="text-gray-500 text-xs font-medium">
                        {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

      </ScrollView>

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
    </View>
  );
}
