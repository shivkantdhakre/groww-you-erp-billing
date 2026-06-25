import { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Vibration } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { useStore } from '../../store/useStore';
import { Ionicons } from '@expo/vector-icons';
import api from '../../utils/api';

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const items = useStore((state) => state.items);
  
  const [scanned, setScanned] = useState(false);
  const [scannedItem, setScannedItem] = useState<any | null>(null);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  if (!permission) {
    return (
      <View className="flex-1 bg-[#0A0F1D] justify-center items-center">
        <ActivityIndicator size="large" color="#F7941D" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-[#0A0F1D] justify-center items-center px-6">
        <View className="bg-[#1A1F2E] border border-gray-800 rounded-2xl p-6 items-center shadow-xl max-w-sm">
          <Ionicons name="camera-outline" size={48} color="#9CA3AF" style={{ marginBottom: 16 }} />
          <Text className="text-white text-lg font-bold text-center mb-2">Camera Access Required</Text>
          <Text className="text-gray-400 text-sm text-center mb-6">
            We need camera access to scan item barcodes on the warehouse floor.
          </Text>
          <TouchableOpacity
            onPress={requestPermission}
            className="w-full bg-primary py-3.5 rounded-xl items-center"
          >
            <Text className="text-white font-bold text-sm">Grant Permission</Text>
          </TouchableOpacity>
        </View>
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
        const res = await api.get(`/masters/items?search=${sanitizedCode}`);
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
        barcodeScannerSettings={{
          barcodeTypes: ['qr', 'ean13', 'code128', 'code39'],
        }}
      />

      {/* Target scanning outline overlay */}
      {!scanned && (
        <View style={styles.overlayContainer}>
          <View style={styles.scanTargetBox}>
            {/* Corners detailing target scanner boundary */}
            <View className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-secondary" />
            <View className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-secondary" />
            <View className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-secondary" />
            <View className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-secondary" />
          </View>
          <Text className="text-white font-bold text-sm text-center mt-6 bg-[#0A0F1D]/80 px-4 py-2 rounded-full overflow-hidden border border-gray-800">
            Align item barcode inside the target box
          </Text>
        </View>
      )}

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

          {/* Dismiss Action Button */}
          <TouchableOpacity
            onPress={handleReset}
            className="w-full bg-secondary py-4 rounded-xl items-center shadow-lg shadow-secondary/10"
          >
            <Text className="text-white font-extrabold text-sm uppercase tracking-wider">Scan Next Item</Text>
          </TouchableOpacity>

        </View>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  scanTargetBox: {
    width: 250,
    height: 250,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'transparent',
    position: 'relative',
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
