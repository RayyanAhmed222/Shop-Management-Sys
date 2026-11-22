# Shop Management System

A desktop point-of-sale and back-office application for small retail shops, built with **Electron** and **Microsoft SQL Server**. It covers billing, inventory, purchases from suppliers, customer credit (*udhaar*), expenses, reporting, and database backup/restore, all in one app.

---

## Features

- **POS Billing**: create invoices with stock checks, partial payments, and automatic credit entries.
- **Inventory**: manage products with barcode, cost price, sale price, and stock levels.
- **Purchases**: record stock bought from suppliers, either for existing products or by creating a new product in the same step.
- **Suppliers**: track what you owe each supplier (total purchases minus paid amounts minus direct payments).
- **Customers and Udhaar (credit ledger)**: per-customer running balance with full history of credit and payments.
- **Expenses**: record and categorize shop expenses.
- **Dashboard**: today's sales, profit, expenses, low-stock alerts, and customer/supplier counts.
- **Reports**: date-range sales and profit summary, and expense summary.
- **Backup and Restore**: one-click SQL Server backup and admin-authenticated restore.
- **Database configuration**: connect to any SQL Server instance from within the app and test the connection before saving.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | Electron |
| Main process | Node.js (CommonJS, `.cjs` modules) |
| Database | Microsoft SQL Server |
| DB driver | [`mssql`](https://www.npmjs.com/package/mssql) |
| Communication | Electron IPC (`ipcMain.handle` / `ipcRenderer.invoke`) |
| UI | Renderer process (React, per the code comments) |

---

## Architecture

The app follows Electron's main/renderer split. The renderer (UI) never talks to the database directly. It calls named IPC channels, and the main process runs the SQL.

```
┌──────────────┐   ipcRenderer.invoke    ┌────────────────────┐   mssql   ┌──────────────┐
│  Renderer UI │ ──────────────────────► │  Electron Main     │ ────────► │  SQL Server  │
│  (React)     │ ◄────────────────────── │  IPC handlers      │ ◄──────── │  (ShopDB)    │
└──────────────┘      result / error     └────────────────────┘           └──────────────┘
```

Each feature lives in its own handler module and exposes a `register...Handlers()` function that registers its IPC channels at startup.

### Project structure (handlers)

```
main/
├── db/
│   └── connection.cjs        # getPool, closePool, readConfig, saveConfig, testConnection
└── handlers/
    ├── backup.cjs
    ├── customers.cjs
    ├── dashboard.cjs
    ├── dbconfig.cjs
    ├── expenses.cjs
    ├── invoices.cjs
    ├── products.cjs
    ├── purchases.cjs
    ├── reports.cjs
    ├── suppliers.cjs
    └── udhaar.cjs
```

> Adjust folder names to match your actual layout. The handlers import the database layer via `../db/connection.cjs`.

---

## Database

The app uses a SQL Server database named **`ShopDB`**.

| Table | Purpose |
|---|---|
| `Products` | Name, Barcode, CostPrice, SalePrice, Stock |
| `Customers` | Name, Phone, Address |
| `Suppliers` | Name, Phone, Address |
| `Purchases` | SupplierId, TotalAmount, PaidAmount, Note, PurchaseDate |
| `PurchaseItems` | PurchaseId, ProductId, Quantity, CostPrice |
| `SupplierPayments` | SupplierId, Amount, Note |
| `Invoices` | CustomerId, Total, Paid, CreatedAt |
| `InvoiceItems` | InvoiceId, ProductId, ProductName, Quantity, CostPrice, SalePrice |
| `UdhaarLedger` | CustomerId, Type (`Udhaar` or `Payment`), Amount, Note, InvoiceId, CreatedAt |
| `Expenses` | Title, Category, Amount, Note, ExpenseDate |

### Key business rules

- **Prices come from the database.** When creating an invoice, the main process reads cost and sale prices from `Products` instead of trusting values sent by the UI.
- **Stock is locked during billing.** Invoice creation runs in a transaction and uses `UPDLOCK` on product rows to prevent overselling.
- **Udhaar is automatic.** If `Paid < Total`, the remaining amount is written to `UdhaarLedger` as `Udhaar`. A customer is required for any unpaid balance.
- **Customer balance** = sum of `Udhaar` entries minus sum of `Payment` entries.
- **Supplier balance** = total purchases − paid at purchase time − direct `SupplierPayments`.
- **Returns** restore stock, reverse any unpaid credit with a `Payment` ledger entry, and delete the invoice and its items, all in one transaction.
- **Purchases** increase product stock. All multi-step writes (purchase + items + stock) are transactional with rollback on error.

---

## Getting Started

### Prerequisites

- Node.js (LTS recommended)
- Microsoft SQL Server (Express edition is enough) with TCP/IP enabled (default port `1433`)
- A SQL Server login with access to `ShopDB`
- Windows (the backup path defaults to a Windows location)

### Installation

```bash
git clone <your-repo-url>
cd <your-project-folder>
npm install
```

### Database setup

1. Create a database named `ShopDB` on your SQL Server instance.
2. Create the tables listed above (add your schema script, e.g. `db/schema.sql`, to the repository).
3. Ensure the SQL login you plan to use can read and write to `ShopDB`.

### Run

```bash
npm start
```

On first launch, open the **Database Settings** screen, enter your server details, use **Test Connection**, then **Save**.

---

## Configuration

Connection settings are managed from within the app and stored in `db-config.json` inside Electron's `userData` folder. The saved password is never sent back to the UI.

| Channel | Description |
|---|---|
| `dbconfig:get` | Read the saved config (password is blanked) |
| `dbconfig:test` | Test a connection without saving |
| `dbconfig:save` | Validate and save the config |
| `dbconfig:reset` | Close the pool and delete the saved config |

---

## Backup and Restore

- **Backup** writes a timestamped file such as `ShopDB_2026-11-22-14-30.bak` to `C:\ShopBackups` **on the SQL Server machine** (not the client PC). Make sure this folder exists and that the SQL Server service account can write to it.
- **Restore** takes the server-side file path plus SQL admin credentials. It closes the app's connections, sets `ShopDB` to `SINGLE_USER` with immediate rollback, restores with `REPLACE`, and returns it to `MULTI_USER`. If the restore fails, the database is switched back to `MULTI_USER`.

> ⚠️ Restore **overwrites** the current database. Always take a fresh backup first.

---

## IPC API Reference

| Module | Channels |
|---|---|
| **Products** | `products:getAll`, `products:add`, `products:addWithPurchase`, `products:update`, `products:delete` |
| **Customers** | `customers:getAll`, `customers:add`, `customers:update`, `customers:delete` |
| **Suppliers** | `suppliers:getAll`, `suppliers:add`, `suppliers:pay`, `suppliers:delete` |
| **Purchases** | `purchases:getAll`, `purchases:add` |
| **Invoices** | `invoices:create`, `invoices:getAll`, `invoices:getDetails`, `invoices:return` |
| **Udhaar** | `udhaar:getBalances`, `udhaar:getLedger`, `udhaar:add` |
| **Expenses** | `expenses:getAll`, `expenses:add`, `expenses:delete` |
| **Dashboard** | `dashboard:getStats` |
| **Reports** | `reports:getSalesSummary`, `reports:getExpensesSummary` |
| **Backup** | `backup:create`, `backup:restore` |
| **DB Config** | `dbconfig:get`, `dbconfig:test`, `dbconfig:save`, `dbconfig:reset` |

### Example payloads

**Create an invoice**

```js
await window.api.invoke("invoices:create", {
  customerId: 12,          // required only if the invoice is not fully paid
  paid: 500,               // optional; defaults to the full total
  items: [
    { productId: 3, quantity: 2 },
    { productId: 8, quantity: 1 },
  ],
});
// → { invoiceId, createdAt, total, paid, remaining, items }
```

**Pay a supplier**

```js
await window.api.invoke("suppliers:pay", {
  supplierId: 4,
  amount: 2500,
  note: "Cash Payment",
});
```

**Purchase with multiple existing products**

```js
await window.api.invoke("purchases:add", {
  supplierId: 4,
  paidAmount: 1000,
  note: "Weekly stock",
  items: [
    { productId: 3, qty: 24, costPrice: 85 },
    { productId: 8, qty: 12, costPrice: 140 },
  ],
});
```

**Sales report**

```js
await window.api.invoke("reports:getSalesSummary", {
  startDate: "2026-11-01",
  endDate: "2026-11-30",
});
```

> The exact bridge name (`window.api`) depends on your preload script.

---

## Error Handling

Handlers throw descriptive `Error` messages (for example, *"Quantity ghalat hai"* or *"Supplier select karna zaroori hai"*), which propagate to the renderer through the rejected IPC promise. The UI should catch these and display them to the user.

---

## Security Notes

- All SQL uses **parameterized queries**, which protects against SQL injection.
- Invoice prices are read server-side, so the UI cannot tamper with them.
- Database passwords are never returned to the renderer.
- Restore requires explicit SQL admin credentials, which are used only for that operation.

---

## Roadmap Ideas

- Printable receipts and barcode-scanner integration
- User accounts and role-based permissions
- Export reports to PDF or Excel
- Scheduled automatic backups
- Multi-language UI (English / Urdu)

---

## License

Add your license here (for example, MIT).
