import { useCallback, useEffect, useRef, useState } from "react";
import {
  Receipt,
  Plus,
  Search,
  Trash2,
  RefreshCw,
  Wallet,
  Calendar,
  Tag,
  FileText,
} from "lucide-react";

const POLL_INTERVAL_MS = 4000;

const getToday = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const empty = {
  title: "",
  category: "",
  amount: "",
  note: "",
  expenseDate: getToday(),
};

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [form, setForm] = useState(empty);
  const [search, setSearch] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  const isFetchingRef = useRef(false);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (!silent) setIsSyncing(true);

    try {
      const data = await window.electronAPI.expenses.getAll();
      setExpenses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load expenses:", err);
      if (!silent) {
        alert("Expenses load nahi huay: " + err.message);
      }
    } finally {
      isFetchingRef.current = false;
      if (!silent) setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    load({ silent: false });

    const intervalId = setInterval(() => {
      if (document.visibilityState === "visible") {
        load({ silent: true });
      }
    }, POLL_INTERVAL_MS);

    const handleFocus = () => {
      load({ silent: true });
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [load]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      return alert("Expense ka title likho");
    }

    if (!form.category.trim()) {
      return alert("Expense category likho");
    }

    if (!(Number(form.amount) > 0)) {
      return alert("Valid amount enter karo");
    }

    try {
      await window.electronAPI.expenses.add({
        ...form,
        amount: Number(form.amount),
      });

      setForm({ ...empty, expenseDate: getToday() });
      await load({ silent: true });

      alert("Expense successfully add ho gaya");
    } catch (err) {
      alert("Expense save nahi hua: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (confirm("Kya tum ye expense delete karna chahte ho?")) {
      try {
        await window.electronAPI.expenses.delete(id);
        await load({ silent: true });
      } catch (err) {
        alert("Delete nahi hua: " + err.message);
      }
    }
  };

  const filtered = expenses.filter((e) => {
    const q = search.toLowerCase();

    return (
      (e.Title && e.Title.toLowerCase().includes(q)) ||
      (e.Category && e.Category.toLowerCase().includes(q)) ||
      (e.Note && e.Note.toLowerCase().includes(q))
    );
  });

  const totalExpenses = expenses.reduce(
    (total, e) => total + Number(e.Amount || 0),
    0
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      {/* Top Header & Total Summary */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Receipt className="text-slate-900" size={24} />
            Expenses Management
          </h2>
          <p className="text-xs font-medium text-slate-400 mt-0.5">
            Track daily store bills, electricity, maintenance, and operating costs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button
            type="button"
            onClick={() => load({ silent: false })}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-200/80 shadow-2xs text-xs font-bold text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh Expenses Now"
          >
            <RefreshCw size={13} className={isSyncing ? "animate-spin" : ""} />
            {isSyncing ? "Syncing..." : "Sync"}
          </button>

          <div className="bg-white px-5 py-3 rounded-3xl border border-slate-200/80 shadow-2xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <Wallet size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Total Expenses
              </p>
              <p className="text-xl font-black text-rose-600 tracking-tight">
                Rs.{" "}
                {totalExpenses.toLocaleString("en-PK", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add New Expense Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900">Add New Expense</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Enter expense details to record cash outflow
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
              Expense Title *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <FileText size={14} />
              </span>
              <input
                name="title"
                placeholder="e.g. Freezer & Shop Electricity"
                value={form.title}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl pl-9 pr-3.5 py-2.5 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
              Category *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Tag size={14} />
              </span>
              <input
                name="category"
                placeholder="e.g. Utilities"
                value={form.category}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl pl-9 pr-3.5 py-2.5 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
              Amount (Rs.) *
            </label>
            <input
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={form.amount}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
              Date
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                <Calendar size={14} />
              </span>
              <input
                name="expenseDate"
                type="date"
                value={form.expenseDate}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl pl-9 pr-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
              Note
            </label>
            <input
              name="note"
              placeholder="Optional note..."
              value={form.note}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center justify-center gap-2 bg-black hover:bg-neutral-800 text-white font-bold px-5 py-2.5 rounded-xl text-xs tracking-wide transition-all shadow-sm cursor-pointer"
          >
            <Plus size={15} />
            Add Expense
          </button>
        </div>
      </div>

      {/* Expense History Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-base font-black text-slate-900">Expense History</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Showing {filtered.length} of {expenses.length} recorded expenses
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <Search size={15} />
            </span>
            <input
              placeholder="Title ya category se search karo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl pl-9 pr-4 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
            />
          </div>
        </div>

        {filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 px-4">Title</th>
                  <th className="pb-3 px-4">Category</th>
                  <th className="pb-3 px-4">Amount</th>
                  <th className="pb-3 px-4">Note</th>
                  <th className="pb-3 px-4">Date</th>
                  <th className="pb-3 px-4 text-right">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-50 text-sm">
                {filtered.map((e, idx) => (
                  <tr
                    key={e.Id ?? `${e.Title}-${idx}`}
                    className="hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="py-4 px-4 font-bold text-slate-800">{e.Title}</td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center px-3 py-1 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold">
                        {e.Category}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-black text-rose-600">
                      Rs. {Number(e.Amount || 0).toLocaleString("en-PK")}
                    </td>
                    <td className="py-4 px-4 text-xs font-medium text-slate-500">
                      {e.Note || "-"}
                    </td>
                    <td className="py-4 px-4 text-xs font-semibold text-slate-600">
                      {e.ExpenseDate
                        ? new Date(e.ExpenseDate).toLocaleDateString("en-PK")
                        : "-"}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(e.Id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold border border-rose-100 transition-colors cursor-pointer"
                      >
                        <Trash2 size={13} />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
            <p className="text-sm font-bold text-slate-700">No expenses found</p>
            <p className="text-xs text-slate-400 mt-1">
              Add a new expense above or adjust your search filter.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}