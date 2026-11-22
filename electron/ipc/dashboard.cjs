const { ipcMain } = require("electron");
const { getPool } = require("../db/connection.cjs");

function registerDashboardHandlers() {
  ipcMain.handle("dashboard:getStats", async () => {
    const pool = await getPool();

    // 1. Aaj ki Total Sale aur Profit (Exact schema ke mutabiq)
    const todaySalesResult = await pool.request().query(`
      SELECT 
        ISNULL(SUM(i.Total), 0) as TodaySales,
        ISNULL(SUM((ii.SalePrice - ii.CostPrice) * ii.Quantity), 0) as TodayProfit
      FROM Invoices i
      LEFT JOIN InvoiceItems ii ON i.Id = ii.InvoiceId
      WHERE CAST(i.CreatedAt AS DATE) = CAST(GETDATE() AS DATE)
    `);

    // 2. Aaj ke Total Expenses
    const todayExpensesResult = await pool.request().query(`
      SELECT ISNULL(SUM(Amount), 0) as TodayExpenses
      FROM Expenses
      WHERE CAST(ExpenseDate AS DATE) = CAST(GETDATE() AS DATE)
    `);

    // 3. Low Stock Items (Jinka stock 5 ya us se kam reh gaya ho)
    const lowStockResult = await pool.request().query(`
      SELECT TOP 5 Name, Stock, SalePrice 
      FROM Products 
      WHERE Stock <= 5 
      ORDER BY Stock ASC
    `);

    // 4. Total Customers aur Total Suppliers ki count
    const countsResult = await pool.request().query(`
      SELECT 
        (SELECT COUNT(*) FROM Customers) as TotalCustomers,
        (SELECT COUNT(*) FROM Suppliers) as TotalSuppliers
    `);

    return {
      todaySales: todaySalesResult.recordset[0].TodaySales,
      todayProfit: todaySalesResult.recordset[0].TodayProfit,
      todayExpenses: todayExpensesResult.recordset[0].TodayExpenses,
      lowStockItems: lowStockResult.recordset,
      totalCustomers: countsResult.recordset[0].TotalCustomers,
      totalSuppliers: countsResult.recordset[0].TotalSuppliers,
    };
  });
}

module.exports = { registerDashboardHandlers };