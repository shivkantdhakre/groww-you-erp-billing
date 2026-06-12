import { z } from "zod";

// Helper to format zod validation errors
export const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.issues.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));
      return res.status(400).json({ error: "Validation failed", details: formattedErrors });
    }
    next(error);
  }
};

// GSTIN pattern (15 characters alphanumeric)
const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const mobileRegex = /^[0-9]{10}$/;
const pincodeRegex = /^[1-9][0-9]{5}$/;

// 1. Forgot Password Schema
export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email format"),
  newPassword: z.string().min(6, "New password must be at least 6 characters long"),
  gstNumber: z.string().regex(gstinRegex, "Invalid GSTIN format").nullish().or(z.literal("")),
  mobileNumber: z.string().regex(mobileRegex, "Invalid Mobile format").nullish().or(z.literal("")),
}).refine(data => data.gstNumber || data.mobileNumber, {
  message: "At least one verification factor (GSTIN or Mobile) is required",
  path: ["gstNumber"],
});

// 2. Company Settings Schema
export const companySettingsSchema = z.object({
  name: z.string().min(1, "Company Name is required"),
  gstNumber: z.string().regex(gstinRegex, "Invalid GSTIN format").nullish().or(z.literal("")),
  mobileNumber: z.string().regex(mobileRegex, "Invalid Mobile format").nullish().or(z.literal("")),
  address: z.string().nullish().or(z.literal("")),
  invoicePrefix: z.string().nullish().or(z.literal("")),
  financialYear: z.string().nullish().or(z.literal("")),
  currentFinancialYearStart: z.string().datetime().nullish().or(z.string().date()).or(z.literal("")).nullish(),
  financialYearLocked: z.boolean().default(false),
  pincode: z.string().regex(pincodeRegex, "Pincode must be exactly 6 digits").nullish().or(z.literal("")),
});

// 3. Customer Schema (for POST & PUT)
export const customerSchema = z.object({
  name: z.string().min(1, "Customer Name is required"),
  mobile: z.string().regex(mobileRegex, "Mobile number must be exactly 10 digits"),
  gstin: z.string().regex(gstinRegex, "Invalid GSTIN format").nullish().or(z.literal("")),
  address: z.string().nullish().or(z.literal("")),
  pincode: z.string().regex(pincodeRegex, "Pincode must be exactly 6 digits"),
  openingBalance: z.number().default(0),
  creditLimit: z.number().default(0),
});

// 4. Vendor Schema (for POST & PUT)
export const vendorSchema = z.object({
  name: z.string().min(1, "Vendor Name is required"),
  mobile: z.string().regex(mobileRegex, "Mobile number must be exactly 10 digits"),
  gstin: z.string().regex(gstinRegex, "Invalid GSTIN format").nullish().or(z.literal("")),
  address: z.string().nullish().or(z.literal("")),
  pincode: z.string().regex(pincodeRegex, "Pincode must be exactly 6 digits"),
  openingBalance: z.number().default(0),
});

// 5. Item Schema (for POST & PUT)
export const itemSchema = z.object({
  name: z.string().min(1, "Item Name is required"),
  sku: z.string().min(1, "SKU / Code is required"),
  category: z.string().nullish().or(z.literal("")),
  unit: z.string().min(1, "Unit is required"),
  purchasePrice: z.number().nonnegative("Purchase Price cannot be negative"),
  salePrice: z.number().nonnegative("Sale Price cannot be negative"),
  gstPercentage: z.number().refine(val => [0, 5, 12, 18, 28].includes(val), {
    message: "GST Percentage must be 0, 5, 12, 18, or 28",
  }),
  openingStock: z.number().int("Opening Stock must be an integer").default(0),
  minStockAlert: z.number().int("Min Stock Alert must be an integer").default(10),
  hsnCode: z.string().regex(/^[0-9]{4,8}$/, "HSN Code must be between 4 and 8 digits"),
  hsnCodeText: z.string().nullish().or(z.literal("")), // optional compatibility placeholder
});
