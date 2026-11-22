
require("dotenv").config();

const express = require("express");
const { getPool, closePool } = require("./db/connection");

const app = express();

app.use(express.json());

app.get("/api/health", async (req, res) => {
    try {
        const pool = await getPool();

        const result = await pool.request().query(`
            SELECT
                DB_NAME() AS databaseName,
                GETDATE() AS serverTime
        `);

        res.json({
            success: true,
            message: "API and database connected successfully",
            database: result.recordset[0].databaseName,
            serverTime: result.recordset[0].serverTime,
        });

    } catch (error) {
        console.error("Health Check Error:", error);

        res.status(500).json({
            success: false,
            message: "Database connection failed",
        });
    }
});

const PORT = Number(process.env.PORT || 5000);

const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Shop Management API running on port ${PORT}`);
});

async function shutdown() {
    console.log("Shutting down API server...");

    server.close(async () => {
        await closePool();
        process.exit(0);
    });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
