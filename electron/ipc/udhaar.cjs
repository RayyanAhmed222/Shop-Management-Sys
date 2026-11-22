const { ipcMain } = require("electron");
const { sql, getPool } = require("../db/connection.cjs");

function registerUdhaarHandlers() {
  // Har customer ka baqaya balance
  ipcMain.handle("udhaar:getBalances", async () => {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT c.Id, c.Name, c.Phone,
        ISNULL(SUM(CASE WHEN l.Type = 'Udhaar' THEN l.Amount
                        WHEN l.Type = 'Payment' THEN -l.Amount END), 0) AS Balance
      FROM Customers c
      LEFT JOIN UdhaarLedger l ON l.CustomerId = c.Id
      GROUP BY c.Id, c.Name, c.Phone
      ORDER BY Balance DESC, c.Name`);
    return result.recordset;
  });

  // Ek customer ki poori history
  ipcMain.handle("udhaar:getLedger", async (_e, customerId) => {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("cid", sql.Int, customerId)
      .query(
        "SELECT * FROM UdhaarLedger WHERE CustomerId = @cid ORDER BY CreatedAt DESC, Id DESC"
      );
    return result.recordset;
  });

  // Naya udhaar ya payment
  ipcMain.handle("udhaar:add", async (_e, e) => {
    if (!["Udhaar", "Payment"].includes(e.type)) {
      throw new Error("Type ghalat hai");
    }
    if (!(e.amount > 0)) {
      throw new Error("Amount zero se zyada hona chahiye");
    }
    const pool = await getPool();
    await pool
      .request()
      .input("cid", sql.Int, e.customerId)
      .input("type", sql.NVarChar, e.type)
      .input("amount", sql.Decimal(18, 2), e.amount)
      .input("note", sql.NVarChar, e.note || null).query(`
        INSERT INTO UdhaarLedger (CustomerId, Type, Amount, Note)
        VALUES (@cid, @type, @amount, @note)`);
    return true;
  });
}

module.exports = { registerUdhaarHandlers };