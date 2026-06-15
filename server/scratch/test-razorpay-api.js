import axios from 'axios';

async function runTest() {
  console.log("=== Testing Razorpay Integration API Endpoints ===");
  const baseURL = 'http://localhost:5000/api';

  try {
    // 1. Login to get the JWT token
    console.log("Logging in as company admin...");
    const loginRes = await axios.post(`${baseURL}/auth/login`, {
      email: 'admin@growwyou.com',
      password: 'admin123'
    });

    const token = loginRes.data.token;
    console.log("Login successful. Received token.");

    const authHeaders = {
      headers: {
        Authorization: `Bearer ${token}`
      }
    };

    // 2. Test Order Creation
    console.log("\nTesting POST /api/create-order...");
    // A. Test invalid amount (< 100 paise)
    try {
      await axios.post(`${baseURL}/create-order`, {
        amount: 50,
        currency: 'INR',
        receipt: 'test_receipt_1'
      }, authHeaders);
      console.error("❌ FAILED: Invalid amount did not throw an error.");
    } catch (err) {
      if (err.response && err.response.status === 400) {
        console.log("✅ PASSED: Invalid amount correctly rejected with status 400.");
      } else {
        console.error("❌ FAILED: Expected 400 for invalid amount, got:", err.message);
      }
    }

    // B. Test valid amount order creation
    let order_id = null;
    try {
      const orderRes = await axios.post(`${baseURL}/create-order`, {
        amount: 500, // ₹5.00
        currency: 'INR',
        receipt: 'test_receipt_2'
      }, authHeaders);
      
      order_id = orderRes.data.order_id;
      console.log("✅ PASSED: Order created successfully.");
      console.log("   Order ID:", orderRes.data.order_id);
      console.log("   Amount:", orderRes.data.amount, "paise");
      console.log("   Currency:", orderRes.data.currency);
    } catch (err) {
      console.error("❌ FAILED: Valid order creation failed:", err.response?.data || err.message);
    }

    // 3. Test Signature Verification
    console.log("\nTesting POST /api/verify-payment...");
    // A. Test missing fields
    try {
      await axios.post(`${baseURL}/verify-payment`, {
        razorpay_order_id: order_id
      }, authHeaders);
      console.error("❌ FAILED: Missing fields did not throw an error.");
    } catch (err) {
      if (err.response && err.response.status === 400) {
        console.log("✅ PASSED: Missing fields correctly rejected with status 400.");
      } else {
        console.error("❌ FAILED: Expected 400 for missing fields, got:", err.message);
      }
    }

    // B. Test signature mismatch (invalid signature)
    try {
      await axios.post(`${baseURL}/verify-payment`, {
        razorpay_order_id: order_id,
        razorpay_payment_id: 'pay_dummy_123',
        razorpay_signature: 'invalid_signature_hex'
      }, authHeaders);
      console.error("❌ FAILED: Invalid signature was accepted.");
    } catch (err) {
      if (err.response && err.response.status === 400) {
        console.log("✅ PASSED: Invalid signature correctly rejected with status 400.");
      } else {
        console.error("❌ FAILED: Expected 400 for signature mismatch, got:", err.message);
      }
    }

  } catch (err) {
    console.error("❌ Test encountered an error:", err.response?.data || err.message);
  }
}

runTest();
