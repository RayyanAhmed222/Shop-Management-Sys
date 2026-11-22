
const sql = require("mssql");
require("dotenv").config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    port: Number(process.env.DB_PORT || 1433),
    database: process.env.DB_NAME,

    options: {
        encrypt: false,
        trustServerCertificate: true,
    },

    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
    },

    connectionTimeout: 15000,
    requestTimeout: 30000,
};

let poolPromise;

async function getPool() {
    if (!poolPromise) {
        const pool = new sql.ConnectionPool(config);

        pool.on("error", (error) => {
            console.error("SQL Pool Error:", error);
            poolPromise = null;
        });

        poolPromise = pool.connect().catch((error) => {
            poolPromise = null;
            throw error;
        });
    }

    return poolPromise;
}

async function closePool() {
    if (poolPromise) {
        const pool = await poolPromise.catch(() => null);
        poolPromise = null;

        if (pool) {
            await pool.close();
        }
    }
}

module.exports = {
    sql,
    getPool,
    closePool,
};
