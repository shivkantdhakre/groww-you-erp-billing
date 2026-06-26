import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TextInput, TouchableOpacity, RefreshControl, ActivityIndicator, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../../components/ui/card";
import { useStore } from "../../store/useStore";
import { Ionicons } from "@expo/vector-icons";
import { OfflineBanner } from "../../components/offline-banner";
import { EmptyState } from "../../components/ui/empty-state";
import Animated, { FadeInUp, FadeOut, LinearTransition } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Skeleton } from "../../components/ui/skeleton";

export default function InventoryScreen() {
  const items = useStore((state) => state.items);
  const fetchItems = useStore((state) => state.fetchItems);
  const fetchMoreItems = useStore((state) => state.fetchMoreItems);
  const loadingMoreItems = useStore((state) => state.loadingMoreItems);
  const branches = useStore((state) => state.branches);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null);

  const categories = Array.from(new Set(items.map((i: any) => i.category).filter(Boolean))) as string[];

  const loadInventory = async () => {
    try {
      await fetchItems();
    } catch (err) {
      console.error("Failed to load inventory:", err);
    }
  };

  const handleRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
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
    if (q) {
      const match =
        item.name.toLowerCase().includes(q) ||
        (item.sku && item.sku.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q));
      if (!match) return false;
    }
    if (selectedCategory && item.category !== selectedCategory) return false;
    return true;
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
      <View className="flex-1 bg-[#0A0F1D] px-5 pt-4 mt-20">
        <Skeleton height={100} className="mb-3" />
        <Skeleton height={100} className="mb-3" />
        <Skeleton height={100} className="mb-3" />
        <Skeleton height={100} className="mb-3" />
        <Skeleton height={100} className="mb-3" />
      </View>
    );
  }

  const renderItem = ({ item }: { item: any }) => {
    return (
      <InventoryItem
        item={item}
        isExpanded={expandedItemId === item.id}
        toggleExpandItem={toggleExpandItem}
        branches={branches}
        formatCurrency={formatCurrency}
      />
    );
  };

  return (
    <SafeAreaView edges={["bottom", "left", "right"]} className="flex-1 bg-[#0A0F1D] px-5 pt-4">
      
      {/* Offline Status Warning Banner */}
      <OfflineBanner />
      
      {/* Search Header Container */}
      <View className="flex-row items-center bg-[#1A1F2E] border border-gray-800 rounded-xl px-4 py-1 mb-3">
        <Ionicons name="search" size={20} color="#6B7280" />
        <TextInput
          className="flex-1 ml-3 h-12 text-white font-medium"
          placeholder="Search by product name, SKU, or category..."
          placeholderTextColor="#6B7280"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          onSubmitEditing={() => {}}
          accessibilityLabel="Search inventory"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Chips */}
      {categories.length > 0 && (
        <View className="flex-row gap-2 mb-4">
          <TouchableOpacity
            onPress={() => setSelectedCategory(null)}
            activeOpacity={0.7}
            className={`px-4 py-2 rounded-xl border min-h-[36px] justify-center ${
              !selectedCategory
                ? 'bg-[#F7941D]/10 border-[#F7941D]/30'
                : 'bg-[#1A1F2E] border-gray-800'
            }`}
          >
            <Text className={`text-xs font-bold ${!selectedCategory ? 'text-[#F7941D]' : 'text-gray-400'}`}>
              All
            </Text>
          </TouchableOpacity>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => setSelectedCategory(cat)}
              activeOpacity={0.7}
              className={`px-4 py-2 rounded-xl border min-h-[36px] justify-center ${
                selectedCategory === cat
                  ? 'bg-[#F7941D]/10 border-[#F7941D]/30'
                  : 'bg-[#1A1F2E] border-gray-800'
              }`}
            >
              <Text className={`text-xs font-bold ${selectedCategory === cat ? 'text-[#F7941D]' : 'text-gray-400'}`}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Product List */}
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#F7941D" />
        }
        ListEmptyComponent={
          <EmptyState
            icon="cube-outline"
            title="No items found"
            description={searchQuery || selectedCategory ? "Try a different search or filter." : "Add products via the Groww You web dashboard to sync them here."}
          />
        }
        renderItem={renderItem}
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

const InventoryItem = React.memo(({ item, isExpanded, toggleExpandItem, branches, formatCurrency }: any) => {
  let currentStock = 0;
  if (item.branchStocks && item.branchStocks.length > 0) {
    currentStock = item.branchStocks.reduce((sum: number, bs: any) => sum + bs.stock, 0);
  } else {
    currentStock = item.openingStock || 0;
  }

  const isLowStock = currentStock < (item.minStockAlert ?? 10);

  return (
    <Animated.View 
      layout={LinearTransition.duration(200)} 
      className="bg-[#1A1F2E] border border-gray-800 rounded-2xl mb-3 overflow-hidden shadow-lg"
    >
      <TouchableOpacity
        onPress={() => toggleExpandItem(item.id)}
        activeOpacity={0.9}
        className="p-4 flex-row justify-between items-center"
      >
        <View className="flex-1 mr-4">
          <Text className="text-white text-base font-bold font-lexend" numberOfLines={1}>
            {item.name}
          </Text>
          <Text className="text-gray-400 text-xs mt-1 font-inter">
            SKU: {item.sku || "N/A"} | Cat: {item.category || "General"}
          </Text>
        </View>

        <View className="items-end gap-1.5">
          <View className={`px-3 py-1 rounded-xl border ${
            isLowStock
              ? "bg-red-500/10 border-red-500/20"
              : "bg-emerald-500/10 border-emerald-500/20"
          }`}>
            <Text className={`text-xs font-black ${isLowStock ? "text-red-500" : "text-emerald-500"}`}>
              {currentStock} {item.unit || "pcs"}
            </Text>
          </View>
          {/* Stock level bar */}
          <View className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <View
              className={`h-full rounded-full ${isLowStock ? "bg-red-500" : "bg-emerald-500"}`}
              style={{ width: `${Math.min((currentStock / Math.max(item.minStockAlert * 3, 100)) * 100, 100)}%` }}
            />
          </View>
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={14}
            color="#9CA3AF"
          />
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <Animated.View 
          entering={FadeInUp.duration(200)} 
          exiting={FadeOut.duration(150)}
          className="px-4 pb-4 pt-2 border-t border-gray-800/60 bg-[#141824] gap-3"
        >
          <View className="flex-row flex-wrap">
            <View className="w-1/2 mb-3">
              <Text className="text-gray-400 text-[10px] uppercase font-bold tracking-wider font-inter">Sale Price</Text>
              <Text className="text-white text-sm font-black mt-0.5 font-lexend">{formatCurrency(item.salePrice)}</Text>
            </View>
            <View className="w-1/2 mb-3">
              <Text className="text-gray-400 text-[10px] uppercase font-bold tracking-wider font-inter">Purchase Price</Text>
              <Text className="text-white text-sm font-black mt-0.5 font-lexend">{formatCurrency(item.purchasePrice)}</Text>
            </View>
            <View className="w-1/2">
              <Text className="text-gray-400 text-[10px] uppercase font-bold tracking-wider font-inter">GST Tax Rate</Text>
              <Text className="text-gray-300 text-xs font-semibold mt-0.5 font-inter">{item.gstPercentage || 0}%</Text>
            </View>
            <View className="w-1/2">
              <Text className="text-gray-400 text-[10px] uppercase font-bold tracking-wider font-inter">HSN Code</Text>
              <Text className="text-gray-300 text-xs font-semibold mt-0.5 font-inter">{item.hsnCode || "000000"}</Text>
            </View>
          </View>

          {item.branchStocks && item.branchStocks.length > 0 && (
            <View className="mt-2 pt-3 border-t border-gray-800/40">
              <Text className="text-gray-400 text-xs font-extrabold mb-1.5 font-lexend">Stock Allocation by Branch</Text>
              {item.branchStocks.map((bs: any) => {
                const bName = branches.find((b: any) => b.id === bs.branchId)?.name || `Branch ${bs.branchId}`;
                return (
                  <View key={bs.id} className="flex-row justify-between py-1">
                    <Text className="text-gray-400 text-xs font-medium font-inter">{bName}</Text>
                    <Text className="text-white text-xs font-bold font-inter">{bs.stock} {item.unit}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </Animated.View>
      )}
    </Animated.View>
  );
});
