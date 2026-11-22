const sql = require("mssql");
const fs = require("fs");
const path = require("path");
const { app } = require("electron");

const configPath = () => path.join(app.getPath("userData"), "db-config.json");

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(configPath(), "utf8"));
  } catch {
    return null; // first run
  }
}

function buildConfig(c) {
  return {
    user: c.user,
    password: c.password,
    server: c.server,               // "192.168.1.10" ya "SHOP-PC"
    port: Number(c.port || 1433),
    database: c.database || "ShopDB",
    options: { encrypt: false, trustServerCertificate: true },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
    connectionTimeout: 15000,
    requestTimeout: 30000,
  };
}

let poolPromise;

async function getPool() {
  if (!poolPromise) {
    const saved = readConfig();
    if (!saved) throw new Error("DB_NOT_CONFIGURED");

    const pool = new sql.ConnectionPool(buildConfig(saved));
    pool.on("error", (err) => {
      console.error("SQL Pool Error:", err);
      poolPromise = null;
    });
    poolPromise = pool.connect().catch((err) => {
      poolPromise = null;
      throw err;
    });
  }
  return poolPromise;
}

async function closePool() {
  if (poolPromise) {
    const pool = await poolPromise.catch(() => null);
    poolPromise = null;
    if (pool) await pool.close();
  }
}

// Setup screen ke liye
async function testConnection(c) {
  const pool = await new sql.ConnectionPool(buildConfig(c)).connect();
  await pool.close();
}

async function saveConfig(c) {
  await testConnection(c);                 // pehle test, phir save
  fs.writeFileSync(configPath(), JSON.stringify(c, null, 2));
  await closePool();                       // naye config se reconnect hoga
}

module.exports = { sql, getPool, closePool, readConfig, testConnection, saveConfig };