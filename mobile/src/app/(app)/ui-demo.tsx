import React, { useState } from 'react';
import { ScrollView, View, Text } from 'react-native';
import { PageHeader } from '../../components/ui/header';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input, NumericInput } from '../../components/ui/input';

export default function UIDemoScreen() {
  // Local states for inputs
  const [textVal, setTextVal] = useState('');
  const [errorTextVal, setErrorTextVal] = useState('This input has a verification validation error.');
  const [quantity, setQuantity] = useState('5');
  const [price, setPrice] = useState('150.50');

  return (
    <View className="flex-1 bg-[#0A0F1D]">
      {/* Notch-protected Header */}
      <PageHeader
        title="UI Component Library"
        subtext="Stitch-aligned Atomic Tokens & Elements"
        showBack={true}
      />

      <ScrollView className="flex-1 px-5 pt-4">
        
        {/* Buttons Gallery */}
        <Card className="mb-5">
          <Card.Header>
            <Card.Title>Atomic Buttons</Card.Title>
          </Card.Header>
          <Card.Content className="space-y-4">
            
            {/* Primary Orange Button */}
            <View className="mb-3">
              <Text className="text-gray-400 text-[10px] font-bold uppercase mb-1">Primary Variant (Orange Accent)</Text>
              <Button label="Submit Document" variant="primary" />
            </View>

            {/* Navy Button */}
            <View className="mb-3">
              <Text className="text-gray-400 text-[10px] font-bold uppercase mb-1">Navy Variant (Brand Base)</Text>
              <Button label="Save Draft" variant="navy" />
            </View>

            {/* Outline Button */}
            <View className="mb-3">
              <Text className="text-gray-400 text-[10px] font-bold uppercase mb-1">Outline Variant</Text>
              <Button label="Cancel Action" variant="outline" />
            </View>

            {/* Ghost Button */}
            <View className="mb-3">
              <Text className="text-gray-400 text-[10px] font-bold uppercase mb-1">Ghost Variant</Text>
              <Button label="Skip Verification" variant="ghost" />
            </View>

            {/* Loading & Disabled States */}
            <View className="flex-row gap-3 mb-2">
              <View className="flex-1">
                <Text className="text-gray-400 text-[10px] font-bold uppercase mb-1">Loading</Text>
                <Button label="Send" variant="primary" size="sm" loading={true} />
              </View>
              <View className="flex-1">
                <Text className="text-gray-400 text-[10px] font-bold uppercase mb-1">Disabled</Text>
                <Button label="Locked" variant="navy" size="sm" disabled={true} />
              </View>
            </View>

          </Card.Content>
        </Card>

        {/* Inputs Gallery */}
        <Card className="mb-5">
          <Card.Header>
            <Card.Title>Inputs & Matrices</Card.Title>
          </Card.Header>
          <Card.Content>
            
            {/* Standard Text Input */}
            <Input
              label="Customer Code"
              placeholder="e.g. CUST-88301"
              value={textVal}
              onChangeText={setTextVal}
              icon="person-outline"
            />

            {/* Error Input */}
            <Input
              label="Branch Register ID"
              placeholder="e.g. REG-01"
              value={errorTextVal}
              onChangeText={setErrorTextVal}
              error="The database indicates this register is locked by another terminal."
              icon="lock-closed-outline"
            />

            {/* Custom Numeric Matrix (Quantity) */}
            <NumericInput
              label="Stock Quantity Count"
              value={quantity}
              onChangeText={setQuantity}
              min={1}
              max={100}
              step={1}
              placeholder="Enter units"
            />

            {/* Custom Numeric Matrix (Price - Float) */}
            <NumericInput
              label="Unit Wholesale Price (INR)"
              value={price}
              onChangeText={setPrice}
              min={10}
              max={50000}
              step={5}
              placeholder="Enter price"
            />

          </Card.Content>
        </Card>

        {/* Compound Card Layouts */}
        <Card className="mb-12">
          <Card.Header>
            <Card.Title>Invoice Details Wrapper</Card.Title>
            <View className="bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              <Text className="text-emerald-500 text-[10px] font-black">PAID</Text>
            </View>
          </Card.Header>
          <Card.Content>
            <View className="flex-row justify-between items-center py-2 border-b border-gray-800/40">
              <Text className="text-gray-400 text-sm font-medium">Invoice No</Text>
              <Text className="text-white text-sm font-bold">GY-SALE-0284</Text>
            </View>
            <View className="flex-row justify-between items-center py-2 border-b border-gray-800/40">
              <Text className="text-gray-400 text-sm font-medium">Billed Date</Text>
              <Text className="text-white text-sm font-bold">15 Jun 2026</Text>
            </View>
            <View className="flex-row justify-between items-center py-2">
              <Text className="text-gray-400 text-sm font-medium">Branch Location</Text>
              <Text className="text-white text-sm font-bold">Main Warehouse</Text>
            </View>
          </Card.Content>
          <Card.Footer>
            <Text className="text-gray-400 text-xs">GST Registered Transactions Only</Text>
            <Text className="text-[#F7941D] text-base font-black">₹49,990.00</Text>
          </Card.Footer>
        </Card>

      </ScrollView>
    </View>
  );
}
