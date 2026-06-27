import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TextInput, TouchableOpacity, RefreshControl, ActivityIndicator, Modal, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../../components/ui/card";
import { useStore } from "../../store/useStore";
import { Ionicons } from "@expo/vector-icons";
import { OfflineBanner } from "../../components/offline-banner";
import { EmptyState } from "../../components/ui/empty-state";
import Animated, { FadeInUp, FadeOut, LinearTransition } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Skeleton } from "../../components/ui/skeleton";
import { ScreenLayout } from "../../components/ui/ScreenLayout";
import { colors, radius, shadows, typography, spacing } from "../../constants";

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
      <ScreenLayout hideOfflineBanner>
        <Skeleton height={100} className="mb-3" />
        <Skeleton height={100} className="mb-3" />
        <Skeleton height={100} className="mb-3" />
        <Skeleton height={100} className="mb-3" />
        <Skeleton height={100} className="mb-3" />
      </ScreenLayout>
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
    <ScreenLayout scrollable={false}>
      
      {/* Search Header Container */}
      <View style={{ backgroundColor: colors.surfaceElevated, borderColor: colors.borderSubtle, borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.xxs, marginBottom: spacing.md }} className="flex-row items-center">
        <Ionicons name="search" size={20} color="#6B7280" />
        <TextInput
          className="flex-1 ml-3 h-12 text-white font-medium"
          placeholder="Search inventory..."
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
        <View style={{ marginBottom: spacing.md, marginHorizontal: -spacing.xl }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.xl, gap: spacing.sm }}>
            <TouchableOpacity
              onPress={() => setSelectedCategory(null)}
              activeOpacity={0.7}
              style={{
                height: 40,
                minWidth: 80,
                borderRadius: radius.chip,
                borderWidth: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: spacing.lg,
                backgroundColor: !selectedCategory ? colors.backgroundSelected : colors.surfacePrimary,
                borderColor: !selectedCategory ? colors.borderFocus : colors.borderSubtle
              }}
            >
              <Text style={{ color: !selectedCategory ? colors.accent : colors.textSecondary, ...typography.captionStrong }}>
                All
              </Text>
            </TouchableOpacity>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.7}
                style={{
                  height: 40,
                  minWidth: 80,
                  borderRadius: radius.chip,
                  borderWidth: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: spacing.lg,
                  backgroundColor: selectedCategory === cat ? colors.backgroundSelected : colors.surfacePrimary,
                  borderColor: selectedCategory === cat ? colors.borderFocus : colors.borderSubtle
                }}
              >
                <Text style={{ color: selectedCategory === cat ? colors.accent : colors.textSecondary, ...typography.captionStrong }}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
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
      </ScreenLayout>
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
      style={{
        backgroundColor: colors.surfacePrimary,
        borderColor: colors.borderSubtle,
        borderWidth: 1,
        borderRadius: radius.card,
        marginBottom: spacing.md,
        overflow: 'hidden',
        ...shadows.card
      }}
    >
      <TouchableOpacity
        onPress={() => toggleExpandItem(item.id)}
        activeOpacity={0.9}
        style={{ padding: spacing.xl }}
      >
        <View style={{ marginBottom: spacing.sm }}>
          <Text style={{ color: colors.textPrimary, ...typography.subheading }} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={{ color: colors.textMuted, ...typography.caption, marginTop: spacing.xxs }}>
            SKU: {item.sku || "N/A"} | Cat: {item.category || "General"}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xs,
            borderRadius: radius.badge,
            borderWidth: 1,
            backgroundColor: isLowStock ? colors.errorSubtle : colors.successSubtle,
            borderColor: isLowStock ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
          }}>
            <Text style={{ color: isLowStock ? colors.error : colors.success, ...typography.captionStrong, fontVariant: ['tabular-nums'] }}>
              {currentStock} {item.unit || "pcs"}
            </Text>
          </View>
          
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <View style={{ width: 64, height: 6, backgroundColor: colors.backgroundSecondary, borderRadius: radius.full, overflow: 'hidden' }}>
              <View
                style={{
                  height: '100%',
                  borderRadius: radius.full,
                  backgroundColor: isLowStock ? colors.error : colors.success,
                  width: `${Math.min((currentStock / Math.max(item.minStockAlert * 3, 100)) * 100, 100)}%`
                }}
              />
            </View>
            <Ionicons
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={16}
              color={colors.textSecondary}
            />
          </View>
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
