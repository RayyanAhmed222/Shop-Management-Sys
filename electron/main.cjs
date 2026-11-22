process.on('uncaughtException', (error) => {
    console.error("UNCAUGHT EXCEPTION IN ELECTRON:", error);
});

const { app, BrowserWindow } = require("electron");
const path = require("node:path");
const isDev = !app.isPackaged;

const { registerProductHandlers } = require("./ipc/products.cjs");
const { registerCustomerHandlers } = require("./ipc/customers.cjs");
const { registerUdhaarHandlers } = require("./ipc/udhaar.cjs");
const { registerInvoiceHandlers } = require("./ipc/invoices.cjs");
const { registerExpenseHandlers } = require("./ipc/expenses.cjs");
const { registerSupplierHandlers } = require("./ipc/suppliers.cjs");
const { registerPurchaseHandlers } = require("./ipc/purchases.cjs");
const { registerDashboardHandlers } = require("./ipc/dashboard.cjs");
const { registerReportHandlers } = require("./ipc/reports.cjs");
const { registerBackupHandlers } = require("./ipc/backup.cjs");
const { registerDbConfigHandlers } = require("./ipc/dbconfig.cjs");
const { closePool } = require("./db/connection.cjs");

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        title: "Shop Management System",
        webPreferences: {
            preload: path.join(__dirname, "preload.cjs"),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    if (isDev) {
        mainWindow.loadURL("http://127.0.0.1:5173");
        // Dev mode mein F12 dabane ki zaroorat par sakti hai debugging ke liye:
        // mainWindow.webContents.openDevTools();
    } else {
        // Production mode mein index.html load karega relative path ke sath
        const indexPath = path.join(__dirname, "../dist/index.html");
        mainWindow.loadFile(indexPath).catch(err => {
            console.error("Failed to load index.html in production:", err);
        });
    }
}

app.whenReady().then(() => {
    registerDbConfigHandlers();
    registerProductHandlers();
    registerCustomerHandlers();
    registerUdhaarHandlers();
    registerInvoiceHandlers();
    registerExpenseHandlers();
    registerSupplierHandlers();
    registerPurchaseHandlers();
    registerDashboardHandlers();
    registerReportHandlers();
    registerBackupHandlers();
    createWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on("before-quit", () => {
    closePool().catch(() => {});
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});