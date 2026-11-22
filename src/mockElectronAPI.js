const STORAGE_KEY = "shop_management_demo_v3";

const defaultSeedData = () => {
  const nowIso = new Date().toISOString();
  const todayStr = nowIso.slice(0, 10);

  return {
    products: [
      {
        Id: 1,
        Name: "Panadol 500mg Strip (10 Tabs)",
        Barcode: "8961002001",
        CostPrice: 38,
        SalePrice: 50,
        Stock: 45,
        CreatedAt: nowIso,
      },
      {
        Id: 2,
        Name: "Augmentin 625mg Pack",
        Barcode: "8961002002",
        CostPrice: 410,
        SalePrice: 465,
        Stock: 18,
        CreatedAt: nowIso,
      },
      {
        Id: 3,
        Name: "Risek 20mg Capsule Strip",
        Barcode: "8961002003",
        CostPrice: 245,
        SalePrice: 290,
        Stock: 25,
        CreatedAt: nowIso,
      },
      {
        Id: 4,
        Name: "Sooper Biscuit Half Roll",
        Barcode: "8961002004",
        CostPrice: 32,
        SalePrice: 40,
        Stock: 50,
        CreatedAt: nowIso,
      },
      {
        Id: 5,
        Name: "Cornetto Classic Cone",
        Barcode: "8961002005",
        CostPrice: 115,
        SalePrice: 140,
        Stock: 20,
        CreatedAt: nowIso,
      },
      {
        Id: 6,
        Name: "Coca-Cola 250ml Glass / Can",
        Barcode: "8961002006",
        CostPrice: 62,
        SalePrice: 80,
        Stock: 36,
        CreatedAt: nowIso,
      },
    ],
    customers: [
      {
        Id: 1,
        Name: "Tariq Mehmood",
        Phone: "0300-2145678",
        Address: "Gulshan-e-Iqbal Block 13D, Karachi",
        CreatedAt: nowIso,
      },
      {
        Id: 2,
        Name: "Sanaullah Khan",
        Phone: "0321-8899112",
        Address: "PECHS Block 2, Karachi",
        CreatedAt: nowIso,
      },
    ],
    udhaarLedger: [
      {
        Id: 1,
        CustomerId: 1,
        Type: "Udhaar",
        Amount: 1850,
        Note: "Medicines & cold drinks udhaar",
        InvoiceId: null,
        CreatedAt: nowIso,
      },
      {
        Id: 2,
        CustomerId: 1,
        Type: "Payment",
        Amount: 500,
        Note: "Cash payment received",
        InvoiceId: null,
        CreatedAt: nowIso,
      },
    ],
    invoices: [
      {
        Id: 101,
        CustomerId: 2,
        Total: 625,
        Paid: 625,
        CreatedAt: nowIso,
      },
      {
        Id: 102,
        CustomerId: 2,
        Total: 80,
        Paid: 80,
        CreatedAt: nowIso,
      },
    ],
    invoiceItems: [
      {
        Id: 1,
        InvoiceId: 101,
        ProductId: 2,
        ProductName: "Augmentin 625mg Pack",
        Quantity: 1,
        CostPrice: 410,
        SalePrice: 465,
      },
      {
        Id: 2,
        InvoiceId: 101,
        ProductId: 5,
        ProductName: "Cornetto Classic Cone",
        Quantity: 1,
        CostPrice: 115,
        SalePrice: 140,
      },
      {
        Id: 3,
        InvoiceId: 101,
        ProductId: 4,
        ProductName: "Sooper Biscuit Half Roll",
        Quantity: 1,
        CostPrice: 32,
        SalePrice: 40,
      },
      {
        Id: 4,
        InvoiceId: 102,
        ProductId: 6,
        ProductName: "Coca-Cola 250ml Glass / Can",
        Quantity: 1,
        CostPrice: 62,
        SalePrice: 80,
      },
    ],
    expenses: [
      {
        Id: 1,
        Title: "Freezer & Shop Electricity",
        Category: "Utilities",
        Amount: 1500,
        Note: "Daily operational expense",
        ExpenseDate: todayStr,
        CreatedAt: nowIso,
      },
    ],
    suppliers: [
      {
        Id: 1,
        Name: "Karachi Pharma Distributors",
        Phone: "0333-4455667",
        Address: "Nazimabad Medical Market, Karachi",
        CreatedAt: nowIso,
      },
      {
        Id: 2,
        Name: "United Beverages & Snacks",
        Phone: "0312-9900114",
        Address: "SITE Area, Karachi",
        CreatedAt: nowIso,
      },
    ],
    purchases: [
      {
        Id: 1,
        SupplierId: 1,
        TotalAmount: 14950,
        PaidAmount: 8000,
        Note: "Pharma & daily items restock",
        PurchaseDate: nowIso,
      },
    ],
    purchaseItems: [
      {
        Id: 1,
        PurchaseId: 1,
        ProductId: 2,
        Quantity: 20,
        CostPrice: 410,
      },
      {
        Id: 2,
        PurchaseId: 1,
        ProductId: 1,
        Quantity: 50,
        CostPrice: 38,
      },
      {
        Id: 3,
        PurchaseId: 1,
        ProductId: 6,
        Quantity: 80,
        CostPrice: 62,
      },
    ],
    supplierPayments: [],
    dbConfig: {
      server: "127.0.0.1",
      database: "ShopDB (Demo Mode)",
      port: 1433,
      mode: "demo",
    },
  };
};

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = defaultSeedData();
      writeStore(seeded);
      return seeded;
    }
    const parsed = JSON.parse(raw);
    return {
      ...defaultSeedData(),
      ...parsed,
      products: Array.isArray(parsed.products) ? parsed.products : [],
      customers: Array.isArray(parsed.customers) ? parsed.customers : [],
      udhaarLedger: Array.isArray(parsed.udhaarLedger) ? parsed.udhaarLedger : [],
      invoices: Array.isArray(parsed.invoices) ? parsed.invoices : [],
      invoiceItems: Array.isArray(parsed.invoiceItems) ? parsed.invoiceItems : [],
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
      suppliers: Array.isArray(parsed.suppliers) ? parsed.suppliers : [],
      purchases: Array.isArray(parsed.purchases) ? parsed.purchases : [],
      purchaseItems: Array.isArray(parsed.purchaseItems) ? parsed.purchaseItems : [],
      supplierPayments: Array.isArray(parsed.supplierPayments) ? parsed.supplierPayments : [],
    };
  } catch {
    const seeded = defaultSeedData();
    writeStore(seeded);
    return seeded;
  }
}

function writeStore(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function nextId(list = []) {
  if (!Array.isArray(list) || list.length === 0) return 1;
  return Math.max(...list.map((x) => Number(x.Id) || 0)) + 1;
}

function toDateOnly(val) {
  if (!val) return "";
  const str = String(val);
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  const parsed = new Date(str);
  if (Number.isNaN(parsed.getTime())) return str.slice(0, 10);
  return parsed.toISOString().slice(0, 10);
}

function isWithinRange(dateStr, startDate, endDate) {
  if (!dateStr) return false;
  if (startDate && dateStr < startDate) return false;
  if (endDate && dateStr > endDate) return false;
  return true;
}

function computeCustomerBalance(ledger, customerId) {
  let udhaarSum = 0;
  let paymentSum = 0;
  for (const row of ledger) {
    if (Number(row.CustomerId) === Number(customerId)) {
      if (row.Type === "Udhaar") udhaarSum += Number(row.Amount) || 0;
      if (row.Type === "Payment") paymentSum += Number(row.Amount) || 0;
    }
  }
  return udhaarSum - paymentSum;
}

function computeSupplierBalance(store, supplierId) {
  let purchaseDue = 0;
  for (const p of store.purchases || []) {
    if (Number(p.SupplierId) === Number(supplierId)) {
      const total = Number(p.TotalAmount) || 0;
      const paid = Number(p.PaidAmount) || 0;
      purchaseDue += Math.max(0, total - paid);
    }
  }
  let extraPayments = 0;
  for (const sp of store.supplierPayments || []) {
    if (Number(sp.SupplierId) === Number(supplierId)) {
      extraPayments += Number(sp.Amount) || 0;
    }
  }
  return Math.max(0, purchaseDue - extraPayments);
}

function createProductWithPurchaseInStore(store, payload = {}) {
  const name = String(
    payload.name ?? payload.Name ?? payload.productName ?? ""
  ).trim();
  const rawBarcode = payload.barcode ?? payload.Barcode ?? null;
  const barcode = rawBarcode ? String(rawBarcode).trim() : null;
  const costPrice = Number(payload.costPrice ?? payload.CostPrice ?? 0);
  const salePrice = Number(payload.salePrice ?? payload.SalePrice ?? 0);
  const qty = Number(
    payload.quantity ?? payload.qty ?? payload.stock ?? payload.Stock ?? 0
  );
  const supplierId = Number(payload.supplierId ?? payload.SupplierId);
  const rawPaid = payload.paidAmount ?? payload.PaidAmount;
  const paidAmount = rawPaid === "" || rawPaid == null ? 0 : Number(rawPaid);
  const rawNote = payload.note ?? payload.Note ?? null;
  const note = rawNote ? String(rawNote).trim() : null;

  if (!name) {
    throw new Error("Product ka naam likhna zaroori hai");
  }
  if (!Number.isInteger(supplierId) || supplierId <= 0) {
    throw new Error("Supplier select karna zaroori hai");
  }
  if (!Number.isInteger(qty) || qty <= 0) {
    throw new Error("Stock / Quantity 1 ya us se zyada hona chahiye");
  }
  if (!(costPrice >= 0) || !(salePrice >= 0) || !(paidAmount >= 0)) {
    throw new Error("Amounts valid aur negative nahi hone chahiye");
  }

  if (barcode) {
    const duplicate = store.products.find(
      (p) => String(p.Barcode || "").trim() === barcode
    );
    if (duplicate) {
      throw new Error("UX_Products_Barcode: Duplicate barcode");
    }
  }

  const nowIso = new Date().toISOString();
  const productId = nextId(store.products);

  store.products.push({
    Id: productId,
    Name: name,
    Barcode: barcode,
    CostPrice: costPrice,
    SalePrice: salePrice,
    Stock: qty,
    CreatedAt: nowIso,
  });

  const totalAmount = Number((qty * costPrice).toFixed(2));
  const purchaseId = nextId(store.purchases);

  store.purchases.push({
    Id: purchaseId,
    SupplierId: supplierId,
    TotalAmount: totalAmount,
    PaidAmount: paidAmount,
    Note: note,
    PurchaseDate: nowIso,
  });

  store.purchaseItems.push({
    Id: nextId(store.purchaseItems),
    PurchaseId: purchaseId,
    ProductId: productId,
    Quantity: qty,
    CostPrice: costPrice,
  });

  return {
    success: true,
    productId,
    purchaseId,
    totalAmount,
  };
}

const delay = (ms = 60) => new Promise((res) => setTimeout(res, ms));

export const mockElectronAPI = {
  appName: "Shop Management System (Live Demo)",
  electronVersion: "demo-web",

  products: {
    async getAll() {
      await delay();
      return [...readStore().products].sort(
        (a, b) => Number(b.Id) - Number(a.Id)
      );
    },
    async add(p = {}) {
      await delay();
      const store = readStore();
      const name = String(p.name ?? p.Name ?? "").trim();
      const rawBarcode = p.barcode ?? p.Barcode ?? null;
      const barcode = rawBarcode ? String(rawBarcode).trim() : null;

      if (barcode) {
        const duplicate = store.products.find(
          (item) => String(item.Barcode || "").trim() === barcode
        );
        if (duplicate) {
          throw new Error("UX_Products_Barcode: Duplicate barcode");
        }
      }

      const row = {
        Id: nextId(store.products),
        Name: name,
        Barcode: barcode,
        CostPrice: Number(p.costPrice ?? p.CostPrice ?? 0),
        SalePrice: Number(p.salePrice ?? p.SalePrice ?? 0),
        Stock: Number(p.stock ?? p.Stock ?? 0),
        CreatedAt: new Date().toISOString(),
      };
      store.products.push(row);
      writeStore(store);
      return true;
    },
    async addWithPurchase(data = {}) {
      await delay();
      const store = readStore();
      const result = createProductWithPurchaseInStore(store, data);
      writeStore(store);
      return result;
    },
    async update(p = {}) {
      await delay();
      const store = readStore();
      const id = Number(p.id ?? p.Id);
      const rawBarcode = p.barcode ?? p.Barcode ?? null;
      const barcode =
        p.barcode !== undefined || p.Barcode !== undefined
          ? rawBarcode
            ? String(rawBarcode).trim()
            : null
          : undefined;

      if (barcode) {
        const duplicate = store.products.find(
          (item) =>
            Number(item.Id) !== id &&
            String(item.Barcode || "").trim() === barcode
        );
        if (duplicate) {
          throw new Error("UX_Products_Barcode: Duplicate barcode");
        }
      }

      store.products = store.products.map((item) =>
        Number(item.Id) === id
          ? {
              ...item,
              Name: p.name ?? p.Name ?? item.Name,
              Barcode: barcode !== undefined ? barcode : item.Barcode,
              CostPrice: Number(p.costPrice ?? p.CostPrice ?? item.CostPrice),
              SalePrice: Number(p.salePrice ?? p.SalePrice ?? item.SalePrice),
              Stock: Number(p.stock ?? p.Stock ?? item.Stock),
            }
          : item
      );
      writeStore(store);
      return true;
    },
    async delete(id) {
      await delay();
      const store = readStore();
      store.products = store.products.filter(
        (item) => Number(item.Id) !== Number(id)
      );
      writeStore(store);
      return true;
    },
  },

  customers: {
    async getAll() {
      await delay();
      const store = readStore();
      return [...store.customers]
        .sort((a, b) => Number(b.Id) - Number(a.Id))
        .map((c) => ({
          ...c,
          Balance: computeCustomerBalance(store.udhaarLedger, c.Id),
        }));
    },
    async add(c = {}) {
      await delay();
      const store = readStore();
      store.customers.push({
        Id: nextId(store.customers),
        Name: c.name ?? c.Name ?? "",
        Phone: c.phone ?? c.Phone ?? null,
        Address: c.address ?? c.Address ?? null,
        CreatedAt: new Date().toISOString(),
      });
      writeStore(store);
      return true;
    },
    async update(c = {}) {
      await delay();
      const store = readStore();
      const id = Number(c.id ?? c.Id);
      store.customers = store.customers.map((row) =>
        Number(row.Id) === id
          ? {
              ...row,
              Name: c.name ?? c.Name ?? row.Name,
              Phone: c.phone !== undefined ? c.phone || null : row.Phone,
              Address: c.address !== undefined ? c.address || null : row.Address,
            }
          : row
      );
      writeStore(store);
      return true;
    },
    async delete(id) {
      await delay();
      const store = readStore();
      store.customers = store.customers.filter(
        (row) => Number(row.Id) !== Number(id)
      );
      writeStore(store);
      return true;
    },
  },

  udhaar: {
    async getBalances() {
      await delay();
      const store = readStore();
      return store.customers.map((c) => ({
        CustomerId: c.Id,
        Name: c.Name,
        Phone: c.Phone,
        Address: c.Address,
        Balance: computeCustomerBalance(store.udhaarLedger, c.Id),
      }));
    },
    async getLedger(customerId) {
      await delay();
      const store = readStore();
      const rows = customerId
        ? store.udhaarLedger.filter(
            (r) => Number(r.CustomerId) === Number(customerId)
          )
        : store.udhaarLedger;
      return [...rows].sort((a, b) => Number(b.Id) - Number(a.Id));
    },
    async add(entry = {}) {
      await delay();
      const store = readStore();
      const type = entry.type ?? entry.Type ?? "Udhaar";
      store.udhaarLedger.push({
        Id: nextId(store.udhaarLedger),
        CustomerId: Number(entry.customerId ?? entry.CustomerId),
        Type: type === "Payment" ? "Payment" : "Udhaar",
        Amount: Number(entry.amount ?? entry.Amount ?? 0),
        Note: entry.note ?? entry.Note ?? null,
        InvoiceId: entry.invoiceId ?? entry.InvoiceId ?? null,
        CreatedAt: new Date().toISOString(),
      });
      writeStore(store);
      return true;
    },
  },

  expenses: {
    async getAll() {
      await delay();
      return [...readStore().expenses].sort(
        (a, b) => Number(b.Id) - Number(a.Id)
      );
    },
    async add(e = {}) {
      await delay();
      const store = readStore();
      const nowIso = new Date().toISOString();
      store.expenses.push({
        Id: nextId(store.expenses),
        Title: e.title ?? e.Title ?? "",
        Category: e.category ?? e.Category ?? "General",
        Amount: Number(e.amount ?? e.Amount ?? 0),
        Note: e.note ?? e.Note ?? null,
        ExpenseDate: e.expenseDate ?? e.ExpenseDate ?? nowIso,
        CreatedAt: nowIso,
      });
      writeStore(store);
      return true;
    },
    async delete(id) {
      await delay();
      const store = readStore();
      store.expenses = store.expenses.filter(
        (row) => Number(row.Id) !== Number(id)
      );
      writeStore(store);
      return true;
    },
  },

  invoices: {
    async create(data = {}) {
      await delay();
      const store = readStore();
      const nowIso = new Date().toISOString();
      const customerId = data.customerId ?? data.CustomerId ?? null;
      const total = Number(data.total ?? data.Total ?? 0);
      const paid = Number(data.paid ?? data.Paid ?? total);
      const rawItems = Array.isArray(data.items) ? data.items : [];

      const invoiceId = nextId(store.invoices);
      const invoiceRow = {
        Id: invoiceId,
        CustomerId: customerId ? Number(customerId) : null,
        Total: total,
        Paid: paid,
        CreatedAt: nowIso,
      };
      store.invoices.push(invoiceRow);

      const receiptItems = [];

      for (const item of rawItems) {
        const productId = Number(
          item.productId ?? item.ProductId ?? item.Id ?? item.id
        );
        const qty = Number(item.qty ?? item.quantity ?? item.Quantity ?? 1);
        const prod = store.products.find((p) => Number(p.Id) === productId);
        const name =
          item.productName ??
          item.ProductName ??
          item.name ??
          item.Name ??
          prod?.Name ??
          "Item";
        const costPrice = Number(
          item.costPrice ?? item.CostPrice ?? prod?.CostPrice ?? 0
        );
        const salePrice = Number(
          item.salePrice ?? item.SalePrice ?? item.price ?? prod?.SalePrice ?? 0
        );

        store.invoiceItems.push({
          Id: nextId(store.invoiceItems),
          InvoiceId: invoiceId,
          ProductId: productId,
          ProductName: name,
          Quantity: qty,
          CostPrice: costPrice,
          SalePrice: salePrice,
        });

        receiptItems.push({
          productId,
          name,
          quantity: qty,
          costPrice,
          salePrice,
        });

        if (prod) {
          prod.Stock = Math.max(0, (Number(prod.Stock) || 0) - qty);
        }
      }

      const remaining = Math.max(0, total - paid);
      if (customerId && remaining > 0) {
        store.udhaarLedger.push({
          Id: nextId(store.udhaarLedger),
          CustomerId: Number(customerId),
          Type: "Udhaar",
          Amount: remaining,
          Note: `Invoice #${invoiceId} balance`,
          InvoiceId: invoiceId,
          CreatedAt: nowIso,
        });
      }

      writeStore(store);

      return {
        ...invoiceRow,
        invoiceId,
        customerId: invoiceRow.CustomerId,
        total,
        paid,
        remaining,
        createdAt: nowIso,
        items: receiptItems,
      };
    },
    async getAll() {
      await delay();
      const store = readStore();
      const allItems = Array.isArray(store.invoiceItems) ? store.invoiceItems : [];

      return [...store.invoices]
        .sort((a, b) => Number(b.Id) - Number(a.Id))
        .map((inv) => {
          const cust = store.customers.find(
            (c) => Number(c.Id) === Number(inv.CustomerId)
          );
          const items = allItems.filter(
            (it) => Number(it.InvoiceId) === Number(inv.Id)
          );
          const itemsSummary =
            items.length > 0
              ? items
                  .map(
                    (it) =>
                      `${it.ProductName || it.name || "Item"} ×${
                        it.Quantity || it.quantity || it.qty || 1
                      }`
                  )
                  .join(", ")
              : "";

          return {
            ...inv,
            CustomerName: cust?.Name || "Walk-in",
            items,
            Items: items,
            itemsSummary,
            ItemsSummary: itemsSummary,
          };
        });
    },
    async getDetails(invoiceId) {
      await delay();
      const store = readStore();
      const invoice =
        store.invoices.find((i) => Number(i.Id) === Number(invoiceId)) || null;
      const items = store.invoiceItems.filter(
        (it) => Number(it.InvoiceId) === Number(invoiceId)
      );
      return { invoice, items };
    },
    async return(invoiceId) {
      await delay();
      const store = readStore();
      const items = store.invoiceItems.filter(
        (it) => Number(it.InvoiceId) === Number(invoiceId)
      );
      for (const it of items) {
        const prod = store.products.find(
          (p) => Number(p.Id) === Number(it.ProductId)
        );
        if (prod) {
          prod.Stock = (Number(prod.Stock) || 0) + (Number(it.Quantity) || 0);
        }
      }
      store.invoiceItems = store.invoiceItems.filter(
        (it) => Number(it.InvoiceId) !== Number(invoiceId)
      );
      store.udhaarLedger = store.udhaarLedger.filter(
        (u) => Number(u.InvoiceId) !== Number(invoiceId)
      );
      store.invoices = store.invoices.filter(
        (i) => Number(i.Id) !== Number(invoiceId)
      );
      writeStore(store);
      return true;
    },
  },

  suppliers: {
    async getAll() {
      await delay();
      const store = readStore();
      return [...store.suppliers]
        .sort((a, b) => Number(b.Id) - Number(a.Id))
        .map((s) => ({
          ...s,
          Balance: computeSupplierBalance(store, s.Id),
        }));
    },
    async add(s = {}) {
      await delay();
      const store = readStore();
      store.suppliers.push({
        Id: nextId(store.suppliers),
        Name: s.name ?? s.Name ?? "",
        Phone: s.phone ?? s.Phone ?? null,
        Address: s.address ?? s.Address ?? null,
        CreatedAt: new Date().toISOString(),
      });
      writeStore(store);
      return true;
    },
    async pay(data = {}) {
      await delay();
      const store = readStore();
      store.supplierPayments.push({
        Id: nextId(store.supplierPayments),
        SupplierId: Number(data.supplierId ?? data.SupplierId ?? data.id),
        Amount: Number(data.amount ?? data.Amount ?? 0),
        Note: data.note ?? data.Note ?? null,
        PaymentDate: new Date().toISOString(),
      });
      writeStore(store);
      return true;
    },
    async delete(id) {
      await delay();
      const store = readStore();
      store.suppliers = store.suppliers.filter(
        (s) => Number(s.Id) !== Number(id)
      );
      writeStore(store);
      return true;
    },
  },

  purchases: {
    async getAll() {
      await delay();
      const store = readStore();
      return [...store.purchases]
        .sort((a, b) => Number(b.Id) - Number(a.Id))
        .map((p) => {
          const sup = store.suppliers.find(
            (s) => Number(s.Id) === Number(p.SupplierId)
          );
          return {
            ...p,
            SupplierName: sup?.Name || "",
          };
        });
    },
    async add(p = {}) {
      await delay();
      const store = readStore();
      const hasNewProductFields =
        Boolean(String(p.name ?? p.Name ?? p.productName ?? "").trim()) &&
        !Array.isArray(p.items);

      if (hasNewProductFields) {
        const result = createProductWithPurchaseInStore(store, p);
        writeStore(store);
        return result;
      }

      const nowIso = new Date().toISOString();
      const items = Array.isArray(p.items) ? p.items : [];
      const purchaseId = nextId(store.purchases);

      const totalAmount = Number(
        p.totalAmount ??
          p.TotalAmount ??
          items.reduce((sum, it) => {
            const itemQty =
              Number(it.qty ?? it.quantity ?? it.Quantity ?? 1) || 0;
            const itemCost = Number(it.costPrice ?? it.CostPrice ?? 0) || 0;
            return sum + itemQty * itemCost;
          }, 0)
      );
      const paidAmount = Number(p.paidAmount ?? p.PaidAmount ?? 0);

      store.purchases.push({
        Id: purchaseId,
        SupplierId: Number(p.supplierId ?? p.SupplierId),
        TotalAmount: totalAmount,
        PaidAmount: paidAmount,
        Note: p.note ?? p.Note ?? null,
        PurchaseDate: nowIso,
      });

      for (const item of items) {
        const productId = Number(
          item.productId ?? item.ProductId ?? item.Id ?? item.id
        );
        const qty = Number(item.qty ?? item.quantity ?? item.Quantity ?? 1) || 0;
        const cost = Number(item.costPrice ?? item.CostPrice ?? 0) || 0;

        store.purchaseItems.push({
          Id: nextId(store.purchaseItems),
          PurchaseId: purchaseId,
          ProductId: productId,
          Quantity: qty,
          CostPrice: cost,
        });

        const prod = store.products.find(
          (pr) => Number(pr.Id) === productId
        );
        if (prod) {
          prod.Stock = (Number(prod.Stock) || 0) + qty;
          if (cost > 0) prod.CostPrice = cost;
        }
      }

      writeStore(store);
      return true;
    },
  },

  dashboard: {
    async getStats() {
      await delay();
      const store = readStore();
      const todayStr = new Date().toISOString().slice(0, 10);

      const todayInvoices = store.invoices.filter(
        (i) => toDateOnly(i.CreatedAt) === todayStr
      );
      const todayInvoiceIds = new Set(todayInvoices.map((i) => Number(i.Id)));

      const todaySales = todayInvoices.reduce(
        (s, i) => s + (Number(i.Total) || 0),
        0
      );

      const totalSales = store.invoices.reduce(
        (s, i) => s + (Number(i.Total) || 0),
        0
      );

      const todayExpenses = store.expenses
        .filter((e) => toDateOnly(e.ExpenseDate || e.CreatedAt) === todayStr)
        .reduce((s, e) => s + (Number(e.Amount) || 0), 0);

      const totalExpenses = store.expenses.reduce(
        (s, e) => s + (Number(e.Amount) || 0),
        0
      );

      const todayProfit = (store.invoiceItems || [])
        .filter((it) => todayInvoiceIds.has(Number(it.InvoiceId)))
        .reduce((sum, it) => {
          const prod = store.products.find(
            (p) => Number(p.Id) === Number(it.ProductId)
          );
          const qty = Number(it.Quantity ?? it.quantity ?? 1) || 0;
          const salePrice =
            Number(it.SalePrice ?? it.salePrice ?? prod?.SalePrice ?? 0) || 0;
          const costPrice =
            Number(it.CostPrice ?? it.costPrice ?? prod?.CostPrice ?? 0) || 0;
          return sum + (salePrice - costPrice) * qty;
        }, 0);

      const totalUdhaar = store.customers.reduce(
        (s, c) => s + computeCustomerBalance(store.udhaarLedger, c.Id),
        0
      );

      const totalSupplierDue = store.suppliers.reduce(
        (s, sup) => s + computeSupplierBalance(store, sup.Id),
        0
      );

      const lowStockItems = store.products.filter(
        (p) => Number(p.Stock ?? 0) <= 5
      );

      return {
        todaySales,
        totalSales,
        todayProfit,
        todayExpenses,
        totalExpenses,
        totalUdhaar,
        totalSupplierDue,
        totalProducts: store.products.length,
        totalCustomers: store.customers.length,
        totalSuppliers: store.suppliers.length,
        totalInvoices: store.invoices.length,
        lowStockItems,
      };
    },
  },

  reports: {
    async getSalesSummary(params = {}) {
      await delay();
      const store = readStore();
      const startDate = params.startDate ? toDateOnly(params.startDate) : "";
      const endDate = params.endDate ? toDateOnly(params.endDate) : "";

      const filteredInvoices = store.invoices.filter((inv) =>
        isWithinRange(toDateOnly(inv.CreatedAt), startDate, endDate)
      );

      const invoiceProfitMap = new Map();
      for (const it of store.invoiceItems || []) {
        const invId = Number(it.InvoiceId);
        const prod = store.products.find(
          (p) => Number(p.Id) === Number(it.ProductId)
        );
        const qty = Number(it.Quantity ?? it.quantity ?? 1) || 0;
        const salePrice =
          Number(it.SalePrice ?? it.salePrice ?? prod?.SalePrice ?? 0) || 0;
        const costPrice =
          Number(it.CostPrice ?? it.costPrice ?? prod?.CostPrice ?? 0) || 0;
        const itemProfit = (salePrice - costPrice) * qty;
        invoiceProfitMap.set(
          invId,
          (invoiceProfitMap.get(invId) || 0) + itemProfit
        );
      }

      const groupedByDate = new Map();
      for (const inv of filteredInvoices) {
        const saleDate = toDateOnly(inv.CreatedAt) || "Unknown";
        const current = groupedByDate.get(saleDate) || {
          SaleDate: saleDate,
          TotalInvoices: 0,
          TotalSales: 0,
          TotalPaid: 0,
          TotalProfit: 0,
        };
        current.TotalInvoices += 1;
        current.TotalSales += Number(inv.Total) || 0;
        current.TotalPaid += Number(inv.Paid) || 0;
        current.TotalProfit += invoiceProfitMap.get(Number(inv.Id)) || 0;
        groupedByDate.set(saleDate, current);
      }

      return Array.from(groupedByDate.values()).sort((a, b) =>
        String(b.SaleDate).localeCompare(String(a.SaleDate))
      );
    },
    async getExpensesSummary(params = {}) {
      await delay();
      const store = readStore();
      const startDate = params.startDate ? toDateOnly(params.startDate) : "";
      const endDate = params.endDate ? toDateOnly(params.endDate) : "";

      return [...store.expenses]
        .filter((exp) =>
          isWithinRange(
            toDateOnly(exp.ExpenseDate || exp.CreatedAt),
            startDate,
            endDate
          )
        )
        .sort((a, b) => Number(b.Id) - Number(a.Id));
    },
  },

  backup: {
    async create() {
      await delay();
      return {
        success: true,
        message: "Demo mode: data is saved in browser localStorage.",
      };
    },
    async restore() {
      await delay();
      const fresh = defaultSeedData();
      writeStore(fresh);
      return {
        success: true,
        message: "Demo data reset to initial sample records.",
      };
    },
  },

  dbConfig: {
    async get() {
      await delay();
      return readStore().dbConfig;
    },
    async test(config = {}) {
      await delay();
      return {
        success: true,
        message: `Demo mode active (${config.server || "127.0.0.1"} — browser storage).`,
      };
    },
    async save(config = {}) {
      await delay();
      const store = readStore();
      store.dbConfig = { ...store.dbConfig, ...config };
      writeStore(store);
      return true;
    },
    async reset() {
      await delay();
      const fresh = defaultSeedData();
      writeStore(fresh);
      return true;
    },
  },
};