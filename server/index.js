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
import prisma from "./utils/prisma.js";

const app = express();

const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());

// Mount routes
app.use("/api/auth", authRouter);
app.use("/api/masters", mastersRouter);
app.use("/api/transactions", transactionsRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/company", companyRouter);
app.use("/api/search", searchRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/users", usersRouter);

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
  process.exit(0);
};
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

