import { useCallback, useEffect, useRef, useState } from "react";
import {
  BookOpenCheck,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Check,
  Wallet,
  User,
  FileText,
  RefreshCw,
} from "lucide-react";

const POLL_INTERVAL_MS = 4000;

export default function Udhaar() {
  const [balances, setBalances] = useState([]);
  const [selected, setSelected] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [type, setType] = useState("Udhaar");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  const isFetchingRef = useRef(false);
  const selectedIdRef = useRef(null);

  const getCustomerId = (c) => c?.Id ?? c?.CustomerId ?? null;

  useEffect(() => {
    selectedIdRef.current = getCustomerId(selected);
  }, [selected]);

  const loadLedger = useCallback(async (customerId) => {
    if (customerId == null) return;
    try {
      const data = await window.electronAPI.udhaar.getLedger(customerId);
      if (selectedIdRef.current === customerId) {
        setLedger(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to load ledger:", err);
    }
  }, []);

  const loadBalances = useCallback(
    async ({ silent = false } = {}) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      if (!silent) setIsSyncing(true);

      try {
        const data = await window.electronAPI.udhaar.getBalances();
        const list = (Array.isArray(data) ? data : []).map((c, idx) => ({
          ...c,
          Id: getCustomerId(c) ?? `cust-${idx}`,
        }));
        setBalances(list);

        const activeId = selectedIdRef.current;
        if (activeId != null) {
          const updatedCustomer = list.find((c) => getCustomerId(c) === activeId);
          if (updatedCustomer) {
            setSelected(updatedCustomer);
            await loadLedger(activeId);
          } else {
            setSelected(null);
            setLedger([]);
          }
        }
      } catch (err) {
        console.error("Failed to load balances:", err);
      } finally {
        isFetchingRef.current = false;
        if (!silent) setIsSyncing(false);
      }
    },
    [loadLedger]
  );

  useEffect(() => {
    loadBalances({ silent: false });

    const intervalId = setInterval(() => {
      if (document.visibilityState === "visible") {
        loadBalances({ silent: true });
      }
    }, POLL_INTERVAL_MS);

    const handleFocus = () => {
      loadBalances({ silent: true });
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadBalances]);

  const selectCustomer = (c) => {
    const custId = getCustomerId(c);
    setSelected(c);
    setLedger([]);
    loadLedger(custId);
  };

  const handleSave = async () => {
    const custId = getCustomerId(selected);
    if (custId == null) return;
    const value = Number(amount);
    if (!(value > 0)) return alert("Sahi amount enter karo!");

    if (type === "Payment" && value > Number(selected.Balance || 0)) {
      if (!confirm("Payment baqaya se zyada hai. Phir bhi save karna chahte hain?"))
        return;
    }

    try {
      await window.electronAPI.udhaar.add({
        customerId: custId,
        type,
        amount: value,
        note: note.trim(),
      });
      setAmount("");
      setNote("");
      await loadLedger(custId);
      const updated = await window.electronAPI.udhaar.getBalances();
      const list = (Array.isArray(updated) ? updated : []).map((c, idx) => ({
        ...c,
        Id: getCustomerId(c) ?? `cust-${idx}`,
      }));
      setBalances(list);
      setSelected(list.find((c) => getCustomerId(c) === custId) || null);
    } catch (err) {
      alert("Save nahi hua: " + err.message);
    }
  };

  const totalOutstanding = balances.reduce(
    (s, c) => s + Number(c.Balance || 0),
    0
  );

  const filteredBalances = balances.filter((c) => {
    const q = search.toLowerCase();
    return (
      (c.Name && c.Name.toLowerCase().includes(q)) ||
      (c.Phone && c.Phone.toLowerCase().includes(q))
    );
  });

  const selectedCustId = getCustomerId(selected);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header Title & Total Card */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-neutral-900 tracking-tight flex items-center gap-2">
            <BookOpenCheck className="text-neutral-900" size={22} />
            Udhaar & Credit Ledger
          </h2>
          <p className="text-xs text-neutral-400 font-medium mt-0.5">
            Customers ke baqaya jaat (udhaar) aur cash repayments ka mukammal hisaab.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => loadBalances({ silent: false })}
            className="inline-flex items-center gap-1.5 text-xs font-bold bg-white hover:bg-neutral-50 text-neutral-700 px-3.5 py-2.5 rounded-2xl border border-neutral-200 shadow-2xs transition-colors cursor-pointer"
            title="Refresh Udhaar Balances & Ledger"
          >
            <RefreshCw size={13} className={isSyncing ? "animate-spin" : ""} />
            Sync
          </button>

          {/* Total Outstanding Box */}
          <div className="bg-white px-5 py-3 rounded-2xl border border-neutral-200 shadow-2xs flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Wallet size={18} />
            </div>
            <div>
              <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                Kul Baqaya (Total Udhaar)
              </p>
              <p className="text-xl font-black text-rose-600 tracking-tight">
                Rs.{" "}
                {totalOutstanding.toLocaleString("en-PK", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Customers List (Cols 1-5) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-neutral-200 p-6 shadow-2xs space-y-4">
          <h3 className="text-sm font-black text-neutral-900 uppercase tracking-wider">
            Customer Balances
          </h3>

          {/* Search Bar */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
              <Search size={15} />
            </span>
            <input
              type="text"
              placeholder="Naam ya phone se search karo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all"
            />
          </div>

          <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
            {filteredBalances.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-100 text-[11px] font-black text-neutral-400 uppercase tracking-wider">
                    <th className="pb-3 px-3">Customer</th>
                    <th className="pb-3 px-3">Phone</th>
                    <th className="pb-3 px-3 text-right">Baqaya</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50 text-xs">
                  {filteredBalances.map((c, idx) => {
                    const rowId = getCustomerId(c) ?? idx;
                    const isSelected = selectedCustId === rowId;
                    return (
                      <tr
                        key={rowId}
                        onClick={() => selectCustomer(c)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-neutral-900 text-white hover:bg-neutral-900"
                            : "hover:bg-neutral-50/60 text-neutral-800"
                        }`}
                      >
                        <td className="py-3.5 px-3 font-bold">{c.Name}</td>
                        <td
                          className={`py-3.5 px-3 ${
                            isSelected ? "text-neutral-300" : "text-neutral-500"
                          }`}
                        >
                          {c.Phone || "-"}
                        </td>
                        <td
                          className={`py-3.5 px-3 font-extrabold text-right ${
                            isSelected
                              ? "text-white"
                              : Number(c.Balance || 0) > 0
                              ? "text-rose-600"
                              : "text-emerald-600"
                          }`}
                        >
                          Rs. {Number(c.Balance || 0).toLocaleString("en-PK")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="py-12 text-center bg-neutral-50/60 rounded-xl border border-dashed border-neutral-200">
                <p className="text-xs font-bold text-neutral-600">
                  Koi customer nahi mila!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Selected Customer Ledger & Entry Form (Cols 6-12) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-neutral-200 p-6 shadow-2xs">
          {!selected ? (
            <div className="py-24 text-center bg-neutral-50/60 rounded-xl border border-dashed border-neutral-200 space-y-2">
              <User size={32} className="mx-auto text-neutral-300" />
              <p className="text-xs font-bold text-neutral-600">
                Left side se koi customer select karein
              </p>
              <p className="text-[11px] text-neutral-400">
                Uska udhaar ledger aur entry form yahan khul jaye ga.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Customer Header Info */}
              <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="text-base font-black text-neutral-900">
                    {selected.Name}
                  </h3>
                  <p className="text-xs text-neutral-500 font-medium">
                    {selected.Phone || "No phone number"}
                  </p>
                </div>
                <div className="bg-white px-4 py-2 rounded-xl border border-neutral-200 text-right">
                  <p className="text-[10px] text-neutral-400 font-bold uppercase">
                    Current Baqaya
                  </p>
                  <p className="text-base font-black text-rose-600">
                    Rs. {Number(selected.Balance || 0).toLocaleString("en-PK")}
                  </p>
                </div>
              </div>

              {/* Add Entry Form Card */}
              <div className="bg-neutral-900 text-white p-5 rounded-xl shadow-md space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                  <FileText size={14} /> Add Udhaar / Payment Entry
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="bg-neutral-800 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-white focus:outline-none focus:border-neutral-500"
                  >
                    <option value="Udhaar">Udhaar (Given)</option>
                    <option value="Payment">Payment (Received)</option>
                  </select>

                  <input
                    type="number"
                    placeholder="Amount (Rs.)"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="bg-neutral-800 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500"
                  />

                  <input
                    type="text"
                    placeholder="Note (optional)"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="bg-neutral-800 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSave}
                  className="w-full flex items-center justify-center gap-2 bg-white hover:bg-neutral-200 text-neutral-900 font-black py-2.5 px-4 rounded-xl text-xs uppercase tracking-wide transition-all shadow-sm cursor-pointer"
                >
                  <Check size={15} /> Save Transaction Entry
                </button>
              </div>

              {/* Ledger History Table */}
              <div>
                <h4 className="text-xs font-black text-neutral-900 uppercase tracking-wider mb-3">
                  Customer Transaction History
                </h4>

                {ledger.length > 0 ? (
                  <div className="overflow-x-auto max-h-72 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-neutral-100 text-[11px] font-black text-neutral-400 uppercase tracking-wider">
                          <th className="pb-3 px-3">Date & Time</th>
                          <th className="pb-3 px-3">Type</th>
                          <th className="pb-3 px-3">Amount</th>
                          <th className="pb-3 px-3">Note</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-50 text-xs">
                        {ledger.map((l, idx) => (
                          <tr
                            key={l.Id ?? idx}
                            className="hover:bg-neutral-50/60 transition-colors"
                          >
                            <td className="py-3 px-3 text-neutral-500 font-medium">
                              {new Date(l.CreatedAt).toLocaleString()}
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold ${
                                  l.Type === "Udhaar"
                                    ? "bg-rose-50 text-rose-600 border border-rose-100"
                                    : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                }`}
                              >
                                {l.Type === "Udhaar" ? (
                                  <ArrowUpRight size={12} />
                                ) : (
                                  <ArrowDownRight size={12} />
                                )}
                                {l.Type === "Udhaar" ? "Udhaar" : "Payment"}
                              </span>
                            </td>
                            <td
                              className={`py-3 px-3 font-extrabold ${
                                l.Type === "Udhaar"
                                  ? "text-rose-600"
                                  : "text-emerald-600"
                              }`}
                            >
                              {l.Type === "Udhaar" ? "+" : "-"}Rs.{" "}
                              {Number(l.Amount).toLocaleString("en-PK")}
                            </td>
                            <td className="py-3 px-3 text-neutral-600">
                              {l.Note || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-12 text-center bg-neutral-50/60 rounded-xl border border-dashed border-neutral-200">
                    <p className="text-xs font-bold text-neutral-600">
                      Is customer ka koi transaction record nahi hai.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}