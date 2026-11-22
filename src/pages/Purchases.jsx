import { useCallback, useEffect, useRef, useState } from "react";
import {
  Package,
  Plus,
  Search,
  Edit3,
  Trash2,
  X,
  Check,
  Barcode,
  RefreshCw,
  Building2,
  ShoppingBag,
} from "lucide-react";

const POLL_INTERVAL_MS = 4000;

const emptyForm = {
  name: "",
  barcode: "",
  costPrice: "",
  salePrice: "",
  stock: "",
  supplierId: "",
  paidAmount: "",
  note: "",
};

export default function InventoryAndPurchases() {
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [purchases, setPurchases] = useState([]);

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isFetchingRef = useRef(false);

  const loadAll = useCallback(async ({ silent = false } = {}) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (!silent) setIsSyncing(true);

    try {
      const [prodData, suppData, purData] = await Promise.all([
        window.electronAPI.products.getAll(),
        window.electronAPI.suppliers.getAll(),
        window.electronAPI.purchases.getAll(),
      ]);

      setProducts(Array.isArray(prodData) ? prodData : []);
      setSuppliers(Array.isArray(suppData) ? suppData : []);
      setPurchases(Array.isArray(purData) ? purData : []);
    } catch (err) {
      console.error("Failed to load inventory & purchases:", err);
      if (!silent) {
        alert("Data load nahi hua: " + err.message);
      }
    } finally {
      isFetchingRef.current = false;
      if (!silent) setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    loadAll({ silent: false });

    const intervalId = setInterval(() => {
      if (document.visibilityState === "visible") {
        loadAll({ silent: true });
      }
    }, POLL_INTERVAL_MS);

    const handleFocus = () => {
      loadAll({ silent: true });
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadAll]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const computedTotalPurchase =
    (Number(form.stock) || 0) * (Number(form.costPrice) || 0);

  const handleSave = async () => {
    if (isSaving) return;

    const cleanName = form.name.trim();
    if (!cleanName) {
      return alert("Product ka naam likhna lazmi hai!");
    }

    const costPrice = Number(form.costPrice) || 0;
    const salePrice = Number(form.salePrice) || 0;
    const stock = Number(form.stock) || 0;

    if (costPrice < 0 || salePrice < 0 || stock < 0) {
      return alert("Prices aur stock negative nahi ho sakte!");
    }

    setIsSaving(true);

    try {
      if (editingId) {
        await window.electronAPI.products.update({
          id: editingId,
          name: cleanName,
          barcode: form.barcode.trim() || null,
          costPrice,
          salePrice,
          stock,
        });
        alert("Product update ho gaya!");
      } else {
        if (!form.supplierId) {
          setIsSaving(false);
          return alert("Supplier select karna zaroori hai!");
        }
        if (!(stock > 0)) {
          setIsSaving(false);
          return alert("Stock / Quantity 1 ya us se zyada likhein!");
        }

        const payload = {
          name: cleanName,
          barcode: form.barcode.trim() || null,
          costPrice,
          salePrice,
          stock,
          quantity: stock,
          supplierId: Number(form.supplierId),
          paidAmount: Number(form.paidAmount) || 0,
          note: form.note.trim() || null,
        };

        if (typeof window.electronAPI.products.addWithPurchase === "function") {
          await window.electronAPI.products.addWithPurchase(payload);
        } else {
          await window.electronAPI.purchases.add(payload);
        }

        alert("Product create aur Purchase entry dono save ho gayi!");
      }

      cancelEdit();
      await loadAll({ silent: true });
    } catch (err) {
      if (String(err?.message || "").includes("UX_Products_Barcode")) {
        alert("Yeh barcode pehle se kisi aur product ka hai!");
      } else {
        alert("Save nahi hua: " + (err?.message || err));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit = (p) => {
    setEditingId(p.Id);
    setForm({
      name: p.Name || "",
      barcode: p.Barcode || "",
      costPrice: p.CostPrice ?? "",
      salePrice: p.SalePrice ?? "",
      stock: p.Stock ?? "",
      supplierId: "",
      paidAmount: "",
      note: "",
    });
  };

  const handleDelete = async (id) => {
    if (!confirm("Kya aap waqai is product ko delete karna chahte hain?")) return;

    try {
      await window.electronAPI.products.delete(id);
      if (editingId === id) cancelEdit();
      await loadAll({ silent: true });
    } catch (err) {
      alert("Delete nahi hua: " + (err?.message || err));
    }
  };

  const filteredProducts = products.filter((p) => {
    const q = search.toLowerCase();
    return (
      (p.Name && p.Name.toLowerCase().includes(q)) ||
      (p.Barcode && String(p.Barcode).toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-neutral-900 tracking-tight flex items-center gap-2">
            <Package className="text-neutral-900" size={22} />
            Inventory & Purchase Entry
          </h2>
          <p className="text-xs text-neutral-400 font-medium mt-0.5">
            Ek hi form se naya product banayein, stock/purchase darj karein aur inventory + purchase record dekhein.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => loadAll({ silent: false })}
            className="inline-flex items-center gap-1.5 text-xs font-bold bg-white hover:bg-neutral-50 text-neutral-700 px-3 py-2 rounded-xl border border-neutral-200 shadow-2xs transition-colors cursor-pointer"
            title="Refresh Now"
          >
            <RefreshCw size={13} className={isSyncing ? "animate-spin" : ""} />
            Sync
          </button>

          <div className="text-xs font-bold bg-white px-3.5 py-2 rounded-xl border border-neutral-200 shadow-2xs">
            Total Products:{" "}
            <span className="text-black font-black">{products.length}</span>
          </div>
        </div>
      </div>

      {/* Unified Product + Purchase Form Card */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-sm font-black text-neutral-900 uppercase tracking-wider flex items-center gap-2">
            {editingId ? (
              <>
                <Edit3 size={16} className="text-blue-600" />
                Edit Product Details
              </>
            ) : (
              <>
                <Plus size={16} className="text-emerald-600" />
                New Product & Stock Purchase
              </>
            )}
          </h3>

          {!editingId && (
            <div className="text-xs font-bold bg-neutral-100 px-3.5 py-1.5 rounded-xl text-neutral-800">
              Purchase Total:{" "}
              <span className="font-black text-neutral-950">
                Rs. {computedTotalPurchase.toLocaleString("en-PK")}
              </span>
            </div>
          )}
        </div>

        {/* Row 1: Product Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">
              Product Name *
            </label>
            <input
              type="text"
              name="name"
              placeholder="e.g. Sugar 1kg"
              value={form.name}
              onChange={handleChange}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">
              Barcode
            </label>
            <input
              type="text"
              name="barcode"
              placeholder="Scan or type barcode"
              value={form.barcode}
              onChange={handleChange}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">
              Cost Price (Rs.) *
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              name="costPrice"
              placeholder="0.00"
              value={form.costPrice}
              onChange={handleChange}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">
              Sale Price (Rs.) *
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              name="salePrice"
              placeholder="0.00"
              value={form.salePrice}
              onChange={handleChange}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">
              Stock / Quantity *
            </label>
            <input
              type="number"
              min="0"
              name="stock"
              placeholder="0"
              value={form.stock}
              onChange={handleChange}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all"
            />
          </div>
        </div>

        {/* Row 2: Supplier, Paid Amount, Note (For New Product + Purchase Entry) */}
        {!editingId && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-neutral-100">
            <div>
              <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1 flex items-center gap-1">
                <Building2 size={12} /> Select Supplier *
              </label>
              <select
                name="supplierId"
                value={form.supplierId}
                onChange={handleChange}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-neutral-800 focus:outline-none focus:border-black transition-all"
              >
                <option value="">-- Choose Supplier --</option>
                {suppliers.map((s) => (
                  <option key={s.Id} value={s.Id}>
                    {s.Name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">
                Paid Amount (Rs.)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                name="paidAmount"
                placeholder="0.00"
                value={form.paidAmount}
                onChange={handleChange}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">
                Note / Bill Reference
              </label>
              <input
                type="text"
                name="note"
                placeholder="e.g. Invoice #9921"
                value={form.note}
                onChange={handleChange}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all"
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 pt-4 border-t border-neutral-100">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-black hover:bg-neutral-800 text-white font-bold px-5 py-2.5 rounded-xl text-xs tracking-wide transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            <Check size={15} />
            {isSaving
              ? "Saving..."
              : editingId
              ? "Update Product"
              : "Save Product & Purchase"}
          </button>

          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="flex items-center gap-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold px-4 py-2.5 rounded-xl text-xs transition-all cursor-pointer"
            >
              <X size={15} />
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Inventory Table Section */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
          <h3 className="text-sm font-black text-neutral-900 uppercase tracking-wider">
            Inventory List
          </h3>

          <div className="relative w-full sm:w-80">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
              <Search size={15} />
            </span>
            <input
              type="text"
              placeholder="Naam ya barcode se search karo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all"
            />
          </div>
        </div>

        {filteredProducts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-100 text-[11px] font-black text-neutral-400 uppercase tracking-wider">
                  <th className="pb-3 px-4">Product Name</th>
                  <th className="pb-3 px-4">Barcode</th>
                  <th className="pb-3 px-4">Cost Price</th>
                  <th className="pb-3 px-4">Sale Price</th>
                  <th className="pb-3 px-4">Stock</th>
                  <th className="pb-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50 text-xs">
                {filteredProducts.map((p) => (
                  <tr
                    key={p.Id}
                    className="hover:bg-neutral-50/60 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-bold text-neutral-900">
                      {p.Name}
                    </td>
                    <td className="py-3.5 px-4 text-neutral-600 font-mono text-[11px]">
                      {p.Barcode ? (
                        <span className="inline-flex items-center gap-1.5 bg-neutral-100 px-2 py-0.5 rounded text-neutral-800">
                          <Barcode size={12} className="text-neutral-400" />
                          {p.Barcode}
                        </span>
                      ) : (
                        <span className="text-neutral-300 italic">No barcode</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-neutral-600 font-medium">
                      Rs. {Number(p.CostPrice || 0).toLocaleString("en-PK")}
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-neutral-900">
                      Rs. {Number(p.SalePrice || 0).toLocaleString("en-PK")}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border ${
                          p.Stock <= 5
                            ? "bg-rose-50 text-rose-600 border-rose-100"
                            : "bg-emerald-50 text-emerald-700 border-emerald-100"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            p.Stock <= 5
                              ? "bg-rose-500 animate-pulse"
                              : "bg-emerald-500"
                          }`}
                        />
                        {p.Stock} units
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => startEdit(p)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold rounded-lg transition-colors cursor-pointer"
                        title="Edit Product"
                      >
                        <Edit3 size={13} /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(p.Id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-lg transition-colors cursor-pointer"
                        title="Delete Product"
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
            <p className="text-xs font-bold text-neutral-600">
              Koi product nahi mila!
            </p>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Upar form se naya product add karein.
            </p>
          </div>
        )}
      </div>

      {/* Purchase History Table Section */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-2xs space-y-4">
        <h3 className="text-sm font-black text-neutral-900 uppercase tracking-wider flex items-center gap-2">
          <ShoppingBag size={16} className="text-black" />
          Purchase History ({purchases.length})
        </h3>

        {purchases.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-100 text-[11px] font-black text-neutral-400 uppercase tracking-wider">
                  <th className="pb-3 px-4">ID</th>
                  <th className="pb-3 px-4">Supplier</th>
                  <th className="pb-3 px-4">Total Amount</th>
                  <th className="pb-3 px-4">Paid</th>
                  <th className="pb-3 px-4">Note</th>
                  <th className="pb-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50 text-xs">
                {purchases.map((pur) => (
                  <tr
                    key={pur.Id}
                    className="hover:bg-neutral-50/60 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-extrabold text-neutral-900">
                      #{pur.Id}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-neutral-800">
                      {pur.SupplierName || "-"}
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-neutral-900">
                      Rs. {Number(pur.TotalAmount || 0).toLocaleString("en-PK")}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-emerald-600">
                      Rs. {Number(pur.PaidAmount || 0).toLocaleString("en-PK")}
                    </td>
                    <td className="py-3.5 px-4 text-neutral-600">
                      {pur.Note || "-"}
                    </td>
                    <td className="py-3.5 px-4 text-neutral-500 font-medium">
                      {pur.PurchaseDate
                        ? new Date(pur.PurchaseDate).toLocaleDateString("en-PK")
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center bg-neutral-50/60 rounded-xl border border-dashed border-neutral-200">
            <p className="text-xs font-bold text-neutral-600">
              Koi purchase history nahi mili!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}