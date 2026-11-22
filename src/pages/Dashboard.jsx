import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  RefreshCw,
  Users,
  Package,
  ReceiptText,
  History,
  PieChart as PieChartIcon,
  BarChart3,
  AlertTriangle,
} from "lucide-react";

const POLL_INTERVAL_MS = 4000;

function formatDate(val) {
  if (!val) return "-";
  const str = String(val);
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const d = new Date(`${str}T00:00:00`);
    return Number.isNaN(d.getTime()) ? str : d.toLocaleDateString("en-PK");
  }
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? str : d.toLocaleDateString("en-PK");
}

function toSafeNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

const PIE_COLORS = [
  "#0f172a",
  "#10b981",
  "#f59e0b",
  "#f43f5e",
  "#6366f1",
  "#06b6d4",
];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [udhaarCustomers, setUdhaarCustomers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [invoices, setInvoices] = useState([]);

  const [onlyPendingUdhaar, setOnlyPendingUdhaar] = useState(true);
  const [productSearch, setProductSearch] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  const isFetchingRef = useRef(false);

  const loadDashboardData = useCallback(async ({ silent = false } = {}) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (!silent) setIsSyncing(true);

    try {
      const api = window.electronAPI || {};
      const [statsRes, prodRes, udhaarRes, expRes, invRes] =
        await Promise.allSettled([
          api.dashboard?.getStats?.(),
          api.products?.getAll?.(),
          api.udhaar?.getBalances?.() ?? api.customers?.getAll?.(),
          api.expenses?.getAll?.(),
          api.invoices?.getAll?.(),
        ]);

      if (statsRes.status === "fulfilled" && statsRes.value) {
        setStats(statsRes.value);
      }
      if (prodRes.status === "fulfilled" && Array.isArray(prodRes.value)) {
        setProducts(prodRes.value);
      }
      if (udhaarRes.status === "fulfilled" && Array.isArray(udhaarRes.value)) {
        setUdhaarCustomers(udhaarRes.value);
      }
      if (expRes.status === "fulfilled" && Array.isArray(expRes.value)) {
        setExpenses(expRes.value);
      }
      if (invRes.status === "fulfilled" && Array.isArray(invRes.value)) {
        setInvoices(invRes.value);
      }
    } catch (err) {
      console.error("Failed to load full dashboard:", err);
    } finally {
      isFetchingRef.current = false;
      if (!silent) setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData({ silent: false });

    const intervalId = setInterval(() => {
      if (document.visibilityState === "visible") {
        loadDashboardData({ silent: true });
      }
    }, POLL_INTERVAL_MS);

    const handleFocus = () => {
      loadDashboardData({ silent: true });
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadDashboardData]);

  const normalizedUdhaarList = useMemo(() => {
    const list = udhaarCustomers.map((c, idx) => ({
      Id: c.CustomerId ?? c.Id ?? idx + 1,
      Name: c.Name || "Customer",
      Phone: c.Phone || "-",
      Balance: toSafeNumber(c.Balance, 0),
    }));
    const filtered = onlyPendingUdhaar
      ? list.filter((c) => c.Balance > 0)
      : list;
    return filtered.sort((a, b) => b.Balance - a.Balance);
  }, [udhaarCustomers, onlyPendingUdhaar]);

  const totalUdhaarDue = useMemo(() => {
    if (stats?.totalUdhaar !== undefined) return toSafeNumber(stats.totalUdhaar);
    return udhaarCustomers.reduce(
      (sum, c) => sum + Math.max(0, toSafeNumber(c.Balance, 0)),
      0
    );
  }, [stats, udhaarCustomers]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    const list = [...products].sort(
      (a, b) => toSafeNumber(a.Stock, 0) - toSafeNumber(b.Stock, 0)
    );
    if (!q) return list;
    return list.filter(
      (p) =>
        String(p.Name || "").toLowerCase().includes(q) ||
        String(p.Barcode || "").toLowerCase().includes(q)
    );
  }, [products, productSearch]);

  const expenseCategoryBreakdown = useMemo(() => {
    const map = new Map();
    for (const exp of expenses) {
      const cat = String(exp.Category || "General").trim() || "General";
      const amt = Math.max(0, toSafeNumber(exp.Amount, 0));
      map.set(cat, (map.get(cat) || 0) + amt);
    }
    const entries = Array.from(map.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    const total = entries.reduce((s, e) => s + e.amount, 0);
    return {
      total,
      items: entries.map((e, index) => ({
        ...e,
        percent: total > 0 ? Math.round((e.amount / total) * 100) : 0,
        color: PIE_COLORS[index % PIE_COLORS.length],
      })),
    };
  }, [expenses]);

  const pieGradientStyle = useMemo(() => {
    if (
      expenseCategoryBreakdown.total <= 0 ||
      expenseCategoryBreakdown.items.length === 0
    ) {
      return { background: "#e2e8f0" };
    }
    let currentDeg = 0;
    const slices = expenseCategoryBreakdown.items.map((item) => {
      const deg = (item.amount / expenseCategoryBreakdown.total) * 360;
      const start = currentDeg;
      const end = currentDeg + deg;
      currentDeg = end;
      return `${item.color} ${start.toFixed(1)}deg ${end.toFixed(1)}deg`;
    });
    return { background: `conic-gradient(${slices.join(", ")})` };
  }, [expenseCategoryBreakdown]);

  const financialBars = useMemo(() => {
    const todaySales = toSafeNumber(stats?.todaySales, 0);
    const todayProfit = Math.max(0, toSafeNumber(stats?.todayProfit, 0));
    const todayExpenses = toSafeNumber(stats?.todayExpenses, 0);
    const udhaar = Math.max(0, totalUdhaarDue);

    const rows = [
      {
        label: "Today's Sales",
        value: todaySales,
        barClass: "bg-slate-900",
        badgeClass: "text-slate-900",
      },
      {
        label: "Today's Profit",
        value: todayProfit,
        barClass: "bg-emerald-500",
        badgeClass: "text-emerald-700",
      },
      {
        label: "Today's Expenses",
        value: todayExpenses,
        barClass: "bg-rose-500",
        badgeClass: "text-rose-600",
      },
      {
        label: "Total Customer Udhaar",
        value: udhaar,
        barClass: "bg-amber-500",
        badgeClass: "text-amber-700",
      },
    ];

    const maxVal = Math.max(1, ...rows.map((r) => r.value));
    return rows.map((r) => ({
      ...r,
      widthPct: Math.min(100, Math.max(4, Math.round((r.value / maxVal) * 100))),
    }));
  }, [stats, totalUdhaarDue]);

  if (!stats && products.length === 0 && invoices.length === 0) {
    return (
      <div className="p-12 text-slate-400 font-semibold text-center">
        Loading full store dashboard...
      </div>
    );
  }

  const todaySalesValue = toSafeNumber(stats?.todaySales, 0);
  const todayProfitValue = toSafeNumber(stats?.todayProfit, 0);
  const todayExpensesValue = toSafeNumber(stats?.todayExpenses, 0);
  const totalStockUnits = products.reduce(
    (sum, p) => sum + toSafeNumber(p.Stock, 0),
    0
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Hi, Rayyan! Store Command Center
          </h2>
          <p className="text-xs font-medium text-slate-400 mt-0.5">
            Customer udhaar, product quantities, expenses, invoices aur live charts ek hi jagah.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => loadDashboardData({ silent: false })}
            className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 px-3.5 py-2 rounded-2xl border border-slate-200/80 shadow-2xs text-xs font-bold text-slate-700 transition-colors cursor-pointer"
            title="Refresh All Dashboard Data"
          >
            <RefreshCw size={13} className={isSyncing ? "animate-spin" : ""} />
            Sync Now
          </button>

          <div className="bg-white px-4 py-2 rounded-2xl border border-slate-200/80 shadow-2xs text-xs font-bold text-slate-600">
            📅 Live Overview
          </div>
        </div>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Today's Revenue
            </span>
            <span className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              💰
            </span>
          </div>
          <h3 className="text-2xl font-black text-slate-900">
            Rs. {todaySalesValue.toLocaleString("en-PK")}
          </h3>
          <p className="mt-2 text-xs font-bold text-slate-500">
            Total Invoices: {stats?.totalInvoices ?? invoices.length}
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Today's Gross Profit
            </span>
            <span className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              📈
            </span>
          </div>
          <h3
            className={`text-2xl font-black ${
              todayProfitValue >= 0 ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            Rs. {todayProfitValue.toLocaleString("en-PK")}
          </h3>
          <p className="mt-2 text-xs font-bold text-emerald-600">
            Today's Expenses: Rs. {todayExpensesValue.toLocaleString("en-PK")}
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Total Udhaar Due
            </span>
            <span className="w-9 h-9 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              📒
            </span>
          </div>
          <h3 className="text-2xl font-black text-rose-600">
            Rs. {totalUdhaarDue.toLocaleString("en-PK")}
          </h3>
          <p className="mt-2 text-xs font-bold text-slate-500">
            Customers: {stats?.totalCustomers ?? udhaarCustomers.length}
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Inventory Stock
            </span>
            <span className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              📦
            </span>
          </div>
          <h3 className="text-2xl font-black text-slate-900">
            {totalStockUnits.toLocaleString("en-PK")} units
          </h3>
          <p className="mt-2 text-xs font-bold text-slate-500">
            Products: {products.length} • Suppliers:{" "}
            {stats?.totalSuppliers ?? 0}
          </p>
        </div>
      </div>

      {/* Charts Section: Cashflow Bar Chart + Expense Category Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cashflow & Udhaar Bar Chart */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <BarChart3 size={18} className="text-slate-800" />
                Sales, Profit, Expenses & Udhaar Chart
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Daily performance vs. total customer udhaar balance
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {financialBars.map((bar) => (
              <div key={bar.label} className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-600">{bar.label}</span>
                  <span className={`font-black ${bar.badgeClass}`}>
                    Rs. {bar.value.toLocaleString("en-PK")}
                  </span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${bar.barClass} rounded-full transition-all duration-300`}
                    style={{ width: `${bar.widthPct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Expense Category Pie Chart */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-5">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <PieChartIcon size={18} className="text-slate-800" />
              Expenses Category Pie Chart
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Total logged expenses: Rs.{" "}
              {expenseCategoryBreakdown.total.toLocaleString("en-PK")}
            </p>
          </div>

          {expenseCategoryBreakdown.items.length > 0 ? (
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative w-36 h-36 shrink-0 rounded-full shadow-inner flex items-center justify-center" style={pieGradientStyle}>
                <div className="w-20 h-20 rounded-full bg-white flex flex-col items-center justify-center shadow-2xs">
                  <span className="text-[10px] font-bold uppercase text-slate-400">
                    Total
                  </span>
                  <span className="text-xs font-black text-slate-900">
                    {expenseCategoryBreakdown.items.length} cats
                  </span>
                </div>
              </div>

              <div className="flex-1 w-full space-y-2.5">
                {expenseCategoryBreakdown.items.map((item) => (
                  <div
                    key={item.category}
                    className="flex items-center justify-between text-xs bg-slate-50 px-3 py-2 rounded-xl"
                  >
                    <div className="flex items-center gap-2 font-bold text-slate-700">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span>{item.category}</span>
                      <span className="text-slate-400 font-semibold">
                        ({item.percent}%)
                      </span>
                    </div>
                    <span className="font-black text-slate-900">
                      Rs. {item.amount.toLocaleString("en-PK")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400 font-semibold">
              Abhi koi expense record nahi hai.
            </div>
          )}
        </div>
      </div>

      {/* Customer Udhaar List + Products & Quantity List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Udhaar List */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Users size={18} className="text-rose-600" />
                Customer Udhaar List
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Kis customer ka kitna paisa baqi hai
              </p>
            </div>

            <button
              type="button"
              onClick={() => setOnlyPendingUdhaar((prev) => !prev)}
              className="text-[11px] font-bold px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer"
            >
              {onlyPendingUdhaar ? "Show All Customers" : "Only Udhaar Due"}
            </button>
          </div>

          {normalizedUdhaarList.length > 0 ? (
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                    <th className="pb-2.5 px-3">Customer</th>
                    <th className="pb-2.5 px-3">Phone</th>
                    <th className="pb-2.5 px-3 text-right">Udhaar Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs">
                  {normalizedUdhaarList.map((cust) => (
                    <tr key={cust.Id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {cust.Name}
                      </td>
                      <td className="py-3 px-3 text-slate-500">{cust.Phone}</td>
                      <td className="py-3 px-3 text-right">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-xl font-black ${
                            cust.Balance > 0
                              ? "bg-rose-50 text-rose-600"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          Rs. {cust.Balance.toLocaleString("en-PK")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-500 font-semibold">
              Koi pending udhaar customer nahi mila.
            </div>
          )}
        </div>

        {/* Products & Quantity List */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Package size={18} className="text-indigo-600" />
                Products & Stock Quantity ({filteredProducts.length})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Kon-kon se products hain aur kitni quantity mojood hai
              </p>
            </div>

            <input
              type="text"
              placeholder="Search product..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-slate-900"
            />
          </div>

          {filteredProducts.length > 0 ? (
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                    <th className="pb-2.5 px-3">Product</th>
                    <th className="pb-2.5 px-3">Quantity</th>
                    <th className="pb-2.5 px-3 text-right">Sale Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs">
                  {filteredProducts.map((prod, idx) => {
                    const qty = toSafeNumber(prod.Stock, 0);
                    const isLow = qty <= 5;
                    return (
                      <tr
                        key={prod.Id ?? `${prod.Name}-${idx}`}
                        className="hover:bg-slate-50/70"
                      >
                        <td className="py-3 px-3 font-bold text-slate-900">
                          {prod.Name}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl font-bold border ${
                              isLow
                                ? "bg-rose-50 text-rose-600 border-rose-100"
                                : "bg-emerald-50 text-emerald-700 border-emerald-100"
                            }`}
                          >
                            {isLow && <AlertTriangle size={12} />}
                            {qty} units
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-extrabold text-slate-800">
                          Rs. {toSafeNumber(prod.SalePrice, 0).toLocaleString("en-PK")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-500 font-semibold">
              Koi product nahi mila.
            </div>
          )}
        </div>
      </div>

      {/* Expenses List (Kis Cheez Ka + Kis Tareekh Ko) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <ReceiptText size={18} className="text-rose-600" />
              Expenses List ({expenses.length})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Kis cheez ka kharcha tha, category aur kis tareekh ko hua
            </p>
          </div>
        </div>

        {expenses.length > 0 ? (
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="pb-2.5 px-3">Expense / Cheez</th>
                  <th className="pb-2.5 px-3">Category</th>
                  <th className="pb-2.5 px-3">Date (Tareekh)</th>
                  <th className="pb-2.5 px-3">Note</th>
                  <th className="pb-2.5 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {expenses.map((exp, idx) => (
                  <tr
                    key={exp.Id ?? `${exp.Title}-${idx}`}
                    className="hover:bg-slate-50/70"
                  >
                    <td className="py-3 px-3 font-bold text-slate-900">
                      {exp.Title || "-"}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold">
                        {exp.Category || "General"}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-600">
                      {formatDate(exp.ExpenseDate || exp.CreatedAt)}
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      {exp.Note || "-"}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-rose-600">
                      Rs. {toSafeNumber(exp.Amount, 0).toLocaleString("en-PK")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-500 font-semibold">
            Koi expense record nahi mila.
          </div>
        )}
      </div>

      {/* Invoice History List */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <History size={18} className="text-emerald-600" />
              Invoice History ({invoices.length})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Recent sales bills, customers, items aur payment status
            </p>
          </div>
        </div>

        {invoices.length > 0 ? (
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="pb-2.5 px-3">Invoice #</th>
                  <th className="pb-2.5 px-3">Customer</th>
                  <th className="pb-2.5 px-3">Items</th>
                  <th className="pb-2.5 px-3">Total</th>
                  <th className="pb-2.5 px-3">Paid</th>
                  <th className="pb-2.5 px-3 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {invoices.slice(0, 25).map((inv, idx) => {
                  const summary =
                    inv.itemsSummary ||
                    inv.ItemsSummary ||
                    (Array.isArray(inv.items)
                      ? inv.items
                          .map(
                            (it) =>
                              `${it.ProductName || it.name || "Item"} ×${
                                it.Quantity || it.quantity || it.qty || 1
                              }`
                          )
                          .join(", ")
                      : "-");

                  return (
                    <tr
                      key={inv.Id ?? `inv-${idx}`}
                      className="hover:bg-slate-50/70"
                    >
                      <td className="py-3 px-3 font-black text-slate-900">
                        #{inv.Id}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-700">
                        {inv.CustomerName || "Walk-in"}
                      </td>
                      <td className="py-3 px-3 text-slate-500 max-w-xs truncate">
                        {summary || "-"}
                      </td>
                      <td className="py-3 px-3 font-black text-slate-900">
                        Rs. {toSafeNumber(inv.Total, 0).toLocaleString("en-PK")}
                      </td>
                      <td className="py-3 px-3 font-bold text-emerald-600">
                        Rs. {toSafeNumber(inv.Paid, 0).toLocaleString("en-PK")}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-500">
                        {formatDate(inv.CreatedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-500 font-semibold">
            Koi invoice history nahi mili.
          </div>
        )}
      </div>
    </div>
  );
}