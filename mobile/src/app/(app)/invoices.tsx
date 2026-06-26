import { useEffect, useState } from "react";
import { View, Text, FlatList, TextInput, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "../../store/useStore";
import { Ionicons } from "@expo/vector-icons";
import { OfflineBanner } from "../../components/offline-banner";
import { shareInvoicePDF } from "../../utils/pdfShare";

export default function InvoicesScreen() {
  const invoices = useStore((state) => state.invoices);
  const fetchInvoices = useStore((state) => state.fetchInvoices);
  const fetchMoreInvoices = useStore((state) => state.fetchMoreInvoices);
  const loadingMoreInvoices = useStore((state) => state.loadingMoreInvoices);
  const isOffline = useStore((state) => state.isOffline);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLayout, setSelectedLayout] = useState<"A4" | "Thermal">("A4");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sharingId, setSharingId] = useState<number | null>(null);

  const loadInvoices = async () => {
    try {
      await fetchInvoices();
    } catch (err) {
      console.error("Failed to load invoices:", err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadInvoices();
    setRefreshing(false);
  };

  useEffect(() => {
    setLoading(true);
    loadInvoices().finally(() => setLoading(false));
  }, []);

  const handleShare = async (invoiceId: number, invoiceNo: string) => {
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
      await shareInvoicePDF({ invoiceId, invoiceNo, layout: selectedLayout });
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

  const filteredInvoices = invoices.filter((inv: any) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const invNo = inv.invoiceNo?.toLowerCase() || "";
    const custName = inv.customer?.name?.toLowerCase() || "";
    return invNo.includes(q) || custName.includes(q);
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2
    }).format(val || 0);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  if (loading && invoices.length === 0) {
    return (
      <View className="flex-1 bg-[#0A0F1D] justify-center items-center">
        <ActivityIndicator size="large" color="#F7941D" />
        <Text className="text-gray-400 text-sm mt-4">Loading invoice journal...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView edges={["bottom", "left", "right"]} className="flex-1 bg-[#0A0F1D] px-5 pt-4">
      {/* Offline Status Warning Banner */}
      <OfflineBanner />

      {/* Search Header Container */}
      <View className="flex-row items-center bg-[#1A1F2E] border border-gray-800 rounded-xl px-4 py-1 mb-4">
        <Ionicons name="search" size={20} color="#6B7280" />
        <TextInput
          className="flex-1 ml-3 h-12 text-white font-medium focus:outline-none"
          placeholder="Search by Invoice No or Customer name..."
          placeholderTextColor="#6B7280"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Layout Selection Control */}
      <View className="flex-row bg-[#1A1F2E] border border-gray-800 rounded-xl p-1 mb-4">
        <TouchableOpacity
          onPress={() => setSelectedLayout("A4")}
          activeOpacity={0.8}
          className={`flex-1 py-2.5 rounded-lg items-center justify-center ${
            selectedLayout === "A4" ? "bg-[#F7941D]" : ""
          }`}
        >
          <Text
            className={`text-sm font-black ${
              selectedLayout === "A4" ? "text-[#0A0F1D]" : "text-gray-400"
            }`}
          >
            A4 Standard Invoice
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setSelectedLayout("Thermal")}
          activeOpacity={0.8}
          className={`flex-1 py-2.5 rounded-lg items-center justify-center ${
            selectedLayout === "Thermal" ? "bg-[#F7941D]" : ""
          }`}
        >
          <Text
            className={`text-sm font-black ${
              selectedLayout === "Thermal" ? "text-[#0A0F1D]" : "text-gray-400"
            }`}
          >
            80mm Thermal Receipt
          </Text>
        </TouchableOpacity>
      </View>

      {/* Invoices List */}
      <FlatList
        data={filteredInvoices}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#F7941D" />
        }
        onEndReached={() => {
          fetchMoreInvoices();
        }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loadingMoreInvoices ? (
            <View className="py-4 justify-center items-center">
              <ActivityIndicator size="small" color="#F7941D" />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View className="items-center py-20">
            <Ionicons name="receipt-outline" size={48} color="#4B5563" />
            <Text className="text-gray-500 text-sm font-semibold mt-4">
              No matching sales invoices found.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View className="bg-[#1A1F2E] border border-gray-800 rounded-2xl p-4 mb-3 flex-row justify-between items-center shadow-md">
            <View className="flex-1 mr-4">
              <View className="flex-row items-center gap-2">
                <Text className="text-white text-base font-bold">
                  {item.invoiceNo}
                </Text>
                {item.pdfUrl && (
                  <View className="bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <Text className="text-emerald-500 text-[9px] font-bold">Cached A4</Text>
                  </View>
                )}
              </View>
              <Text className="text-gray-400 text-xs mt-1" numberOfLines={1}>
                {item.customer?.name || "Retail Customer"}
              </Text>
              <Text className="text-gray-500 text-[10px] mt-0.5">
                Issued: {formatDate(item.invoiceDate)}
              </Text>
            </View>

            <View className="flex-row items-center gap-4">
              <Text className="text-white text-base font-black">
                {formatCurrency(item.grandTotal)}
              </Text>
              
              <TouchableOpacity
                onPress={() => handleShare(item.id, item.invoiceNo)}
                activeOpacity={0.7}
                className="bg-[#F7941D]/10 border border-[#F7941D]/20 p-2.5 rounded-xl"
              >
                <Ionicons name="share-social-outline" size={20} color="#F7941D" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

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
    </SafeAreaView>
  );
}
