import { useCallback, useEffect, useRef, useState } from "react";
import {
  TrendingUp,
  Filter,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Receipt,
  FileText,
  RefreshCw,
} from "lucide-react";

const POLL_INTERVAL_MS = 4000;

const formatDateLocal = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function Reports() {
  const today = new Date();
  const todayStr = formatDateLocal(today);
  const thirtyDaysAgo = formatDateLocal(
    new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30)
  );

  const [startDate, setStartDate] = useState(thirtyDaysAgo);
  const [endDate, setEndDate] = useState(todayStr);
  const [salesReport, setSalesReport] = useState([]);
  const [expensesReport, setExpensesReport] = useState([]);
  const [activeTab, setActiveTab] = useState("sales");
  const [loading, setLoading] = useState(false);

  const isFetchingRef = useRef(false);
  const datesRef = useRef({ startDate: thirtyDaysAgo, endDate: todayStr });

  useEffect(() => {
    datesRef.current = { startDate, endDate };
  }, [startDate, endDate]);

  const fetchReports = useCallback(async ({ silent = false, range } = {}) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (!silent) setLoading(true);

    const activeRange = range || datesRef.current;

    try {
      if (!window.electronAPI || !window.electronAPI.reports) {
        throw new Error("Electron API reports bridge defined nahi hai preload.cjs mein!");
      }

      const [sales, expenses] = await Promise.all([
        window.electronAPI.reports.getSalesSummary(activeRange),
        window.electronAPI.reports.getExpensesSummary(activeRange),
      ]);

      setSalesReport(Array.isArray(sales) ? sales : []);
      setExpensesReport(Array.isArray(expenses) ? expenses : []);
    } catch (err) {
      console.error("Failed to load reports:", err);
      if (!silent) {
        alert("Reports load nahi huin: " + err.message);
      }
    } finally {
      isFetchingRef.current = false;
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports({ silent: false, range: datesRef.current });

    const intervalId = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchReports({ silent: true });
      }
    }, POLL_INTERVAL_MS);

    const handleFocus = () => {
      fetchReports({ silent: true });
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchReports]);

  const applyRangeAndFetch = (nextStart, nextEnd) => {
    setStartDate(nextStart);
    setEndDate(nextEnd);
    datesRef.current = { startDate: nextStart, endDate: nextEnd };
    fetchReports({ silent: false, range: { startDate: nextStart, endDate: nextEnd } });
  };

  const handleMonthDaysPreset = (maxDay) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    const clampedEndDay = Math.min(maxDay, lastDayOfMonth);

    const start = formatDateLocal(new Date(year, month, 1));
    const end = formatDateLocal(new Date(year, month, clampedEndDay));
    applyRangeAndFetch(start, end);
  };

  const totalSalesSum = salesReport.reduce(
    (acc, curr) => acc + Number(curr.TotalSales || 0),
    0
  );
  const totalProfitSum = salesReport.reduce(
    (acc, curr) => acc + Number(curr.TotalProfit || 0),
    0
  );
  const totalExpensesSum = expensesReport.reduce(
    (acc, curr) => acc + Number(curr.Amount || 0),
    0
  );
  const netIncome = totalProfitSum - totalExpensesSum;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-neutral-900 tracking-tight flex items-center gap-2">
            <TrendingUp className="text-neutral-900" size={22} />
            Periodic Reports & Financial Analytics
          </h2>
          <p className="text-xs text-neutral-400 font-medium mt-0.5">
            Dukan ki mukammal sale, gross profit, kharchon aur net income ka analytical record.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchReports({ silent: false, range: { startDate, endDate } })}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-xs font-bold bg-white hover:bg-neutral-50 text-neutral-700 px-3.5 py-2 rounded-xl border border-neutral-200 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          title="Refresh Reports Now"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Sync
        </button>
      </div>

      {/* Date Filter Bar Card */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row items-end gap-4">
          <div className="w-full sm:w-auto flex-1">
            <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">
              From Date:
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-neutral-800 focus:outline-none focus:border-black"
            />
          </div>

          <div className="w-full sm:w-auto flex-1">
            <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">
              To Date:
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-neutral-800 focus:outline-none focus:border-black"
            />
          </div>

          <button
            type="button"
            onClick={() => fetchReports({ silent: false, range: { startDate, endDate } })}
            disabled={loading}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-black hover:bg-neutral-800 text-white font-bold px-6 py-2.5 rounded-xl text-xs tracking-wide transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            <Filter size={15} />
            {loading ? "Generating..." : "Generate Report"}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] font-bold text-neutral-400 uppercase mr-1">
            Quick Range:
          </span>
          <button
            type="button"
            onClick={() => handleMonthDaysPreset(15)}
            className="px-3 py-1 rounded-lg text-[11px] font-bold bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors cursor-pointer"
          >
            1 – 15
          </button>
          <button
            type="button"
            onClick={() => handleMonthDaysPreset(30)}
            className="px-3 py-1 rounded-lg text-[11px] font-bold bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors cursor-pointer"
          >
            1 – 30
          </button>
          <button
            type="button"
            onClick={() => applyRangeAndFetch(thirtyDaysAgo, todayStr)}
            className="px-3 py-1 rounded-lg text-[11px] font-bold bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors cursor-pointer"
          >
            Last 30 Days
          </button>
        </div>
      </div>

      {/* Executive Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Sales Card */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs border-t-4 border-t-blue-600 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px] font-black text-neutral-400 uppercase tracking-wider">
              Total Sales
            </span>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <ArrowUpRight size={16} />
            </span>
          </div>
          <h3 className="text-xl font-black text-neutral-900 tracking-tight">
            Rs. {totalSalesSum.toLocaleString("en-PK")}
          </h3>
          <p className="text-[10px] text-neutral-400 mt-1 font-medium">
            Selected period revenue
          </p>
        </div>

        {/* Gross Profit Card */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs border-t-4 border-t-emerald-500 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px] font-black text-neutral-400 uppercase tracking-wider">
              Gross Profit
            </span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <DollarSign size={16} />
            </span>
          </div>
          <h3 className="text-xl font-black text-emerald-600 tracking-tight">
            Rs. {totalProfitSum.toLocaleString("en-PK")}
          </h3>
          <p className="text-[10px] text-neutral-400 mt-1 font-medium">
            Profit from sold items
          </p>
        </div>

        {/* Total Expenses Card */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs border-t-4 border-t-rose-500 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px] font-black text-neutral-400 uppercase tracking-wider">
              Total Expenses
            </span>
            <span className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <ArrowDownRight size={16} />
            </span>
          </div>
          <h3 className="text-xl font-black text-rose-600 tracking-tight">
            Rs. {totalExpensesSum.toLocaleString("en-PK")}
          </h3>
          <p className="text-[10px] text-neutral-400 mt-1 font-medium">
            Operating cash outflows
          </p>
        </div>

        {/* Net Income Card */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs border-t-4 border-t-amber-500 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px] font-black text-neutral-400 uppercase tracking-wider">
              Net Income
            </span>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Wallet size={16} />
            </span>
          </div>
          <h3
            className={`text-xl font-black tracking-tight ${
              netIncome >= 0 ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            Rs. {netIncome.toLocaleString("en-PK")}
          </h3>
          <p className="text-[10px] text-neutral-400 mt-1 font-medium">
            Gross profit minus expenses
          </p>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-neutral-200 pb-4">
        <button
          type="button"
          onClick={() => setActiveTab("sales")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "sales"
              ? "bg-black text-white shadow-sm"
              : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50"
          }`}
        >
          <Receipt size={15} />
          Sales Breakdown Report
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("expenses")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "expenses"
              ? "bg-black text-white shadow-sm"
              : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50"
          }`}
        >
          <FileText size={15} />
          Expenses Breakdown Report
        </button>
      </div>

      {/* Tables Section */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-2xs">
        {activeTab === "sales" ? (
          <div>
            <h3 className="text-sm font-black text-neutral-900 uppercase tracking-wider mb-5">
              Sales Summary By Date
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-100 text-[11px] font-black text-neutral-400 uppercase tracking-wider">
                    <th className="pb-3 px-4">Date</th>
                    <th className="pb-3 px-4">Invoices Count</th>
                    <th className="pb-3 px-4">Total Sales</th>
                    <th className="pb-3 px-4">Cash Received</th>
                    <th className="pb-3 px-4 text-right">Estimated Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50 text-xs">
                  {salesReport.map((row, idx) => (
                    <tr
                      key={row.SaleDate ?? idx}
                      className="hover:bg-neutral-50/60 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-bold text-neutral-800">
                        {row.SaleDate ? row.SaleDate.toString().split("T")[0] : "-"}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-neutral-600">
                        {row.TotalInvoices} bills
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-neutral-900">
                        Rs. {Number(row.TotalSales || 0).toLocaleString("en-PK")}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-emerald-600">
                        Rs. {Number(row.TotalPaid || 0).toLocaleString("en-PK")}
                      </td>
                      <td className="py-3.5 px-4 font-black text-emerald-600 text-right">
                        Rs. {Number(row.TotalProfit || 0).toLocaleString("en-PK")}
                      </td>
                    </tr>
                  ))}
                  {salesReport.length === 0 && (
                    <tr>
                      <td
                        colSpan="5"
                        className="py-12 text-center text-neutral-400 font-semibold"
                      >
                        Is duration mein koi sale record nahi mila.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div>
            <h3 className="text-sm font-black text-neutral-900 uppercase tracking-wider mb-5">
              Expenses Summary Breakdown
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-100 text-[11px] font-black text-neutral-400 uppercase tracking-wider">
                    <th className="pb-3 px-4">Date</th>
                    <th className="pb-3 px-4">Title</th>
                    <th className="pb-3 px-4">Category</th>
                    <th className="pb-3 px-4">Amount</th>
                    <th className="pb-3 px-4">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50 text-xs">
                  {expensesReport.map((row, idx) => (
                    <tr
                      key={row.Id ?? idx}
                      className="hover:bg-neutral-50/60 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-bold text-neutral-800">
                        {row.ExpenseDate
                          ? new Date(row.ExpenseDate).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-neutral-900">
                        {row.Title}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 bg-neutral-100 text-neutral-700 font-semibold rounded-lg text-[11px]">
                          {row.Category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-rose-600">
                        Rs. {Number(row.Amount || 0).toLocaleString("en-PK")}
                      </td>
                      <td className="py-3.5 px-4 text-neutral-600">
                        {row.Note || "-"}
                      </td>
                    </tr>
                  ))}
                  {expensesReport.length === 0 && (
                    <tr>
                      <td
                        colSpan="5"
                        className="py-12 text-center text-neutral-400 font-semibold"
                      >
                        Is duration mein koi expense record nahi mila.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}