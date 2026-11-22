const { ipcMain } = require("electron");
const { sql, getPool, closePool, readConfig } = require("../db/connection.cjs");

const BACKUP_DIR = "C:\\ShopBackups"; // SERVER PC par

function registerBackupHandlers() {
  // 1. Backup
  ipcMain.handle("backup:create", async () => {
    const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 16);
    const file = `${BACKUP_DIR}\\ShopDB_${stamp}.bak`;

    const pool = await getPool();
    await pool
      .request()
      .input("path", sql.NVarChar, file)
      .query("BACKUP DATABASE ShopDB TO DISK = @path WITH INIT;");

    return file; // UI mein dikhao: "Backup server PC par is jagah save hua"
  });

  // 2. Restore
  ipcMain.handle(
    "backup:restore",
    async (_e, { filePath, adminUser, adminPassword }) => {
      const cfg = readConfig();
      await closePool(); // app ki apni connections band

      const admin = await new sql.ConnectionPool({
        user: adminUser,
        password: adminPassword,
        server: cfg.server,
        port: Number(cfg.port || 1433),
        database: "master",
        options: { encrypt: false, trustServerCertificate: true },
        requestTimeout: 300000,
      }).connect();

      try {
        await admin
          .request()
          .input("path", sql.NVarChar, filePath) // SERVER par ka path
          .query(`
            ALTER DATABASE ShopDB SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
            RESTORE DATABASE ShopDB FROM DISK = @path WITH REPLACE;
            ALTER DATABASE ShopDB SET MULTI_USER;
          `);
        return true;
      } catch (err) {
        await admin
          .query("ALTER DATABASE ShopDB SET MULTI_USER;")
          .catch(() => {});
        throw new Error("Restore nahi ho saka: " + err.message);
      } finally {
        await admin.close();
      }
    }
  );
}

module.exports = { registerBackupHandlers };