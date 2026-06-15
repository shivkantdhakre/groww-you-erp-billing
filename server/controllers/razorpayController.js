import Razorpay from "razorpay";
import crypto from "crypto";

const getRazorpayInstance = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay API keys are not configured on the server.");
  }
  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
};

/**
 * POST /api/create-order
 * Creates an order in Razorpay and returns the order details.
 */
export const createOrder = async (req, res) => {
  const { amount, currency, receipt } = req.body;

  // Validate amount >= 100 paise (1 INR)
  if (!amount || isNaN(amount) || amount < 100) {
    return res.status(400).json({
      error: "INVALID_AMOUNT",
      message: "Amount must be a number and at least 100 paise (1 INR)."
    });
  }

  try {
    const razorpay = getRazorpayInstance();
    const order = await razorpay.orders.create({
      amount: Math.round(amount),
      currency: currency || "INR",
      receipt: receipt || `rec_${Date.now()}`
    });

    return res.status(200).json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency
    });
  } catch (err) {
    console.error("Razorpay Create Order Error:", err);
    
    // Handle authentication failures (401) vs server errors (500)
    if (err.statusCode === 401 || err.message?.includes("auth") || err.description?.includes("auth")) {
      return res.status(401).json({
        error: "AUTHENTICATION_FAILED",
        message: "Failed to authenticate with Razorpay API."
      });
    }

    return res.status(500).json({
      error: "RAZORPAY_API_ERROR",
      message: err.message || "An error occurred while creating the Razorpay order."
    });
  }
};

/**
 * POST /api/verify-payment
 * Cryptographically verifies Razorpay payment signatures.
 */
export const verifyPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({
      error: "MISSING_FIELDS",
      message: "Missing required verification fields (order_id, payment_id, signature)."
    });
  }

  try {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return res.status(500).json({
        error: "CONFIGURATION_ERROR",
        message: "Razorpay Key Secret is not configured on the server."
      });
    }

    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(text)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        error: "SIGNATURE_MISMATCH",
        message: "Cryptographic signature verification failed. The transaction may have been tampered with."
      });
    }

    // Success! Return positive status
    return res.status(200).json({
      success: true,
      message: "Payment signature verified successfully."
    });
  } catch (err) {
    console.error("Razorpay Signature Verification Error:", err);
    return res.status(500).json({
      error: "VERIFICATION_ERROR",
      message: err.message || "An error occurred during payment verification."
    });
  }
};
