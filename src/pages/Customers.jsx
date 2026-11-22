import { useCallback, useEffect, useRef, useState } from "react";
import { Users, UserPlus, Search, Edit3, Trash2, X, Check, Phone, MapPin, RefreshCw } from "lucide-react";

const empty = { name: "", phone: "", address: "" };
const POLL_INTERVAL_MS = 4000;

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  const isFetchingRef = useRef(false);
  const isFormDirtyRef = useRef(false);

  useEffect(() => {
    isFormDirtyRef.current = Boolean(
      editingId || form.name.trim() || form.phone.trim() || form.address.trim()
    );
  }, [editingId, form]);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (!silent) setIsSyncing(true);

    try {
      const data = await window.electronAPI.customers.getAll();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load customers:", err);
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

  const cancelEdit = () => {
    setEditingId(null);
    setForm(empty);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      alert("Customer ka naam likhna lazmi hai!");
      return;
    }
    try {
      if (editingId) {
        await window.electronAPI.customers.update({ ...form, id: editingId });
      } else {
        await window.electronAPI.customers.add(form);
      }
      cancelEdit();
      await load({ silent: true });
    } catch (err) {
      alert("Save nahi hua: " + err.message);
    }
  };

  const startEdit = (c) => {
    setEditingId(c.Id);
    setForm({ name: c.Name, phone: c.Phone || "", address: c.Address || "" });
  };

  const handleDelete = async (id) => {
    if (confirm("Kya aap waqai is customer ko delete karna chahte hain?")) {
      try {
        await window.electronAPI.customers.delete(id);
        if (editingId === id) cancelEdit();
        await load({ silent: true });
      } catch (err) {
        alert("Delete nahi hua: " + err.message);
      }
    }
  };

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      (c.Name && c.Name.toLowerCase().includes(q)) ||
      (c.Phone && c.Phone.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-neutral-900 tracking-tight flex items-center gap-2">
            <Users className="text-neutral-900" size={22} />
            Customer Directory
          </h2>
          <p className="text-xs text-neutral-400 font-medium mt-0.5">
            Dukan ke customers ka record manage karein aur contact details track karein.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => load({ silent: false })}
            className="inline-flex items-center gap-1.5 text-xs font-bold bg-white hover:bg-neutral-50 text-neutral-700 px-3 py-2 rounded-xl border border-neutral-200 shadow-2xs transition-colors cursor-pointer"
            title="Refresh Now"
          >
            <RefreshCw size={13} className={isSyncing ? "animate-spin" : ""} />
            Sync
          </button>

          <div className="text-xs font-bold bg-white px-3.5 py-2 rounded-xl border border-neutral-200 shadow-2xs">
            Total Customers: <span className="text-black font-black">{customers.length}</span>
          </div>
        </div>
      </div>

      {/* Add / Edit Form Card */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-2xs">
        <h3 className="text-sm font-black text-neutral-900 uppercase tracking-wider mb-4 flex items-center gap-2">
          {editingId ? <Edit3 size={16} className="text-blue-600" /> : <UserPlus size={16} className="text-emerald-600" />}
          {editingId ? "Edit Customer Details" : "Add New Customer"}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">Customer Name *</label>
            <input
              type="text"
              name="name"
              placeholder="e.g. Muhammad Ali"
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
              placeholder="e.g. 0300-1234567"
              value={form.phone}
              onChange={handleChange}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">Address / Area</label>
            <input
              type="text"
              name="address"
              placeholder="e.g. North Nazimabad, Karachi"
              value={form.address}
              onChange={handleChange}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 mt-5 pt-4 border-t border-neutral-100">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 bg-black hover:bg-neutral-800 text-white font-bold px-5 py-2.5 rounded-xl text-xs tracking-wide transition-all shadow-sm cursor-pointer"
          >
            <Check size={15} />
            {editingId ? "Update Customer" : "Save Customer"}
          </button>

          {editingId && (
            <button
              onClick={cancelEdit}
              className="flex items-center gap-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold px-4 py-2.5 rounded-xl text-xs transition-all cursor-pointer"
            >
              <X size={15} />
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
          <h3 className="text-sm font-black text-neutral-900 uppercase tracking-wider">Customer Directory List</h3>

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
                  <th className="pb-3 px-4">Customer Name</th>
                  <th className="pb-3 px-4">Phone Number</th>
                  <th className="pb-3 px-4">Address / Area</th>
                  <th className="pb-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50 text-xs">
                {filtered.map((c) => (
                  <tr key={c.Id} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-neutral-900">{c.Name}</td>
                    <td className="py-3.5 px-4 text-neutral-600 font-medium">
                      {c.Phone ? (
                        <span className="inline-flex items-center gap-1.5 text-neutral-700">
                          <Phone size={13} className="text-neutral-400" />
                          {c.Phone}
                        </span>
                      ) : (
                        <span className="text-neutral-300 italic">No phone</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-neutral-600">
                      {c.Address ? (
                        <span className="inline-flex items-center gap-1.5 text-neutral-700">
                          <MapPin size={13} className="text-neutral-400" />
                          {c.Address}
                        </span>
                      ) : (
                        <span className="text-neutral-300 italic">No address</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => startEdit(c)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold rounded-lg transition-colors cursor-pointer"
                        title="Edit Customer"
                      >
                        <Edit3 size={13} /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(c.Id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-lg transition-colors cursor-pointer"
                        title="Delete Customer"
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center bg-neutral-50/60 rounded-xl border border-dashed border-neutral-200">
            <p className="text-xs font-bold text-neutral-600">Koi customer nahi mila!</p>
            <p className="text-[11px] text-neutral-400 mt-0.5">Upar form se naya customer add karein.</p>
          </div>
        )}
      </div>
    </div>
  );
}