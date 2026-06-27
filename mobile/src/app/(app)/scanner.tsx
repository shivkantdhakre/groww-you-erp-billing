import { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Vibration, Alert, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { useStore } from '../../store/useStore';
import { Ionicons } from '@expo/vector-icons';
import { ScanTargetOverlay } from '../../components/scan-target-overlay';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../utils/api';
import { router, Href } from "expo-router";

const { width } = Dimensions.get('window');

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const items = useStore((state) => state.items);
  
  const [scanned, setScanned] = useState(false);
  const [scannedItem, setScannedItem] = useState<any | null>(null);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);

  if (!permission) {
    return (
      <View className="flex-1 bg-[#0A0F1D] justify-center items-center">
        <ActivityIndicator size="large" color="#F7941D" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-[#0A0F1D]">
        {/* Subtle scanner background */}
        <View className="absolute inset-0 opacity-[0.03]">
          <View className="flex-1 flex-row flex-wrap" style={{ gap: 0 }}>
            {Array.from({ length: 20 }).map((_, i) => (
              <View key={i} style={{ width: width / 10, height: width / 10 }} className="border-[0.5px] border-white" />
            ))}
          </View>
        </View>
        <View className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full bg-[#F7941D] opacity-[0.03]" />

        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Scanner illustration */}
          <View className="items-center mb-10">
            <View className="w-32 h-32 rounded-[28px] bg-[#1A1F2E] border border-gray-800 items-center justify-center"
              style={{
                shadowColor: '#F7941D',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.15,
                shadowRadius: 24,
                elevation: 8,
              }}
            >
              <LinearGradient
                colors={['rgba(247, 148, 29, 0.2)', 'rgba(247, 148, 29, 0.05)']}
                className="absolute inset-0 rounded-[28px]"
              />
              <Ionicons name="scan-outline" size={48} color="#F7941D" />
            </View>
          </View>

          {/* Title */}
          <Text className="text-white text-[32px] font-extrabold text-center mb-3 leading-tight">
            Scan & Add{'\n'}Products Instantly
          </Text>

          {/* Description */}
          <Text className="text-gray-400 text-base text-center mb-10 leading-relaxed">
            Scan inventory items instantly using your device camera.
          </Text>

          {/* Permission card */}
          <View className="bg-[#1A1F2E] border border-gray-800 rounded-[24px] p-6 mb-8"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 16,
              elevation: 4,
            }}
          >
            <View className="flex-row items-start gap-3 mb-4">
              <View className="w-6 h-6 rounded-full bg-emerald-500/20 items-center justify-center mt-0.5">
                <Ionicons name="checkmark" size={14} color="#10B981" />
              </View>
              <Text className="text-gray-300 text-sm flex-1 leading-relaxed">
                Camera permission is required to scan product barcodes securely.
              </Text>
            </View>
            <View className="flex-row items-start gap-3 mb-4">
              <View className="w-6 h-6 rounded-full bg-emerald-500/20 items-center justify-center mt-0.5">
                <Ionicons name="checkmark" size={14} color="#10B981" />
              </View>
              <Text className="text-gray-300 text-sm flex-1 leading-relaxed">
                Scan item barcodes to instantly add them to your billing cart.
              </Text>
            </View>
            <View className="flex-row items-start gap-3">
              <View className="w-6 h-6 rounded-full bg-emerald-500/20 items-center justify-center mt-0.5">
                <Ionicons name="checkmark" size={14} color="#10B981" />
              </View>
              <Text className="text-gray-300 text-sm flex-1 leading-relaxed">
                No photos or videos are stored or uploaded.
              </Text>
            </View>
          </View>

          {/* Primary button */}
          <TouchableOpacity
            onPress={requestPermission}
            className="w-full h-14 rounded-xl items-center justify-center bg-[#F59E0B] mb-4"
            activeOpacity={0.85}
            style={{
              shadowColor: '#F59E0B',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
              elevation: 6,
            }}
          >
            <Text className="text-white font-extrabold text-base tracking-wide">Grant Camera Access</Text>
          </TouchableOpacity>

          {/* Secondary link */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="items-center py-2 mb-6"
          >
            <Text className="text-gray-500 text-sm font-medium">Not now</Text>
          </TouchableOpacity>

          {/* Privacy note */}
          <Text className="text-gray-600 text-xs text-center leading-relaxed">
            Your privacy matters. Camera access is used solely for barcode scanning.
          </Text>
        </ScrollView>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ data }: BarcodeScanningResult) => {
    // 1. Sanitize the barcode data immediately to strip off carriage returns, newlines, or whitespace
    const sanitizedCode = data.trim();

    // 2. Immediately engage the scanner lock to prevent duplicate scanning callbacks
    setScanned(true);
    setScannedCode(sanitizedCode);
    Vibration.vibrate(100); // 100ms vibration feedback

    setSearching(true);
    
    // Look up in the local Zustand cache first
    let foundItem = items.find((i: any) => i.sku === sanitizedCode);
    
    // Check connection status dynamically
    const isOffline = useStore.getState().isOffline;
    if (!isOffline) {
      try {
        // Query the live backend for fresh stock allocations
        const res = await api.get(`/masters/items?search=${encodeURIComponent(sanitizedCode)}`);
        const fetchedData = res.data.data || res.data;
        if (Array.isArray(fetchedData)) {
          const remoteItem = fetchedData.find((i: any) => i.sku === sanitizedCode);
          if (remoteItem) {
            foundItem = remoteItem;
            // 3. Opportunistic Cache Warming: Sync this fresh profile with local Zustand cache
            useStore.getState().upsertCachedItem(remoteItem);
          }
        }
      } catch (err) {
        console.warn("Failed to fetch fresh barcode item, falling back to cache:", err);
      }
    }

    setScannedItem(foundItem || null);
    setSearching(false);
  };

  const handleReset = () => {
    setScanned(false);
    setScannedItem(null);
    setScannedCode(null);
  };

  const handleAddToBilling = () => {
    if (scannedItem) {
      // Check branch stock first
      const selectedBranchId = useStore.getState().selectedBranchId;
      const getBranchStock = (item: any) => {
        if (!item.branchStocks || item.branchStocks.length === 0) {
          return item.openingStock || 0;
        }
        const bs = item.branchStocks.find((s: any) => s.branchId === selectedBranchId);
        return bs ? bs.stock : 0;
      };
      const stock = getBranchStock(scannedItem);
      
      if (stock <= 0) {
        Alert.alert("Out of Stock", `"${scannedItem.name}" has no stock available in this branch.`);
        return;
      }

      // Add to store cart
      useStore.getState().addToCart(scannedItem);
      Alert.alert("Added to Cart", `"${scannedItem.name}" has been added to your billing cart.`, [
        {
          text: "Go to Billing",
          onPress: () => {
            handleReset();
            router.push('/(app)/billing' as Href);
          }
        },
        {
          text: "Scan More",
          onPress: handleReset
        }
      ]);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR"
    }).format(val || 0);
  };

  return (
    <SafeAreaView edges={["bottom", "left", "right"]} style={styles.container} className="bg-[#0A0F1D]">
      
      {/* Viewfinder Camera Feed */}
      <CameraView
        style={StyleSheet.absoluteFill}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        enableTorch={torchEnabled}
        barcodeScannerSettings={{
          barcodeTypes: ['qr', 'ean13', 'code128', 'code39'],
        }}
      />

      {/* Torch Toggle Button */}
      {!scanned && (
        <TouchableOpacity
          onPress={() => setTorchEnabled(!torchEnabled)}
          className="absolute top-12 right-6 bg-[#0A0F1D]/80 p-3 rounded-full border border-gray-800 z-10"
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Toggle Flashlight"
        >
          <Ionicons name={torchEnabled ? "flash" : "flash-off"} size={24} color={torchEnabled ? "#F7941D" : "#FFF"} />
        </TouchableOpacity>
      )}

      {!scanned && <ScanTargetOverlay />}

      {/* Scanned Result Glassmorphic Sheet Overlay */}
      {scanned && (
        <View style={styles.sheetContainer} className="bg-[#0A0F1D]/95 border-t border-gray-800 px-6 py-8 shadow-2xl">
          
          {searching ? (
            <View className="items-center py-12">
              <ActivityIndicator size="large" color="#F7941D" />
              <Text className="text-gray-400 text-sm mt-4">Querying database for SKU "{scannedCode}"...</Text>
            </View>
          ) : scannedItem ? (
            // Success State: Product Found
            <View>
              <View className="flex-row items-center gap-2 mb-4">
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                <Text className="text-white text-xl font-extrabold flex-1" numberOfLines={1}>
                  {scannedItem.name}
                </Text>
              </View>

              <Text className="text-gray-400 text-xs mb-5">
                SKU: {scannedItem.sku} | HSN: {scannedItem.hsnCode || "000000"}
              </Text>

              {/* Data Table */}
              <View className="bg-[#1A1F2E]/40 border border-gray-800 rounded-xl p-4 mb-6">
                <View className="flex-row justify-between py-2 border-b border-gray-800/40">
                  <Text className="text-gray-400 text-xs font-semibold">Sale Rate (INR)</Text>
                  <Text className="text-white text-sm font-black">{formatCurrency(scannedItem.salePrice)}</Text>
                </View>
                <View className="flex-row justify-between py-2 border-b border-gray-800/40">
                  <Text className="text-gray-400 text-xs font-semibold">Purchase Rate (INR)</Text>
                  <Text className="text-white text-sm font-black">{formatCurrency(scannedItem.purchasePrice)}</Text>
                </View>
                <View className="flex-row justify-between py-2">
                  <Text className="text-gray-400 text-xs font-semibold">Available Stock Balance</Text>
                  <Text className={`text-sm font-black ${
                    (scannedItem.branchStocks?.reduce((sum: number, b: any) => sum + b.stock, 0) || scannedItem.openingStock) < (scannedItem.minStockAlert ?? 10)
                      ? "text-red-500"
                      : "text-emerald-500"
                  }`}>
                    {scannedItem.branchStocks?.reduce((sum: number, b: any) => sum + b.stock, 0) || scannedItem.openingStock || 0} {scannedItem.unit || "pcs"}
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            // Error State: Product Not Found
            <View className="items-center py-6">
              <Ionicons name="warning-outline" size={48} color="#EF4444" style={{ marginBottom: 12 }} />
              <Text className="text-white text-lg font-bold text-center">Catalog SKU Not Recognized</Text>
              <Text className="text-gray-400 text-sm text-center mt-2 mb-6">
                Barcode value <Text className="font-mono text-white">"{scannedCode}"</Text> does not exist in your active inventory catalog.
              </Text>
            </View>
          )}

          {/* Dismiss & Add to Cart Actions */}
          <View className="gap-3">
            {scannedItem && (
              <TouchableOpacity
                onPress={handleAddToBilling}
                className="w-full bg-[#F7941D] py-4 rounded-xl items-center shadow-lg shadow-[#F7941D]/10"
              >
                <Text className="text-white font-extrabold text-sm uppercase tracking-wider">Add to Billing Cart</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              onPress={handleReset}
              className="w-full bg-action-orange py-4 rounded-xl items-center shadow-lg shadow-action-orange/10"
            >
              <Text className="text-white font-extrabold text-sm uppercase tracking-wider">Scan Next Item</Text>
            </TouchableOpacity>
          </View>

        </View>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
});
