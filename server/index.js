import express from "express";
import cors from "cors";

// Import routers
import authRouter from "./routes/auth.js";
import mastersRouter from "./routes/masters.js";
import transactionsRouter from "./routes/transactions.js";
import reportsRouter from "./routes/reports.js";
import companyRouter from "./routes/company.js";
import searchRouter from "./routes/search.js";
import notificationsRouter from "./routes/notifications.js";
import usersRouter from "./routes/users.js";
import pdfRouter from "./routes/pdf.js";
import complianceRouter from "./routes/compliance.js";
import branchRouter from "./routes/branch.js";
import billingRouter from "./routes/billing.js";
import razorpayRouter from "./routes/razorpay.js";
import analyticsRouter from "./routes/analytics.js";
import leadRouter from "./routes/leadRoutes.js";
import prisma from "./utils/prisma.js";
import pdfService from "./utils/pdfService.js";
import path from "path";

const app = express();

// Enable trust proxy for correct IP identification behind reverse proxies (like Render)
app.set('trust proxy', 1);

const allowedOrigins = [
  'http://localhost:5173', // Vite Web App
  'http://localhost:8081', // Expo Mobile Web App
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || origin === process.env.FRONTEND_URL) {
      return callback(null, true);
    }
    // Allow local development configurations dynamically (different ports, local IPs)
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://192.168.') || origin.startsWith('http://10.')) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
};
app.use(cors(corsOptions));

// Configure raw buffer parser for billing webhooks before parsing standard JSON body
app.use("/api/billing/webhooks", express.raw({ type: "application/json" }));
app.use(express.json());

// Mount routes
app.use("/api/auth", authRouter);
app.use("/api/billing", billingRouter);
app.use("/api", razorpayRouter);
app.use("/api/masters", mastersRouter);
app.use("/api/transactions", transactionsRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/company", companyRouter);
app.use("/api/search", searchRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/users", usersRouter);
app.use("/api/pdf", pdfRouter);
app.use("/api/compliance", complianceRouter);
app.use("/api/branches", branchRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/leads", leadRouter);

// Serve local generated PDFs in development fallback
app.use("/public", express.static(path.join(process.cwd(), "public")));

app.get("/", (req, res) => {
  res.send("Groww You ERP API Running 🚀");
});

// Global standardized error handling middleware
app.use((err, req, res, next) => {
  console.error("Express Error Handler:", err);
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || "An unexpected error occurred",
    error: err.error || err.message || "Internal Server Error"
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown database connection management
const gracefulShutdown = async (signal) => {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  await prisma.$disconnect();
  try {
    await pdfService.closeBrowser();
    console.log("Puppeteer browser closed.");
  } catch (err) {
    console.error("Error closing Puppeteer browser:", err);
  }
  process.exit(0);
};
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

