const { ipcMain } = require("electron");
const { getPool } = require("../db/connection.cjs");

function registerReportHandlers() {
  // 1. Date Range Sales & Profit Report
  ipcMain.handle("reports:getSalesSummary", async (_e, { startDate, endDate }) => {
    const pool = await getPool();

    const result = await pool.request()
      .input("startDate", startDate)
      .input("endDate", endDate)
      .query(`
        SELECT 
          CAST(i.CreatedAt AS DATE) as SaleDate,
          COUNT(i.Id) as TotalInvoices,
          ISNULL(SUM(i.Total), 0) as TotalSales,
          ISNULL(SUM(i.Paid), 0) as TotalPaid,
          ISNULL(SUM((ii.SalePrice - ii.CostPrice) * ii.Quantity), 0) as TotalProfit
        FROM Invoices i
        LEFT JOIN InvoiceItems ii ON i.Id = ii.InvoiceId
        WHERE CAST(i.CreatedAt AS DATE) BETWEEN @startDate AND @endDate
        GROUP BY CAST(i.CreatedAt AS DATE)
        ORDER BY SaleDate DESC
      `);

    return result.recordset;
  });

  // 2. Date Range Expenses Summary
  ipcMain.handle("reports:getExpensesSummary", async (_e, { startDate, endDate }) => {
    const pool = await getPool();

    const result = await pool.request()
      .input("startDate", startDate)
      .input("endDate", endDate)
      .query(`
        SELECT 
          Title, Category, Amount, Note, ExpenseDate
        FROM Expenses
        WHERE CAST(ExpenseDate AS DATE) BETWEEN @startDate AND @endDate
        ORDER BY ExpenseDate DESC
      `);

    return result.recordset;
  });
}

module.exports = { registerReportHandlers };