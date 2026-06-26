import { useEffect, useState } from "react";
import { View, Text, FlatList, TextInput, TouchableOpacity, RefreshControl, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "../../store/useStore";
import { Ionicons } from "@expo/vector-icons";
import { OfflineBanner } from "../../components/offline-banner";

export default function InventoryScreen() {
  const items = useStore((state) => state.items);
  const fetchItems = useStore((state) => state.fetchItems);
  const fetchMoreItems = useStore((state) => state.fetchMoreItems);
  const loadingMoreItems = useStore((state) => state.loadingMoreItems);

  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null);

  const loadInventory = async () => {
    try {
      await fetchItems();
    } catch (err) {
      console.error("Failed to load inventory:", err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadInventory();
    setRefreshing(false);
  };

  useEffect(() => {
    setLoading(true);
    loadInventory().finally(() => setLoading(false));
  }, []);

  const filteredItems = items.filter((item: any) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      (item.sku && item.sku.toLowerCase().includes(q)) ||
      (item.category && item.category.toLowerCase().includes(q))
    );
  });

  const toggleExpandItem = (id: number) => {
    setExpandedItemId(expandedItemId === id ? null : id);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR"
    }).format(val || 0);
  };

  if (loading && items.length === 0) {
    return (
      <View className="flex-1 bg-[#0A0F1D] justify-center items-center">
        <ActivityIndicator size="large" color="#F7941D" />
        <Text className="text-gray-400 text-sm mt-4">Loading stock files...</Text>
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
          placeholder="Search by product name, SKU, or category..."
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

      {/* Product List */}
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#F7941D" />
        }
        ListEmptyComponent={
          <View className="items-center py-20">
            <Ionicons name="cube-outline" size={48} color="#4B5563" />
            <Text className="text-gray-500 text-sm font-semibold mt-4">No matching inventory items found.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isExpanded = expandedItemId === item.id;
          
          // Calculate branch stock or opening stock
          let currentStock = 0;
          if (item.branchStocks && item.branchStocks.length > 0) {
            currentStock = item.branchStocks.reduce((sum: number, bs: any) => sum + bs.stock, 0);
          } else {
            currentStock = item.openingStock || 0;
          }

          const isLowStock = currentStock < (item.minStockAlert ?? 10);

          return (
            <View className="bg-[#1A1F2E] border border-gray-800 rounded-2xl mb-3 overflow-hidden shadow-md">
              
              {/* Header Tab Trigger */}
              <TouchableOpacity
                onPress={() => toggleExpandItem(item.id)}
                activeOpacity={0.9}
                className="p-4 flex-row justify-between items-center"
              >
                <View className="flex-1 mr-4">
                  <Text className="text-white text-base font-bold" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text className="text-gray-500 text-xs mt-1">
                    SKU: {item.sku || "N/A"} | Cat: {item.category || "General"}
                  </Text>
                </View>

                {/* Stock Status Badge */}
                <View className="flex-row items-center gap-3">
                  <View className={`px-3 py-1 rounded-xl border ${
                    isLowStock
                      ? "bg-red-500/10 border-red-500/20"
                      : "bg-emerald-500/10 border-emerald-500/20"
                  }`}>
                    <Text className={`text-xs font-black ${isLowStock ? "text-red-500" : "text-emerald-500"}`}>
                      {currentStock} {item.unit || "pcs"}
                    </Text>
                  </View>
                  <Ionicons
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={16}
                    color="#9CA3AF"
                  />
                </View>
              </TouchableOpacity>

              {/* Expandable Details Container */}
              {isExpanded && (
                <View className="px-4 pb-4 pt-2 border-t border-gray-800/60 bg-[#141824] space-y-3">
                  <View className="grid grid-cols-2 flex-row flex-wrap">
                    
                    {/* Rate Information */}
                    <View className="w-1/2 mb-3">
                      <Text className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Sale Price</Text>
                      <Text className="text-white text-sm font-black mt-0.5">{formatCurrency(item.salePrice)}</Text>
                    </View>
                    <View className="w-1/2 mb-3">
                      <Text className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Purchase Price</Text>
                      <Text className="text-white text-sm font-black mt-0.5">{formatCurrency(item.purchasePrice)}</Text>
                    </View>
                    
                    {/* Tax & Category */}
                    <View className="w-1/2">
                      <Text className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">GST Tax Rate</Text>
                      <Text className="text-gray-300 text-xs font-semibold mt-0.5">{item.gstPercentage || 0}%</Text>
                    </View>
                    <View className="w-1/2">
                      <Text className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">HSN Code</Text>
                      <Text className="text-gray-300 text-xs font-semibold mt-0.5">{item.hsnCode || "000000"}</Text>
                    </View>

                  </View>

                  {/* Branch Isolation Breakdown */}
                  {item.branchStocks && item.branchStocks.length > 0 && (
                    <View className="mt-2 pt-3 border-t border-gray-800/40">
                      <Text className="text-gray-400 text-xs font-extrabold mb-1.5">Stock Allocation by Branch</Text>
                      {item.branchStocks.map((bs: any) => (
                        <View key={bs.id} className="flex-row justify-between py-1">
                          <Text className="text-gray-500 text-xs font-medium">Branch ID: {bs.branchId}</Text>
                          <Text className="text-white text-xs font-bold">{bs.stock} {item.unit}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                </View>
              )}

            </View>
          );
        }}
        onEndReached={fetchMoreItems}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loadingMoreItems ? (
            <View className="py-4 justify-center items-center">
              <ActivityIndicator size="small" color="#F7941D" />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
