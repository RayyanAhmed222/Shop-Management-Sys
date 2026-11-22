const { ipcMain } = require("electron");
const { sql, getPool } = require("../db/connection.cjs");

function registerCustomerHandlers() {
  ipcMain.handle("customers:getAll", async () => {
    const pool = await getPool();
    const result = await pool
      .request()
      .query("SELECT * FROM Customers ORDER BY Name");
    return result.recordset;
  });

  ipcMain.handle("customers:add", async (_e, c) => {
    const pool = await getPool();
    await pool
      .request()
      .input("name", sql.NVarChar, c.name)
      .input("phone", sql.NVarChar, c.phone || null)
      .input("address", sql.NVarChar, c.address || null).query(`
        INSERT INTO Customers (Name, Phone, Address)
        VALUES (@name, @phone, @address)`);
    return true;
  });

  ipcMain.handle("customers:update", async (_e, c) => {
    const pool = await getPool();
    await pool
      .request()
      .input("id", sql.Int, c.id)
      .input("name", sql.NVarChar, c.name)
      .input("phone", sql.NVarChar, c.phone || null)
      .input("address", sql.NVarChar, c.address || null).query(`
        UPDATE Customers
        SET Name = @name, Phone = @phone, Address = @address
        WHERE Id = @id`);
    return true;
  });

  ipcMain.handle("customers:delete", async (_e, id) => {
    const pool = await getPool();
    await pool
      .request()
      .input("id", sql.Int, id)
      .query("DELETE FROM Customers WHERE Id = @id");
    return true;
  });
}

module.exports = { registerCustomerHandlers };