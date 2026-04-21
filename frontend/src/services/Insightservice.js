import API from "./api";

// ── Dashboard ──────────────────────────────────────────────────────────────
export const getDashboard = () => API.get("/insights/dashboard");

// ── Profit analytics ───────────────────────────────────────────────────────
export const getDailyProfit   = () => API.get("/insights/analytics/profit");
export const getMonthlyProfit = () => API.get("/insights/analytics/profit/monthly");

// ── Sales analytics ────────────────────────────────────────────────────────
export const getMonthlySales = () => API.get("/insights/analytics/sales/monthly");

// ── Write-off analytics ────────────────────────────────────────────────────
export const getAllWriteOffs     = () => API.get("/insights/analytics/write-offs");
export const getMonthlyWriteOffs = () => API.get("/insights/analytics/write-offs/monthly");

// ── Top selling ────────────────────────────────────────────────────────────
export const getTopSellingProducts = () => API.get("/insights/analytics/top-selling-products");

// ── Transactions ───────────────────────────────────────────────────────────
export const getAllTransactions        = () => API.get("/insights/transactions");
export const getSalesTransactions      = () => API.get("/insights/transactions/sales");
export const getPurchaseTransactions   = () => API.get("/insights/transactions/purchases");
export const getWriteOffTransactions   = () => API.get("/insights/transactions/write-offs");