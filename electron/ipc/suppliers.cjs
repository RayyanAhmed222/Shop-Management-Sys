const { ipcMain } = require("electron");
const { sql, getPool } = require("../db/connection.cjs");

function registerSupplierHandlers() {
  // 1. Saare suppliers ki list aur unka accurate balance (Total Purchases - Paid - Direct Payments)
  ipcMain.handle("suppliers:getAll", async () => {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT s.*, 
             (
               ISNULL((SELECT SUM(TotalAmount) FROM Purchases WHERE SupplierId = s.Id), 0)
               - ISNULL((SELECT SUM(PaidAmount) FROM Purchases WHERE SupplierId = s.Id), 0)
               - ISNULL((SELECT SUM(Amount) FROM SupplierPayments WHERE SupplierId = s.Id), 0)
             ) as Balance
      FROM Suppliers s
      ORDER BY s.Id DESC
    `);
    return result.recordset;
  });

  // 2. Naya supplier add karna
  ipcMain.handle("suppliers:add", async (_e, s) => {
    if (!s.name || !s.name.trim()) {
      throw new Error("Supplier ka naam required hai");
    }

    const pool = await getPool();
    await pool.request()
      .input("name", sql.NVarChar(150), s.name.trim())
      .input("phone", sql.NVarChar(50), s.phone ? s.phone.trim() : null)
      .input("address", sql.NVarChar(250), s.address ? s.address.trim() : null)
      .query(`
        INSERT INTO Suppliers (Name, Phone, Address)
        VALUES (@name, @phone, @address)
      `);

    return true;
  });

  // 3. Supplier ko payment dena (Shakeel bhai ke bache hue paise clear karne ke liye)
  ipcMain.handle("suppliers:pay", async (_e, data) => {
    /* data format: { supplierId, amount, note } */
    if (!data.supplierId || !(Number(data.amount) > 0)) {
      throw new Error("Valid supplier aur amount lazmi hai");
    }

    const pool = await getPool();
    await pool.request()
      .input("supplierId", sql.Int, data.supplierId)
      .input("amount", sql.Decimal(18, 2), data.amount)
      .input("note", sql.NVarChar(250), data.note || "Cash Payment")
      .query(`
        INSERT INTO SupplierPayments (SupplierId, Amount, Note)
        VALUES (@supplierId, @amount, @note)
      `);

    return true;
  });

  // 4. Supplier delete karna
  ipcMain.handle("suppliers:delete", async (_e, id) => {
    const pool = await getPool();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query(`DELETE FROM Suppliers WHERE Id = @id`);

    if (result.rowsAffected[0] === 0) {
      throw new Error("Supplier nahi mila");
    }

    return true;
  });
}

module.exports = { registerSupplierHandlers };