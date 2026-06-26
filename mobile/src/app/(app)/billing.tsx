import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  Alert,
  StyleSheet
} from "react-native";
import BottomSheet, { BottomSheetBackdrop, BottomSheetTextInput, BottomSheetFlatList } from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { useStore } from "../../store/useStore";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions, BarcodeScanningResult } from "expo-camera";
import { OfflineBanner } from "../../components/offline-banner";
import api from "../../utils/api";

interface CartItem {
  item: any;
  qty: number;
}

export default function BillingScreen() {
  const items = useStore((state) => state.items);
  const customers = useStore((state) => state.customers);
  const selectedBranchId = useStore((state) => state.selectedBranchId);
  const isOffline = useStore((state) => state.isOffline);
  const user = useStore((state) => state.user);
  
  const fetchItems = useStore((state) => state.fetchItems);
  const fetchCustomers = useStore((state) => state.fetchCustomers);
  const queueOfflineInvoice = useStore((state) => state.queueOfflineInvoice);
  const fetchInvoices = useStore((state) => state.fetchInvoices);
  const fetchSummary = useStore((state) => state.fetchSummary);

  // Read cart and actions from Zustand store
  const cart = useStore((state) => state.cart);
  const addToCart = useStore((state) => state.addToCart);
  const removeFromCart = useStore((state) => state.removeFromCart);
  const updateCartQty = useStore((state) => state.updateCartQty);
  const clearCart = useStore((state) => state.clearCart);

  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [paymentMode, setPaymentMode] = useState<"CASH" | "BANK" | "UPI">("CASH");
  const [submitting, setSubmitting] = useState(false);

  const customerSheetRef = useRef<BottomSheet>(null);
  const itemSheetRef = useRef<BottomSheet>(null);
  const [scannerVisible, setScannerVisible] = useState(false);

  // Search queries
  const [customerSearch, setCustomerSearch] = useState("");
  const [itemSearch, setItemSearch] = useState("");

  // Camera permissions
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    // Initial fetch of master logs
    if (items.length === 0) fetchItems().catch(console.error);
    if (customers.length === 0) fetchCustomers().catch(console.error);
  }, []);

  // Helper: Get item stock for selected branch
  const getBranchStock = (item: any) => {
    if (!item.branchStocks || item.branchStocks.length === 0) {
      return item.openingStock || 0;
    }
    const bs = item.branchStocks.find((s: any) => s.branchId === selectedBranchId);
    return bs ? bs.stock : 0;
  };

  const handleAddProduct = (product: any) => {
    const stock = getBranchStock(product);
    if (stock <= 0) {
      Alert.alert("Out of Stock", `"${product.name}" has no stock available in this branch.`);
      return;
    }

    const existingItem = cart.find((c) => c.item.id === product.id);
    if (existingItem) {
      const currentQty = existingItem.qty;
      if (currentQty + 1 > stock) {
        Alert.alert("Stock Limit Reached", `Only ${stock} units are available for "${product.name}".`);
        return;
      }
      updateCartQty(product.id, currentQty + 1);
    } else {
      addToCart(product);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Alert.alert("Success", `Added ${product.name} to cart.`);
    itemSheetRef.current?.close();
  };

  const handleUpdateQty = (productId: number, change: number) => {
    const cartItem = cart.find((c) => c.item.id === productId);
    if (!cartItem) return;

    const stock = getBranchStock(cartItem.item);
    const newQty = cartItem.qty + change;

    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    if (newQty > stock) {
      Alert.alert("Stock Limit Reached", `Only ${stock} units are available for "${cartItem.item.name}".`);
      return;
    }

    updateCartQty(productId, newQty);
  };

  const handleRemoveProduct = (productId: number) => {
    removeFromCart(productId);
  };

  // Barcode Scanning
  const handleScanBarcode = async () => {
    if (!permission) {
      const status = await requestPermission();
      if (!status.granted) {
        Alert.alert("Permission Required", "Camera access is needed to scan barcodes.");
        return;
      }
    } else if (!permission.granted) {
      const status = await requestPermission();
      if (!status.granted) {
        Alert.alert("Permission Required", "Camera access is needed to scan barcodes.");
        return;
      }
    }
    setScannerVisible(true);
  };

  const handleBarcodeScanned = ({ data }: BarcodeScanningResult) => {
    const code = data.trim();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setScannerVisible(false);

    const product = items.find((i: any) => i.sku === code);
    if (!product) {
      Alert.alert("SKU Not Found", `Product with barcode "${code}" was not found in the catalog.`);
      return;
    }

    handleAddProduct(product);
  };

  // Cart calculations
  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + item.item.salePrice * item.qty, 0);
  };

  const calculateGST = () => {
    return cart.reduce((sum, item) => {
      const sub = item.item.salePrice * item.qty;
      const gst = (sub * (item.item.gstPercentage || 0)) / 100;
      return sum + gst;
    }, 0);
  };

  const calculateGrandTotal = () => {
    return calculateSubtotal() + calculateGST();
  };

  // Submit invoice
  const handleSubmit = async () => {
    if (!selectedCustomer) {
      Alert.alert("Validation Error", "Please select a customer first.");
      return;
    }
    if (cart.length === 0) {
      Alert.alert("Validation Error", "Please add at least one product to the cart.");
      return;
    }

    Alert.alert(
      "Confirm Submission",
      "Are you sure you want to submit this invoice?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Submit Invoice",
          style: "default",
          onPress: async () => {
            const payload = {
              customerId: selectedCustomer.id,
              items: cart.map((c) => ({
                itemId: c.item.id,
                qty: c.qty
              })),
              invoiceDate: new Date().toISOString()
            };

            if (isOffline) {
              // Offline transaction
              queueOfflineInvoice(payload);
              Alert.alert(
                "Offline Saved",
                "Invoice saved offline and queued in the outbox. Inventory stocks have been adjusted optimistically.",
                [
                  {
                    text: "OK",
                    onPress: () => {
                      clearCart();
                      setSelectedCustomer(null);
                    }
                  }
                ]
              );
              return;
            }

            // Online submission
            setSubmitting(true);
            try {
              await api.post("/transactions/sales-invoices", payload);
              Alert.alert("Success", "Sales invoice created successfully.", [
                {
                  text: "OK",
                  onPress: () => {
                    clearCart();
                    setSelectedCustomer(null);
                    fetchInvoices().catch(console.error);
                    fetchSummary().catch(console.error);
                  }
                }
              ]);
            } catch (err: any) {
              console.error(err);
              Alert.alert(
                "Submission Failed",
                err.response?.data?.error || err.message || "Failed to create sales invoice."
              );
            } finally {
              setSubmitting(false);
            }
          }
        }
      ]
    );
  };

  // Filtered registers
  const filteredCustomers = customers.filter((c) => {
    const q = customerSearch.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.mobile.includes(q);
  });

  const filteredItems = items.filter((i) => {
    const q = itemSearch.toLowerCase();
    return i.name.toLowerCase().includes(q) || (i.sku && i.sku.toLowerCase().includes(q));
  });

  return (
    <SafeAreaView edges={["bottom", "left", "right"]} className="flex-1 bg-[#0A0F1D]">
      <OfflineBanner />

      <FlatList
        data={cart}
        keyExtractor={(item) => item.item.id.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 260 }}
        ListHeaderComponent={
          <>
            {/* Customer Section */}
            <Card className="mb-4">
              <Text className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2 font-lexend">Customer</Text>
              {selectedCustomer ? (
                <View className="flex-row items-center justify-between bg-[#0A0F1D]/50 border border-gray-900 rounded-2xl p-4">
                  <View className="flex-1 pr-2">
                    <Text className="text-white text-base font-bold font-lexend">{selectedCustomer.name}</Text>
                    <Text className="text-gray-400 text-xs mt-1 font-inter">Mob: {selectedCustomer.mobile}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedCustomer(null)} className="min-h-[44px] min-w-[44px] justify-center items-center">
                    <Ionicons name="close-circle" size={24} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ) : (
                <Button label="Select Customer Profile" variant="outline" onPress={() => customerSheetRef.current?.expand()} />
              )}
            </Card>

            {/* Toolbar Section */}
            <View className="flex-row gap-3 mb-4">
              <Button
                label="Add Item"
                icon="add-circle-outline"
                onPress={() => itemSheetRef.current?.expand()}
                variant="navy"
                className="flex-1"
              />
              <Button
                label="Scan"
                icon="barcode-outline"
                onPress={handleScanBarcode}
                variant="navy"
                className="flex-1"
              />
            </View>

            <Text className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3 font-lexend ml-1">Cart Items</Text>
          </>
        }
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center py-10 bg-[#1A1F2E] border border-gray-800 rounded-2xl">
            <Ionicons name="cart-outline" size={36} color="#4B5563" />
            <Text className="text-gray-400 text-xs font-semibold mt-2 font-inter">Billing cart is empty.</Text>
          </View>
        }
        renderItem={({ item: cartItem, index }) => {
          const isFirst = index === 0;
          const isLast = index === cart.length - 1;
          return (
            <CartItemRow 
              cartItem={cartItem} 
              isFirst={isFirst}
              isLast={isLast}
              handleUpdateQty={handleUpdateQty} 
              handleRemoveProduct={handleRemoveProduct} 
            />
          );
        }}
      />

      {/* Sticky Bottom Footer (Absolute Positioned) */}
      <View className="absolute bottom-0 left-0 right-0 bg-[#1A1F2E] p-5 border-t border-gray-800 rounded-t-3xl shadow-2xl">
        <View className="flex-row gap-2 bg-[#0A0F1D]/50 p-1.5 rounded-2xl border border-gray-900 mb-4">
          {(["CASH", "BANK", "UPI"] as const).map((mode) => {
            const active = paymentMode === mode;
            return (
              <TouchableOpacity
                key={mode}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setPaymentMode(mode)}
                className={`flex-1 py-2 rounded-xl justify-center items-center ${
                  active ? "bg-[#F7941D]" : ""
                }`}
              >
                <Text className={`text-[10px] font-bold font-inter ${active ? "text-white" : "text-gray-400"}`}>
                  {mode}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View className="flex-row justify-between items-center mb-4">
          <View>
            <Text className="text-gray-400 text-[10px] font-inter">Items: {cart.length}</Text>
            <Text className="text-gray-400 text-[10px] font-inter">Tax: ₹{calculateGST().toFixed(2)}</Text>
          </View>
          <View className="items-end">
            <Text className="text-gray-400 text-[10px] uppercase font-bold tracking-wider font-lexend">Grand Total</Text>
            <Text className="text-[#F7941D] text-lg font-black font-lexend">₹{calculateGrandTotal().toFixed(2)}</Text>
          </View>
        </View>

        <Button
          label="Submit Invoice"
          onPress={handleSubmit}
          loading={submitting}
          disabled={cart.length === 0 || !selectedCustomer || (isOffline && !user)}
          variant="primary"
          className="w-full"
        />
      </View>



      {/* Customer Picker Bottom Sheet */}
      <BottomSheet
        ref={customerSheetRef}
        index={-1}
        snapPoints={['75%']}
        enablePanDownToClose
        backdropComponent={(props) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.6} />}
        backgroundStyle={{ backgroundColor: '#1A1F2E' }}
        handleIndicatorStyle={{ backgroundColor: '#4B5563', width: 40 }}
      >
        <View className="flex-1 p-6 pt-2">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-white text-lg font-bold">Select Customer</Text>
            <TouchableOpacity onPress={() => customerSheetRef.current?.close()}>
              <Ionicons name="close" size={24} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Customer Search Bar */}
          <View className="flex-row items-center bg-[#0A0F1D] border border-gray-800 rounded-xl px-3 py-1 mb-4">
            <Ionicons name="search" size={16} color="#6B7280" />
            <BottomSheetTextInput
              className="flex-1 ml-2 h-10 text-white text-xs font-medium"
              placeholder="Search by customer name or phone..."
              placeholderTextColor="#6B7280"
              value={customerSearch}
              onChangeText={setCustomerSearch}
              returnKeyType="search"
              accessibilityLabel="Search customers"
            />
          </View>

          <BottomSheetFlatList
            data={filteredCustomers}
            keyExtractor={(item) => item.id.toString()}
            ListEmptyComponent={
              <Text className="text-gray-400 text-center py-4">No customers found.</Text>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => {
                  setSelectedCustomer(item);
                  customerSheetRef.current?.close();
                  setCustomerSearch("");
                }}
                className="bg-[#0A0F1D] border border-gray-800 p-4 rounded-xl mb-2 flex-row justify-between items-center"
              >
                <View>
                  <Text className="text-white font-bold text-sm font-inter">{item.name}</Text>
                  <Text className="text-gray-400 text-xs mt-1 font-inter">Mob: {item.mobile}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#F7941D" />
              </TouchableOpacity>
            )}
          />
        </View>
      </BottomSheet>

      {/* Item Picker Bottom Sheet */}
      <BottomSheet
        ref={itemSheetRef}
        index={-1}
        snapPoints={['75%']}
        enablePanDownToClose
        backdropComponent={(props) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.6} />}
        backgroundStyle={{ backgroundColor: '#1A1F2E' }}
        handleIndicatorStyle={{ backgroundColor: '#4B5563', width: 40 }}
      >
        <View className="flex-1 p-6 pt-2">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-white text-lg font-bold">Add Product Item</Text>
            <TouchableOpacity onPress={() => itemSheetRef.current?.close()}>
              <Ionicons name="close" size={24} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Item Search Bar */}
          <View className="flex-row items-center bg-[#0A0F1D] border border-gray-800 rounded-xl px-3 py-1 mb-4">
            <Ionicons name="search" size={16} color="#6B7280" />
            <BottomSheetTextInput
              className="flex-1 ml-2 h-10 text-white text-xs font-medium"
              placeholder="Search by product name or SKU..."
              placeholderTextColor="#6B7280"
              value={itemSearch}
              onChangeText={setItemSearch}
              returnKeyType="search"
              accessibilityLabel="Search products"
            />
          </View>

          <BottomSheetFlatList
            data={filteredItems}
            keyExtractor={(item) => item.id.toString()}
            ListEmptyComponent={
              <Text className="text-gray-400 text-center py-4">No products found.</Text>
            }
            renderItem={({ item }) => {
              const stock = getBranchStock(item);
              const isOutOfStock = stock <= 0;
              return (
                <TouchableOpacity
                  disabled={isOutOfStock}
                  onPress={() => {
                    handleAddProduct(item);
                    setItemSearch("");
                  }}
                  className={`bg-[#0A0F1D] border border-gray-800 p-4 rounded-xl mb-2 flex-row justify-between items-center ${
                    isOutOfStock ? "opacity-40" : ""
                  }`}
                >
                  <View className="flex-1 pr-2">
                    <Text className="text-white font-bold text-sm font-inter" numberOfLines={1}>{item.name}</Text>
                    <Text className="text-gray-400 text-[10px] mt-1 font-inter">
                      SKU: {item.sku || "N/A"} | Price: ₹{item.salePrice} | Tax: {item.gstPercentage}%
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className={`text-xs font-bold ${isOutOfStock ? "text-red-500" : "text-emerald-500"}`}>
                      {isOutOfStock ? "Out of Stock" : `${stock} ${item.unit || "pcs"}`}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </BottomSheet>

      {/* Barcode Scanner Modal */}
      <Modal
        visible={scannerVisible}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setScannerVisible(false)}
      >
        <View className="flex-1 bg-[#0A0F1D] justify-center">
          <CameraView
            style={StyleSheet.absoluteFill}
            onBarcodeScanned={handleBarcodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ["qr", "ean13", "code128", "code39"],
            }}
          />
          <View style={styles.overlayContainer}>
            <View style={styles.scanTargetBox}>
              <View className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-action-orange" />
              <View className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-action-orange" />
              <View className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-action-orange" />
              <View className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-action-orange" />
            </View>
            <Text className="text-white font-bold text-sm text-center mt-6 bg-[#0A0F1D]/80 px-4 py-2 rounded-full overflow-hidden border border-gray-800">
              Align item barcode inside target box
            </Text>
            <TouchableOpacity
              onPress={() => setScannerVisible(false)}
              className="mt-8 bg-red-600 px-6 py-3.5 rounded-2xl flex-row items-center"
            >
              <Ionicons name="close-circle" size={18} color="#FFF" />
              <Text className="text-white font-bold text-sm ml-2">Cancel Scanning</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  scanTargetBox: {
    width: 260,
    height: 260,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "transparent",
    position: "relative",
  },
});

const CartItemRow = React.memo(({ cartItem, isFirst, isLast, handleUpdateQty, handleRemoveProduct }: any) => {
  const subtotal = cartItem.item.salePrice * cartItem.qty;
  const gst = (subtotal * (cartItem.item.gstPercentage || 0)) / 100;

  return (
    <View 
      className={`bg-[#1A1F2E] flex-row justify-between items-center py-4 px-4 border-gray-800 
      ${isFirst ? 'rounded-t-2xl' : ''} 
      ${isLast ? 'rounded-b-2xl' : 'border-b'}`}
    >
      <View className="flex-1 pr-3">
        <Text className="text-white text-sm font-bold font-lexend" numberOfLines={1}>
          {cartItem.item.name}
        </Text>
        <Text className="text-gray-400 text-[10px] mt-0.5 font-inter">
          Rate: ₹{cartItem.item.salePrice} | GST: {cartItem.item.gstPercentage}% (₹{gst.toFixed(1)})
        </Text>
      </View>

      <View className="flex-row items-center gap-2">
        <TouchableOpacity
          onPress={() => handleUpdateQty(cartItem.item.id, -1)}
          className="min-h-[44px] min-w-[44px] rounded-full bg-[#0A0F1D] border border-gray-800 justify-center items-center"
        >
          <Ionicons name="remove" size={16} color="#FFF" />
        </TouchableOpacity>
        
        <Text className="text-white font-bold text-sm w-6 text-center font-inter">{cartItem.qty}</Text>

        <TouchableOpacity
          onPress={() => handleUpdateQty(cartItem.item.id, 1)}
          className="min-h-[44px] min-w-[44px] rounded-full bg-[#0A0F1D] border border-gray-800 justify-center items-center"
        >
          <Ionicons name="add" size={16} color="#FFF" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleRemoveProduct(cartItem.item.id)}
          className="min-h-[44px] min-w-[44px] rounded-full bg-red-500/10 justify-center items-center ml-2"
        >
          <Ionicons name="trash-outline" size={16} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
});
