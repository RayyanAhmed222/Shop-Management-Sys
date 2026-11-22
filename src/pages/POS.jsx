import { useCallback, useEffect, useRef, useState } from "react";
import {
  ShoppingCart,
  Barcode,
  Search,
  Trash2,
  Printer,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

const SHOP_NAME = "MERI DUKAN POS";
const POLL_INTERVAL_MS = 4000;

export default function POS() {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cart, setCart] = useState([]);
  const [barcode, setBarcode] = useState("");
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [customerId, setCustomerId] = useState("");
  const [paid, setPaid] = useState("");
  const [lastInvoice, setLastInvoice] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const barcodeRef = useRef(null);
  const resultItemRefs = useRef([]);
  const isFetchingRef = useRef(false);

  const loadPosData = useCallback(async ({ silent = false } = {}) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (!silent) setIsSyncing(true);

    try {
      const [prodData, custData] = await Promise.all([
        window.electronAPI.products.getAll(),
        window.electronAPI.customers.getAll(),
      ]);

      const freshProducts = Array.isArray(prodData) ? prodData : [];
      const freshCustomers = Array.isArray(custData) ? custData : [];

      setProducts(freshProducts);
      setCustomers(freshCustomers);

      setCart((prevCart) =>
        prevCart.map((item) => {
          const latestProd = freshProducts.find((p) => p.Id === item.product.Id);
          if (!latestProd) return item;
          return {
            ...item,
            product: latestProd,
            quantity:
              latestProd.Stock > 0
                ? Math.min(item.quantity, latestProd.Stock)
                : item.quantity,
          };
        })
      );
    } catch (err) {
      console.error("Failed to sync POS data:", err);
    } finally {
      isFetchingRef.current = false;
      if (!silent) setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    loadPosData({ silent: false });
    barcodeRef.current?.focus();

    const intervalId = setInterval(() => {
      if (document.visibilityState === "visible") {
        loadPosData({ silent: true });
      }
    }, POLL_INTERVAL_MS);

    const handleFocus = () => {
      loadPosData({ silent: true });
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadPosData]);

  const addToCart = useCallback((product) => {
    if (Number(product.Stock) <= 0) {
      alert(`${product.Name} ka stock khatam hai!`);
      return;
    }

    setCart((prev) => {
      const found = prev.find((c) => c.product.Id === product.Id);
      if (found) {
        if (found.quantity + 1 > Number(product.Stock)) {
          alert(`${product.Name} ka sirf ${product.Stock} stock mojood hai.`);
          return prev;
        }
        return prev.map((c) =>
          c.product.Id === product.Id
            ? { ...c, product, quantity: c.quantity + 1 }
            : c
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }, []);

  const changeQty = (id, value) => {
    const q = Number(value);
    if (!(q > 0)) return;
    setCart((prev) =>
      prev.map((c) => {
        if (c.product.Id !== id) return c;
        if (q > Number(c.product.Stock)) {
          alert(`Sirf ${c.product.Stock} stock mojood hai.`);
          return c;
        }
        return { ...c, quantity: q };
      })
    );
  };

  const removeFromCart = (id) =>
    setCart((prev) => prev.filter((c) => c.product.Id !== id));

  const total = cart.reduce(
    (s, c) => s + Number(c.product.SalePrice || 0) * Number(c.quantity || 0),
    0
  );
  const paidValue = paid === "" ? total : Number(paid);
  const remaining = total - paidValue;

  const handleCheckout = useCallback(async () => {
    if (isCheckingOut) return;
    if (cart.length === 0) return alert("Cart khali hai!");
    if (cart.some((c) => !(Number(c.quantity) > 0)))
      return alert("Quantity theek likhein!");
    if (remaining > 0 && !customerId)
      return alert("Udhaar bill ke liye customer select karna lazmi hai!");

    const finalPaid = paid === "" ? total : Number(paid);
    setIsCheckingOut(true);

    try {
      const result = await window.electronAPI.invoices.create({
        customerId: customerId ? Number(customerId) : null,
        total,
        paid: finalPaid,
        items: cart.map((c) => ({
          productId: c.product.Id,
          productName: c.product.Name,
          name: c.product.Name,
          quantity: c.quantity,
          costPrice: Number(c.product.CostPrice || 0),
          salePrice: Number(c.product.SalePrice || 0),
        })),
      });

      const customer = customers.find((c) => c.Id === Number(customerId));
      const fallbackItems = cart.map((c) => ({
        productId: c.product.Id,
        name: c.product.Name,
        quantity: c.quantity,
        salePrice: Number(c.product.SalePrice || 0),
        costPrice: Number(c.product.CostPrice || 0),
      }));

      const invoiceItems =
        Array.isArray(result?.items) && result.items.length > 0
          ? result.items
          : fallbackItems;

      setLastInvoice({
        invoiceId: result?.invoiceId ?? result?.Id ?? Date.now(),
        createdAt: result?.createdAt ?? result?.CreatedAt ?? new Date().toISOString(),
        customerName: customer?.Name || result?.customerName || "",
        total: Number(result?.total ?? result?.Total ?? total),
        paid: Number(result?.paid ?? result?.Paid ?? finalPaid),
        remaining: Math.max(
          0,
          Number(result?.total ?? result?.Total ?? total) -
            Number(result?.paid ?? result?.Paid ?? finalPaid)
        ),
        items: invoiceItems,
      });

      setCart([]);
      setPaid("");
      setCustomerId("");
      await loadPosData({ silent: true });
      barcodeRef.current?.focus();
    } catch (err) {
      alert("Bill nahi ban saka: " + (err?.message || err));
    } finally {
      setIsCheckingOut(false);
    }
  }, [cart, customerId, customers, isCheckingOut, loadPosData, paid, remaining, total]);

  const q = search.trim().toLowerCase();
  const searchResults = q
    ? products
        .filter(
          (p) =>
            (p.Name && p.Name.toLowerCase().includes(q)) ||
            (p.Barcode && String(p.Barcode).toLowerCase().includes(q))
        )
        .slice(0, 6)
    : [];

  useEffect(() => {
    setActiveIndex(0);
    resultItemRefs.current = [];
  }, [q]);

  useEffect(() => {
    const targetEl = resultItemRefs.current[activeIndex];
    if (targetEl) {
      targetEl.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, searchResults.length]);

  const handleBarcodeKey = (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    e.stopPropagation();

    const code = barcode.trim();
    if (!code) {
      if (cart.length > 0) {
        handleCheckout();
      }
      return;
    }

    const product = products.find((p) => String(p.Barcode || "").trim() === code);
    if (product) {
      addToCart(product);
    } else {
      alert("Is barcode ka koi product nahi mila!");
    }
    setBarcode("");
  };

  const handleSearchKey = (e) => {
    if (e.key === "ArrowDown") {
      if (searchResults.length === 0) return;
      e.preventDefault();
      e.stopPropagation();
      setActiveIndex((prev) => (prev + 1) % searchResults.length);
      return;
    }

    if (e.key === "ArrowUp") {
      if (searchResults.length === 0) return;
      e.preventDefault();
      e.stopPropagation();
      setActiveIndex((prev) =>
        prev - 1 < 0 ? searchResults.length - 1 : prev - 1
      );
      return;
    }

    if (e.key === "Escape") {
      setSearch("");
      setActiveIndex(0);
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();

      if (searchResults.length > 0) {
        const chosen =
          searchResults[activeIndex] || searchResults[0];
        addToCart(chosen);
        setSearch("");
        setActiveIndex(0);
        barcodeRef.current?.focus();
      } else if (cart.length > 0) {
        handleCheckout();
      }
    }
  };

  useEffect(() => {
    const onGlobalKeyDown = (e) => {
      if (e.key !== "Enter" || e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) {
        return;
      }

      const tag = e.target?.tagName?.toLowerCase();
      if (tag === "button" || tag === "textarea") return;

      const inputId = e.target?.id;
      if (inputId === "pos-barcode-input" || inputId === "pos-search-input") {
        return;
      }

      if (cart.length > 0) {
        e.preventDefault();
        handleCheckout();
      }
    };

    window.addEventListener("keydown", onGlobalKeyDown);
    return () => window.removeEventListener("keydown", onGlobalKeyDown);
  }, [cart.length, handleCheckout]);

  const receiptItems = Array.isArray(lastInvoice?.items) ? lastInvoice.items : [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #invoice, #invoice * { visibility: visible; }
          #invoice { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Header Title */}
      <div className="no-print flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-neutral-900 tracking-tight flex items-center gap-2">
            <ShoppingCart className="text-neutral-900" size={22} />
            Point of Sale (POS Terminal)
          </h2>
          <p className="text-xs text-neutral-400 font-medium mt-0.5">
            Search mein ↑/↓ arrow se item chunein aur Enter dabane par cart mein add karein; checkout ke liye Enter dabayein.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadPosData({ silent: false })}
          className="inline-flex items-center gap-1.5 text-xs font-bold bg-white hover:bg-neutral-50 text-neutral-700 px-3.5 py-2 rounded-xl border border-neutral-200 shadow-2xs transition-colors cursor-pointer"
          title="Refresh Products & Customers Now"
        >
          <RefreshCw size={13} className={isSyncing ? "animate-spin" : ""} />
          Sync
        </button>
      </div>

      <div className="no-print grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Product Scanner & Search (Cols 1-5) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Barcode Scanner Box */}
          <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs space-y-3">
            <label
              htmlFor="pos-barcode-input"
              className="block text-[11px] font-black text-neutral-500 uppercase tracking-wider flex items-center gap-1.5"
            >
              <Barcode size={15} className="text-black" />
              Barcode Scanner
            </label>
            <input
              id="pos-barcode-input"
              ref={barcodeRef}
              type="text"
              placeholder="Barcode scan karo, phir Enter dabao..."
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onKeyDown={handleBarcodeKey}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all"
            />
          </div>

          {/* Product Search Box */}
          <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs space-y-3 relative">
            <label
              htmlFor="pos-search-input"
              className="block text-[11px] font-black text-neutral-500 uppercase tracking-wider flex items-center gap-1.5"
            >
              <Search size={15} className="text-black" />
              Manual Product Search
            </label>
            <input
              id="pos-search-input"
              type="text"
              placeholder="Product ka naam search karo (↑/↓ + Enter)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKey}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all"
            />

            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute left-5 right-5 top-24 bg-white rounded-xl border border-neutral-200 shadow-xl z-20 max-h-64 overflow-y-auto divide-y divide-neutral-100">
                {searchResults.map((p, idx) => {
                  const isSelected = idx === activeIndex;
                  return (
                    <div
                      key={p.Id}
                      ref={(el) => {
                        resultItemRefs.current[idx] = el;
                      }}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => {
                        addToCart(p);
                        setSearch("");
                        setActiveIndex(0);
                        barcodeRef.current?.focus();
                      }}
                      className={`p-3 cursor-pointer flex justify-between items-center text-xs transition-colors ${
                        isSelected
                          ? "bg-neutral-900 text-white"
                          : "hover:bg-neutral-50 text-neutral-900"
                      }`}
                    >
                      <div>
                        <p
                          className={`font-bold ${
                            isSelected ? "text-white" : "text-neutral-900"
                          }`}
                        >
                          {p.Name}
                        </p>
                        <p
                          className={`text-[10px] ${
                            isSelected ? "text-neutral-300" : "text-neutral-400"
                          }`}
                        >
                          Stock: {p.Stock} units
                        </p>
                      </div>
                      <span
                        className={`font-black ${
                          isSelected ? "text-white" : "text-neutral-900"
                        }`}
                      >
                        Rs. {p.SalePrice}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Cart & Checkout (Cols 6-12) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-neutral-200 shadow-2xs space-y-6">
          <h3 className="text-sm font-black text-neutral-900 uppercase tracking-wider flex items-center gap-2">
            <ShoppingCart size={16} className="text-black" />
            Current Billing Cart ({cart.length} items)
          </h3>

          {/* Cart Table */}
          {cart.length > 0 ? (
            <div className="overflow-x-auto max-h-72 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-100 text-[11px] font-black text-neutral-400 uppercase tracking-wider">
                    <th className="pb-3 px-3">Product</th>
                    <th className="pb-3 px-3">Price</th>
                    <th className="pb-3 px-3">Qty</th>
                    <th className="pb-3 px-3">Total</th>
                    <th className="pb-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50 text-xs">
                  {cart.map((c) => (
                    <tr
                      key={c.product.Id}
                      className="hover:bg-neutral-50/60 transition-colors"
                    >
                      <td className="py-3 px-3 font-bold text-neutral-900">
                        {c.product.Name}
                      </td>
                      <td className="py-3 px-3 text-neutral-600 font-semibold">
                        Rs. {c.product.SalePrice}
                      </td>
                      <td className="py-3 px-3">
                        <input
                          type="number"
                          min="1"
                          value={c.quantity}
                          onChange={(e) => changeQty(c.product.Id, e.target.value)}
                          className="w-16 bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1 text-xs font-bold text-center text-neutral-900 focus:outline-none focus:border-black"
                        />
                      </td>
                      <td className="py-3 px-3 font-extrabold text-neutral-900">
                        Rs. {Number(c.product.SalePrice || 0) * Number(c.quantity || 0)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => removeFromCart(c.product.Id)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
                          title="Remove"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center bg-neutral-50/60 rounded-xl border border-dashed border-neutral-200">
              <p className="text-xs font-bold text-neutral-500">Cart khali hai!</p>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Barcode scan karein ya product search karein.
              </p>
            </div>
          )}

          {/* Cart Total & Checkout Section */}
          <div className="space-y-4 pt-4 border-t border-neutral-100">
            <div className="flex justify-between items-center bg-neutral-900 text-white p-4 rounded-xl shadow-md">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                Total Payable Amount:
              </span>
              <span className="text-2xl font-black tracking-tight">
                Rs. {total}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">
                  Customer (Optional for Udhaar)
                </label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-neutral-800 focus:outline-none focus:border-black"
                >
                  <option value="">Walk-in Customer</option>
                  {customers.map((c) => (
                    <option key={c.Id} value={c.Id}>
                      {c.Name} ({c.Phone || "No Phone"})
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
                  placeholder={`Poore ${total}`}
                  value={paid}
                  onChange={(e) => setPaid(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-black"
                />
              </div>
            </div>

            {remaining > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs font-bold text-amber-800">
                <AlertCircle size={15} className="shrink-0 text-amber-600" />
                <span>Udhaar mein darj hoga: Rs. {remaining}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleCheckout}
              disabled={isCheckingOut}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 size={16} />
              {isCheckingOut ? "Bill Ban Raha Hai..." : "Bill Banao & Checkout (Enter)"}
            </button>
          </div>
        </div>
      </div>

      {/* Invoice Thermal Print Section */}
      {lastInvoice && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-2xs space-y-4 mt-6">
          <div className="no-print flex items-center gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 bg-black hover:bg-neutral-800 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer"
            >
              <Printer size={14} /> Print Invoice
            </button>
            <button
              type="button"
              onClick={() => setLastInvoice(null)}
              className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer"
            >
              Band Karo
            </button>
          </div>

          {/* Thermal Receipt Card */}
          <div
            id="invoice"
            className="w-75 mx-auto p-4 bg-white border border-dashed border-neutral-400 text-neutral-900 font-mono text-xs space-y-3 shadow-sm"
          >
            <div className="text-center space-y-0.5">
              <h3 className="font-black text-sm uppercase tracking-wider">
                {SHOP_NAME}
              </h3>
              <p className="text-[10px] text-neutral-500">
                Invoice #{lastInvoice.invoiceId}
              </p>
              <p className="text-[10px] text-neutral-500">
                {new Date(lastInvoice.createdAt).toLocaleString()}
              </p>
            </div>

            {lastInvoice.customerName && (
              <p className="text-[11px] font-bold border-b border-neutral-200 pb-1">
                Customer: {lastInvoice.customerName}
              </p>
            )}

            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 text-[10px] text-neutral-500">
                  <th className="text-left pb-1">Item x Qty</th>
                  <th className="text-right pb-1">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {receiptItems.map((i, idx) => (
                  <tr key={i.productId ?? idx}>
                    <td className="py-1">
                      {i.name} ×{i.quantity}
                    </td>
                    <td className="py-1 text-right font-bold">
                      {Number(i.salePrice || 0) * Number(i.quantity || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-t border-neutral-300 pt-2 space-y-1 text-xs">
              <div className="flex justify-between font-black">
                <span>Total:</span>
                <span>Rs. {lastInvoice.total}</span>
              </div>
              <div className="flex justify-between">
                <span>Paid (Mile):</span>
                <span>Rs. {lastInvoice.paid}</span>
              </div>
              {Number(lastInvoice.remaining) > 0 && (
                <div className="flex justify-between font-bold text-rose-600">
                  <span>Baqaya (Udhaar):</span>
                  <span>Rs. {lastInvoice.remaining}</span>
                </div>
              )}
            </div>

            <p className="text-center text-[11px] font-bold pt-2 border-t border-dashed border-neutral-300">
              Shukriya! Dobara تشریف لائیں :)
            </p>
          </div>
        </div>
      )}
    </div>
  );
}