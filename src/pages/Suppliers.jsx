import { useCallback, useEffect, useRef, useState } from "react";
import { Building2, UserPlus, Search, Phone, MapPin, Check, X, Wallet, RefreshCw } from "lucide-react";

const POLL_INTERVAL_MS = 4000;
const emptyForm = { name: "", phone: "", address: "" };

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  // Payment Modal State
  const [payModal, setPayModal] = useState(null); // { id, name, balance }
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");

  const isFetchingRef = useRef(false);
  const payModalIdRef = useRef(null);

  useEffect(() => {
    payModalIdRef.current = payModal?.id ?? null;
  }, [payModal]);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (!silent) setIsSyncing(true);

    try {
      const data = await window.electronAPI.suppliers.getAll();
      const list = Array.isArray(data) ? data : [];
      setSuppliers(list);

      const activePayId = payModalIdRef.current;
      if (activePayId != null) {
        const updatedSupplier = list.find((s) => String(s.Id) === String(activePayId));
        if (updatedSupplier) {
          setPayModal((prev) =>
            prev ? { ...prev, name: updatedSupplier.Name, balance: updatedSupplier.Balance } : null
          );
        }
      }
    } catch (err) {
      console.error("Failed to load suppliers:", err);
      if (!silent) {
        alert("Suppliers load nahi huay: " + err.message);
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
    if (!form.name.trim()) return alert("Supplier ka naam likhna zaroori hai!");
    try {
      await window.electronAPI.suppliers.add(form);
      setForm(emptyForm);
      await load({ silent: true });
    } catch (err) {
      alert("Supplier save nahi hua: " + err.message);
    }
  };

  const openPayBox = (supplier) => {
    setPayModal({
      id: supplier.Id,
      name: supplier.Name,
      balance: supplier.Balance,
    });
    setPayAmount("");
    setPayNote("");
  };

  const handleConfirmPayment = async () => {
    const amount = Number(payAmount);
    if (!(amount > 0)) {
      return alert("Valid amount enter karo (0 se zyada)!");
    }

    try {
      await window.electronAPI.suppliers.pay({
        supplierId: Number(payModal.id),
        amount: amount,
        note: payNote.trim() || "Cash Payment",
      });

      alert(`Rs. ${amount} ki payment ${payModal.name} ko record ho gayi!`);
      setPayModal(null);
      await load({ silent: true });
    } catch (err) {
      alert("Payment save nahi hui: " + err.message);
    }
  };

  const filtered = suppliers.filter((s) => {
    const q = search.toLowerCase();
    return (
      (s.Name && s.Name.toLowerCase().includes(q)) ||
      (s.Phone && s.Phone.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-neutral-900 tracking-tight flex items-center gap-2">
            <Building2 className="text-neutral-900" size={22} />
            Suppliers & Khata Management
          </h2>
          <p className="text-xs text-neutral-400 font-medium mt-0.5">
            Dukan ke suppliers ka record, payable balances aur cash payments ka hisaab.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => load({ silent: false })}
            className="inline-flex items-center gap-1.5 text-xs font-bold bg-white hover:bg-neutral-50 text-neutral-700 px-3 py-2 rounded-xl border border-neutral-200 shadow-2xs transition-colors cursor-pointer"
            title="Refresh Suppliers Now"
          >
            <RefreshCw size={13} className={isSyncing ? "animate-spin" : ""} />
            Sync
          </button>

          <div className="text-xs font-bold bg-white px-3.5 py-2 rounded-xl border border-neutral-200 shadow-2xs">
            Total Suppliers: <span className="text-black font-black">{suppliers.length}</span>
          </div>
        </div>
      </div>

      {/* Add New Supplier Card */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-2xs">
        <h3 className="text-sm font-black text-neutral-900 uppercase tracking-wider mb-4 flex items-center gap-2">
          <UserPlus size={16} className="text-emerald-600" />
          Add New Supplier
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">Supplier Name *</label>
            <input
              type="text"
              name="name"
              placeholder="e.g. Al-Madina Traders"
              value={form.name}
              onChange={handleChange}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">Phone Number</label>
            <input
              type="text"
              name="phone"
              placeholder="e.g. 0321-9876543"
              value={form.phone}
              onChange={handleChange}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">Address / Market</label>
            <input
              type="text"
              name="address"
              placeholder="e.g. Jodia Bazaar, Karachi"
              value={form.address}
              onChange={handleChange}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 mt-5 pt-4 border-t border-neutral-100">
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 bg-black hover:bg-neutral-800 text-white font-bold px-5 py-2.5 rounded-xl text-xs tracking-wide transition-all shadow-sm cursor-pointer"
          >
            <Check size={15} />
            Save Supplier
          </button>
        </div>
      </div>

      {/* --- PAYMENT MODAL BOX (Shows when Pay is clicked) --- */}
      {payModal && (
        <div className="bg-emerald-50/80 border-2 border-emerald-500 p-6 rounded-2xl shadow-md space-y-4 max-w-xl">
          <div className="flex justify-between items-start">
            <div>
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-[10px] font-black uppercase tracking-wider">
                Supplier Settlement
              </span>
              <h3 className="text-base font-black text-emerald-900 mt-1">Pay Supplier: {payModal.name}</h3>
            </div>
            <button
              type="button"
              onClick={() => setPayModal(null)}
              className="w-8 h-8 rounded-xl bg-white hover:bg-neutral-100 flex items-center justify-center text-neutral-600 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <div className="bg-white p-4 rounded-xl border border-emerald-200 text-xs flex justify-between items-center">
            <span className="text-neutral-500 font-medium">Current Payable Balance:</span>
            <span className="text-base font-black text-rose-600">
              Rs. {Number(payModal.balance || 0).toLocaleString("en-PK", { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-neutral-600 uppercase mb-1">Payment Amount (Rs.) *</label>
              <input
                type="number"
                min="1"
                placeholder="0.00"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                autoFocus
                className="w-full bg-white border border-emerald-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-neutral-900 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-600 uppercase mb-1">Note / Slip # (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Cash Receipt #42"
                value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
                className="w-full bg-white border border-emerald-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-neutral-800 focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleConfirmPayment}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs tracking-wide transition-all shadow-sm cursor-pointer"
            >
              <Check size={15} />
              Confirm Payment
            </button>
            <button
              type="button"
              onClick={() => setPayModal(null)}
              className="bg-white hover:bg-neutral-100 text-neutral-700 font-bold px-4 py-2.5 rounded-xl text-xs transition-all cursor-pointer border border-neutral-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Supplier List Table Section */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
          <h3 className="text-sm font-black text-neutral-900 uppercase tracking-wider">Supplier Directory & Khata</h3>

          {/* Search Bar */}
          <div className="relative w-full sm:w-72">
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
        </div>

        {filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-100 text-[11px] font-black text-neutral-400 uppercase tracking-wider">
                  <th className="pb-3 px-4">Supplier Name</th>
                  <th className="pb-3 px-4">Phone Number</th>
                  <th className="pb-3 px-4">Address / Market</th>
                  <th className="pb-3 px-4">Payable Balance (Udhaar)</th>
                  <th className="pb-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50 text-xs">
                {filtered.map((s) => (
                  <tr key={s.Id} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-neutral-900">{s.Name}</td>
                    <td className="py-3.5 px-4 text-neutral-600">
                      {s.Phone ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Phone size={12} className="text-neutral-400" />
                          {s.Phone}
                        </span>
                      ) : (
                        <span className="text-neutral-300 italic">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-neutral-600">
                      {s.Address ? (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin size={12} className="text-neutral-400" />
                          {s.Address}
                        </span>
                      ) : (
                        <span className="text-neutral-300 italic">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-extrabold">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold ${
                        Number(s.Balance || 0) > 0
                          ? "bg-rose-50 text-rose-600 border border-rose-100"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                      }`}>
                        Rs. {Number(s.Balance || 0).toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => openPayBox(s)}
                        className="inline-flex items-center gap-1 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors cursor-pointer text-xs shadow-sm"
                      >
                        <Wallet size={13} /> Pay
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center bg-neutral-50/60 rounded-xl border border-dashed border-neutral-200">
            <p className="text-xs font-bold text-neutral-600">Koi supplier nahi mila!</p>
            <p className="text-[11px] text-neutral-400 mt-0.5">Upar form se naya supplier add karein.</p>
          </div>
        )}
      </div>
    </div>
  );
}