const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  appName: "Shop Management System",
  electronVersion: process.versions.electron,
  products: {
    getAll: () => ipcRenderer.invoke("products:getAll"),
    add: (data) => ipcRenderer.invoke("products:add", data),
    update: (data) => ipcRenderer.invoke("products:update", data),
    delete: (id) => ipcRenderer.invoke("products:delete", id),
  },
  customers: {
    getAll: () => ipcRenderer.invoke("customers:getAll"),
    add: (data) => ipcRenderer.invoke("customers:add", data),
    update: (data) => ipcRenderer.invoke("customers:update", data),
    delete: (id) => ipcRenderer.invoke("customers:delete", id),
  },
  udhaar: {
    getBalances: () => ipcRenderer.invoke("udhaar:getBalances"),
    getLedger: (customerId) => ipcRenderer.invoke("udhaar:getLedger", customerId),
    add: (data) => ipcRenderer.invoke("udhaar:add", data),
  },
  expenses: {
    getAll: () => ipcRenderer.invoke("expenses:getAll"),
    add: (data) => ipcRenderer.invoke("expenses:add", data),
    delete: (id) => ipcRenderer.invoke("expenses:delete", id),
  },
  invoices: {
    create: (data) => ipcRenderer.invoke("invoices:create", data),
    getAll: () => ipcRenderer.invoke("invoices:getAll"),
    getDetails: (invoiceId) => ipcRenderer.invoke("invoices:getDetails", invoiceId),
    return: (invoiceId) => ipcRenderer.invoke("invoices:return", invoiceId),
  },
  suppliers: {
    getAll: () => ipcRenderer.invoke("suppliers:getAll"),
    add: (data) => ipcRenderer.invoke("suppliers:add", data),
    pay: (data) => ipcRenderer.invoke("suppliers:pay", data),
    delete: (id) => ipcRenderer.invoke("suppliers:delete", id),
  },
  purchases: {
    getAll: () => ipcRenderer.invoke("purchases:getAll"),
    add: (data) => ipcRenderer.invoke("purchases:add", data),
  },
  dashboard: {
    getStats: () => ipcRenderer.invoke("dashboard:getStats"),
  },
  reports: {
    getSalesSummary: (data) => ipcRenderer.invoke("reports:getSalesSummary", data),
    getExpensesSummary: (data) => ipcRenderer.invoke("reports:getExpensesSummary", data),
  },
  backup: {
    create: () => ipcRenderer.invoke("backup:create"),
    // data = { filePath, adminUser, adminPassword }
    restore: (data) => ipcRenderer.invoke("backup:restore", data),
  },
  dbConfig: {
    get: () => ipcRenderer.invoke("dbconfig:get"),
    test: (config) => ipcRenderer.invoke("dbconfig:test", config),
    save: (config) => ipcRenderer.invoke("dbconfig:save", config),
    reset: () => ipcRenderer.invoke("dbconfig:reset"),
  },
});