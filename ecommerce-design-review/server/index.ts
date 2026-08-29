// Express server entry point
import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

import authRouter from "./routes/auth.js";
import catalogRouter from "./routes/catalog.js";
import cartRouter from "./routes/cart.js";
import checkoutRouter from "./routes/checkout.js";
import ordersRouter from "./routes/orders.js";
import accountRouter from "./routes/account.js";
import adminRouter from "./routes/admin.js";
import warehousesRouter from "./routes/warehouses.js";
import shippingRouter from "./routes/shipping.js";
import returnsRouter from "./routes/returns.js";

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
  credentials: true,
}));
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

// ── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/auth", authRouter);
app.use("/api/catalog", catalogRouter);
app.use("/api/cart", cartRouter);
app.use("/api/checkout", checkoutRouter);
app.use("/api/warehouses", warehousesRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/account", accountRouter);
app.use("/api/admin", adminRouter);
app.use("/api/shipping", shippingRouter);
app.use("/api/returns", returnsRouter);

// ── Health check ─────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// ── Global error handler ─────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  const status = (err as { status?: number }).status ?? 500;
  const message = err.message.startsWith("INSUFFICIENT_STOCK") ? "Không đủ hàng trong kho" :
    err.message.startsWith("COUPON_INVALID") ? "Mã giảm giá không hợp lệ" :
    err.message.startsWith("NEGATIVE_STOCK") ? "Tồn kho không thể âm" :
    process.env.NODE_ENV === "production" ? "Internal server error" : err.message;
  res.status(status).json({ success: false, error: message });
});

app.listen(PORT, () => {
  console.log(`\n🌸 An An Shop API server running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);
});

export default app;
