import { useCallback, useEffect, useRef, useState } from "react";
import { History, Search, Eye, RotateCcw, X, Package, RefreshCw } from "lucide-react";

const POLL_INTERVAL_MS = 4000;

export default function InvoiceHistory() {
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  const isFetchingRef = useRef(false);
  const selectedInvoiceIdRef = useRef(null);

  useEffect(() => {
    selectedInvoiceIdRef.current = selectedInvoice?.Id ?? null;
  }, [selectedInvoice]);

  const extractItemsFromDetails = (details) => {
    if (Array.isArray(details)) return details;
    if (details && Array.isArray(details.items)) return details.items;
    if (details && Array.isArray(details.Items)) return details.Items;
    return [];
  };

  const fetchInvoiceDetails = useCallback(async (invoiceId, { silent = false } = {}) => {
    try {
      const details = await window.electronAPI.invoices.getDetails(invoiceId);
      if (selectedInvoiceIdRef.current === invoiceId) {
        setItems(extractItemsFromDetails(details));
      }
    } catch (err) {
      console.error("Failed to load invoice details:", err);
      if (!silent) {
        alert("Details load nahi huin: " + err.message);
      }
    }
  }, []);

  const loadInvoices = useCallback(async ({ silent = false } = {}) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (!silent) setIsSyncing(true);

    try {
      const data = await window.electronAPI.invoices.getAll();
      const list = Array.isArray(data) ? data : [];
      setInvoices(list);

      const activeId = selectedInvoiceIdRef.current;
      if (activeId !== null) {
        const updatedSelected = list.find((inv) => inv.Id === activeId);
        if (updatedSelected) {
          setSelectedInvoice(updatedSelected);
          await fetchInvoiceDetails(activeId, { silent: true });
        } else {
          setSelectedInvoice(null);
          setItems([]);
        }
      }
    } catch (err) {
      console.error("Failed to load invoices:", err);
      if (!silent) {
        alert("Invoices load nahi huin: " + err.message);
      }
    } finally {
      isFetchingRef.current = false;
      if (!silent) setIsSyncing(false);
    }
  }, [fetchInvoiceDetails]);

  useEffect(() => {
    loadInvoices({ silent: false });

    const intervalId = setInterval(() => {
      if (document.visibilityState === "visible") {
        loadInvoices({ silent: true });
      }
    }, POLL_INTERVAL_MS);

    const handleFocus = () => {
      loadInvoices({ silent: true });
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadInvoices]);

  const handleViewDetails = async (inv) => {
    setSelectedInvoice(inv);
    const preloadedItems = Array.isArray(inv?.items)
      ? inv.items
      : Array.isArray(inv?.Items)
      ? inv.Items
      : [];
    setItems(preloadedItems);
    await fetchInvoiceDetails(inv.Id, { silent: false });
  };

  const handleReturnInvoice = async (invoiceId) => {
    if (
      !window.confirm(
        `⚠️ KHABARDAR! Kya aap waqai Invoice #${invoiceId} wapas (Return) karna chahte hain? Iska stock wapas inventory mein add ho jayega.`
      )
    ) {
      return;
    }

    try {
      await window.electronAPI.invoices.return(invoiceId);
      alert("Invoice successfully return ho gayi aur stock adjust ho gaya!");
      setSelectedInvoice(null);
      setItems([]);
      await loadInvoices({ silent: true });
    } catch (err) {
      alert("Return nahi ho saka: " + err.message);
    }
  };

  const getSummaryText = (inv) => {
    if (inv.ItemsSummary) return inv.ItemsSummary;
    if (inv.itemsSummary) return inv.itemsSummary;
    const list = Array.isArray(inv.items) ? inv.items : Array.isArray(inv.Items) ? inv.Items : [];
    if (list.length > 0) {
      return list
        .map(
          (it) =>
            `${it.ProductName || it.name || "Item"} ×${it.Quantity || it.quantity || it.qty || 1}`
        )
        .join(", ");
    }
    return "";
  };

  const filtered = invoices.filter((inv) => {
    const q = search.toLowerCase();
    const summary = getSummaryText(inv).toLowerCase();
    return (
      (inv.Id != null && inv.Id.toString().includes(search)) ||
      (inv.CustomerName && inv.CustomerName.toLowerCase().includes(q)) ||
      summary.includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-neutral-900 tracking-tight flex items-center gap-2">
            <History className="text-neutral-900" size={22} />
            Invoice History & Sales Return
          </h2>
          <p className="text-xs text-neutral-400 font-medium mt-0.5">
            Purane bills ki list, items ki tafseel aur wapsi (Return) ka nizam.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => loadInvoices({ silent: false })}
            className="inline-flex items-center gap-1.5 text-xs font-bold bg-white hover:bg-neutral-50 text-neutral-700 px-3 py-2 rounded-xl border border-neutral-200 shadow-2xs transition-colors cursor-pointer"
            title="Refresh Invoices Now"
          >
            <RefreshCw size={13} className={isSyncing ? "animate-spin" : ""} />
            Sync
          </button>

          <div className="text-xs font-bold bg-white px-3.5 py-2 rounded-xl border border-neutral-200 shadow-2xs">
            Total Invoices: <span className="text-black font-black">{invoices.length}</span>
          </div>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Invoices List Table (Takes 2 cols on lg when open) */}
        <div
          className={`bg-white rounded-2xl border border-neutral-200 p-6 shadow-2xs ${
            selectedInvoice ? "lg:col-span-2" : "lg:col-span-3"
          }`}
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
            <h3 className="text-sm font-black text-neutral-900 uppercase tracking-wider">
              All Issued Invoices
            </h3>

            {/* Search Bar */}
            <div className="relative w-full sm:w-80">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
                <Search size={15} />
              </span>
              <input
                type="text"
                placeholder="Invoice ID, Customer ya Item search karo..."
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
                    <th className="pb-3 px-3">Inv ID</th>
                    <th className="pb-3 px-3">Customer</th>
                    <th className="pb-3 px-3">Items Purchased</th>
                    <th className="pb-3 px-3">Total</th>
                    <th className="pb-3 px-3">Paid</th>
                    <th className="pb-3 px-3">Date</th>
                    <th className="pb-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50 text-xs">
                  {filtered.map((inv) => {
                    const summaryText = getSummaryText(inv);
                    const invItems = Array.isArray(inv.items)
                      ? inv.items
                      : Array.isArray(inv.Items)
                      ? inv.Items
                      : [];

                    return (
                      <tr
                        key={inv.Id}
                        className={`hover:bg-neutral-50/60 transition-colors align-top ${
                          selectedInvoice?.Id === inv.Id ? "bg-neutral-100/80" : ""
                        }`}
                      >
                        <td className="py-3.5 px-3 font-extrabold text-neutral-900 whitespace-nowrap">
                          #{inv.Id}
                        </td>
                        <td className="py-3.5 px-3 font-semibold text-neutral-800 whitespace-nowrap">
                          {inv.CustomerName || (
                            <span className="text-neutral-400 italic">Walk-in</span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-neutral-700 min-w-[220px] max-w-[340px]">
                          {invItems.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {invItems.map((it, idx) => {
                                const name = it.ProductName || it.name || "Item";
                                const qty = it.Quantity || it.quantity || it.qty || 1;
                                return (
                                  <span
                                    key={it.Id ?? `${name}-${idx}`}
                                    className="inline-flex items-center px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-800 text-[11px] font-semibold"
                                  >
                                    {name} ×{qty}
                                  </span>
                                );
                              })}
                            </div>
                          ) : summaryText ? (
                            <p className="text-[11px] font-medium text-neutral-700 leading-relaxed break-words">
                              {summaryText}
                            </p>
                          ) : (
                            <span className="text-neutral-400 italic">No items</span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 font-bold text-neutral-900 whitespace-nowrap">
                          Rs. {Number(inv.Total || 0).toLocaleString("en-PK")}
                        </td>
                        <td className="py-3.5 px-3 font-semibold text-emerald-600 whitespace-nowrap">
                          Rs. {Number(inv.Paid || 0).toLocaleString("en-PK")}
                        </td>
                        <td className="py-3.5 px-3 text-neutral-500 font-medium whitespace-nowrap">
                          {new Date(inv.CreatedAt).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleViewDetails(inv)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-lg transition-colors cursor-pointer text-[11px]"
                          >
                            <Eye size={13} /> View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center bg-neutral-50/60 rounded-xl border border-dashed border-neutral-200">
              <p className="text-xs font-bold text-neutral-600">Koi invoice nahi mili!</p>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Apne search query ya filter ko check karein.
              </p>
            </div>
          )}
        </div>

        {/* Invoice Details & Return Panel (Shows when an invoice is clicked) */}
        {selectedInvoice && (
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-2xs border-t-4 border-t-rose-500 space-y-5 sticky top-6">
            <div className="flex justify-between items-start">
              <div>
                <span className="px-2.5 py-1 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-black tracking-wider uppercase border border-rose-100">
                  Bill Details
                </span>
                <h3 className="text-lg font-black text-neutral-900 mt-1">
                  Invoice #{selectedInvoice.Id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedInvoice(null);
                  setItems([]);
                }}
                className="w-8 h-8 rounded-xl bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="bg-neutral-50 p-4 rounded-xl space-y-2 border border-neutral-200/60 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-500 font-medium">Customer:</span>
                <span className="font-bold text-neutral-800">
                  {selectedInvoice.CustomerName || "Walk-in Customer"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 font-medium">Date & Time:</span>
                <span className="font-semibold text-neutral-700">
                  {new Date(selectedInvoice.CreatedAt).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-neutral-200/60">
                <span className="text-neutral-700 font-bold">Total Amount:</span>
                <span className="font-black text-neutral-900 text-sm">
                  Rs. {Number(selectedInvoice.Total || 0).toLocaleString("en-PK")}
                </span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-black text-neutral-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Package size={14} className="text-neutral-500" />
                Purchased Items ({items.length})
              </h4>
              {items.length > 0 ? (
                <div className="max-h-72 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {items.map((it, idx) => {
                    const name = it.ProductName || it.name || "Item";
                    const qty = Number(it.Quantity ?? it.quantity ?? it.qty ?? 1);
                    const salePrice = Number(it.SalePrice ?? it.salePrice ?? it.price ?? 0);
                    return (
                      <div
                        key={it.Id ?? `${name}-${idx}`}
                        className="flex justify-between items-start gap-3 bg-neutral-50 p-3 rounded-xl border border-neutral-200/60 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-neutral-900 break-words">{name}</p>
                          <p className="text-[11px] text-neutral-500 mt-0.5">
                            Qty: {qty} × Rs. {salePrice.toLocaleString("en-PK")}
                          </p>
                        </div>
                        <p className="font-extrabold text-neutral-900 whitespace-nowrap">
                          Rs. {(salePrice * qty).toLocaleString("en-PK")}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center bg-neutral-50 rounded-xl border border-dashed border-neutral-200 text-xs text-neutral-400">
                  Is bill ke items record nahi mile.
                </div>
              )}
            </div>

            <div className="space-y-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => handleReturnInvoice(selectedInvoice.Id)}
                className="w-full flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 px-4 rounded-xl text-xs tracking-wide transition-all shadow-sm cursor-pointer"
              >
                <RotateCcw size={15} />
                Return / Cancel Bill (⚠️)
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedInvoice(null);
                  setItems([]);
                }}
                className="w-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold py-2.5 px-4 rounded-xl text-xs transition-all cursor-pointer"
              >
                Close Panel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}