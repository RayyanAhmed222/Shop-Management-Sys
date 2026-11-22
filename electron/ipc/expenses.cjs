
const { ipcMain } = require("electron");
const { sql, getPool } = require("../db/connection.cjs");

function registerExpenseHandlers() {
  // Saare expenses ki list
  ipcMain.handle("expenses:getAll", async () => {
    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT *
      FROM Expenses
      ORDER BY ExpenseDate DESC, Id DESC
    `);

    return result.recordset;
  });

  // Naya expense add karna
  ipcMain.handle("expenses:add", async (_e, e) => {
    if (!e.title || !e.category) {
      throw new Error("Title aur category required hain");
    }

    if (!(Number(e.amount) > 0)) {
      throw new Error("Amount zero se zyada hona chahiye");
    }

    const pool = await getPool();

    await pool
      .request()
      .input("title", sql.NVarChar(150), e.title.trim())
      .input("category", sql.NVarChar(100), e.category.trim())
      .input("amount", sql.Decimal(18, 2), e.amount)
      .input("note", sql.NVarChar(250), e.note || null)
      .input("date", sql.DateTime, e.expenseDate ? new Date(e.expenseDate) : new Date())
      .query(`
        INSERT INTO Expenses (Title, Category, Amount, Note, ExpenseDate)
        VALUES (@title, @category, @amount, @note, @date)
      `);

    return true;
  });

  // Expense delete karna
  ipcMain.handle("expenses:delete", async (_e, id) => {
    const pool = await getPool();

    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .query(`
        DELETE FROM Expenses
        WHERE Id = @id
      `);

    if (result.rowsAffected[0] === 0) {
      throw new Error("Expense nahi mila");
    }

    return true;
  });
}

module.exports = { registerExpenseHandlers };
