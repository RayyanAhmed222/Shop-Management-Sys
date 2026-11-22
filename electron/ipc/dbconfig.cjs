const { ipcMain, app } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { readConfig, testConnection, saveConfig, closePool } = require("../db/connection.cjs");

function registerDbConfigHandlers() {
  ipcMain.handle("dbconfig:get", () => {
    const c = readConfig();
    return c ? { ...c, password: "" } : null;   // password wapas UI ko mat bhejo
  });

  ipcMain.handle("dbconfig:test", async (_e, c) => {
    try { await testConnection(c); return { success: true }; }
    catch (err) { return { success: false, message: err.message }; }
  });

  ipcMain.handle("dbconfig:save", async (_e, c) => {
    try { await saveConfig(c); return { success: true }; }
    catch (err) { return { success: false, message: err.message }; }
  });

  ipcMain.handle("dbconfig:reset", async () => {
    try {
      if (typeof closePool === "function") {
        await closePool();
      }
      // Agar connection.cjs mein db-config.json userData folder mein banta hai:
      const userDataConfig = path.join(app.getPath("userData"), "db-config.json");
      if (fs.existsSync(userDataConfig)) {
        fs.unlinkSync(userDataConfig);
      }
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });
}

module.exports = { registerDbConfigHandlers };