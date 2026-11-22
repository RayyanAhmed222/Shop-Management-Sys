const { ipcMain } = require("electron");
const { sql, getPool } = require("../db/connection.cjs");

function registerInvoiceHandlers() {
  // 1. Nayi Invoice create karna (POS Billing)
  ipcMain.handle("invoices:create", async (_e, data) => {
    const { customerId, items } = data;
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("Invoice mein koi product nahi hai");
    }

    const pool = await getPool();
    const tx = new sql.Transaction(pool);
    await tx.begin();

    try {
      let total = 0;
      const lines = [];

      for (const it of items) {
        const qty = Number(it.quantity);
        if (!Number.isInteger(qty) || qty <= 0) {
          throw new Error("Quantity ghalat hai");
        }

        // Price database se uthate hain, React se nahi
        const r = await new sql.Request(tx)
          .input("id", sql.Int, it.productId)
          .query(
            "SELECT Id, Name, CostPrice, SalePrice, Stock FROM Products WITH (UPDLOCK) WHERE Id = @id"
          );
        const p = r.recordset[0];
        if (!p) throw new Error("Product nahi mila");
        if (p.Stock < qty) {
          throw new Error(`${p.Name} ka stock kam hai (sirf ${p.Stock} bacha hai)`);
        }

        await new sql.Request(tx)
          .input("id", sql.Int, p.Id)
          .input("qty", sql.Int, qty)
          .query("UPDATE Products SET Stock = Stock - @qty WHERE Id = @id");

        total += p.SalePrice * qty;
        lines.push({
          productId: p.Id,
          name: p.Name,
          quantity: qty,
          costPrice: p.CostPrice,
          salePrice: p.SalePrice,
        });
      }

      total = Math.round(total * 100) / 100;

      let paid = data.paid === undefined || data.paid === "" ? total : Number(data.paid);
      if (!(paid >= 0) || paid > total) {
        throw new Error("Paid amount total se zyada ya minus nahi ho sakta");
      }
      const remaining = Math.round((total - paid) * 100) / 100;
      if (remaining > 0 && !customerId) {
        throw new Error("Udhaar ke liye customer chuno");
      }

      const inv = await new sql.Request(tx)
        .input("cid", sql.Int, customerId || null)
        .input("total", sql.Decimal(18, 2), total)
        .input("paid", sql.Decimal(18, 2), paid)
        .query(`
          INSERT INTO Invoices (CustomerId, Total, Paid)
          OUTPUT INSERTED.Id, INSERTED.CreatedAt
          VALUES (@cid, @total, @paid)`);
      const invoiceId = inv.recordset[0].Id;
      const createdAt = inv.recordset[0].CreatedAt;

      for (const l of lines) {
        await new sql.Request(tx)
          .input("inv", sql.Int, invoiceId)
          .input("pid", sql.Int, l.productId)
          .input("name", sql.NVarChar, l.name)
          .input("qty", sql.Int, l.quantity)
          .input("cost", sql.Decimal(18, 2), l.costPrice)
          .input("sale", sql.Decimal(18, 2), l.salePrice).query(`
            INSERT INTO InvoiceItems
              (InvoiceId, ProductId, ProductName, Quantity, CostPrice, SalePrice)
            VALUES (@inv, @pid, @name, @qty, @cost, @sale)`);
      }

      if (remaining > 0) {
        await new sql.Request(tx)
          .input("cid", sql.Int, customerId)
          .input("amount", sql.Decimal(18, 2), remaining)
          .input("note", sql.NVarChar, `Invoice #${invoiceId}`)
          .input("inv", sql.Int, invoiceId).query(`
            INSERT INTO UdhaarLedger (CustomerId, Type, Amount, Note, InvoiceId)
            VALUES (@cid, 'Udhaar', @amount, @note, @inv)`);
      }

      await tx.commit();
      return { invoiceId, createdAt, total, paid, remaining, items: lines };
    } catch (err) {
      await tx.rollback();
      throw err;
    }
  });

  // Saari invoices ki list (Items summary ke sath)
  ipcMain.handle("invoices:getAll", async () => {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT i.*, c.Name as CustomerName,
             (
               SELECT TOP 3 STUFF((
                 SELECT ', ' + ii.ProductName + ' (x' + CAST(ii.Quantity AS VARCHAR) + ')'
                 FROM InvoiceItems ii
                 WHERE ii.InvoiceId = i.Id
                 FOR XML PATH('')
               ), 1, 2, '')
             ) as ItemsSummary
      FROM Invoices i
      LEFT JOIN Customers c ON i.CustomerId = c.Id
      ORDER BY i.CreatedAt DESC
    `);
    return result.recordset;
  });

  // 3. Ek specific invoice ki items dekhne ke liye
  ipcMain.handle("invoices:getDetails", async (_e, invoiceId) => {
    const pool = await getPool();
    const result = await pool.request()
      .input("invoiceId", sql.Int, invoiceId)
      .query(`
        SELECT * FROM InvoiceItems WHERE InvoiceId = @invoiceId
      `);
    return result.recordset;
  });

  // 4. Invoice Return (Wapsi / Cancel) karna
  ipcMain.handle("invoices:return", async (_e, invoiceId) => {
    const pool = await getPool();
    const tx = new sql.Transaction(pool);
    await tx.begin();

    try {
      const invCheck = await new sql.Request(tx)
        .input("invoiceId", sql.Int, invoiceId)
        .query("SELECT * FROM Invoices WHERE Id = @invoiceId");

      const invoice = invCheck.recordset[0];
      if (!invoice) throw new Error("Invoice nahi mili!");

      const itemsResult = await new sql.Request(tx)
        .input("invoiceId", sql.Int, invoiceId)
        .query("SELECT * FROM InvoiceItems WHERE InvoiceId = @invoiceId");

      const items = itemsResult.recordset;

      // Stock wapas Products table mein add karna
      for (const item of items) {
        await new sql.Request(tx)
          .input("productId", sql.Int, item.ProductId)
          .input("qty", sql.Int, item.Quantity)
          .query("UPDATE Products SET Stock = Stock + @qty WHERE Id = @productId");
      }

      // Agar udhaar tha toh ledger adjust karna
      if (invoice.CustomerId) {
        const remaining = invoice.Total - invoice.Paid;
        if (remaining > 0) {
          await new sql.Request(tx)
            .input("cid", sql.Int, invoice.CustomerId)
            .input("amount", sql.Decimal(18, 2), remaining)
            .input("note", sql.NVarChar, `Return Invoice #${invoiceId}`)
            .input("inv", sql.Int, invoiceId)
            .query(`
              INSERT INTO UdhaarLedger (CustomerId, Type, Amount, Note, InvoiceId)
              VALUES (@cid, 'Payment', @amount, @note, @inv)
            `);
        }
      }

      // Invoice aur uske items delete karna
      await new sql.Request(tx)
        .input("invoiceId", sql.Int, invoiceId)
        .query("DELETE FROM InvoiceItems WHERE InvoiceId = @invoiceId");

      await new sql.Request(tx)
        .input("invoiceId", sql.Int, invoiceId)
        .query("DELETE FROM Invoices WHERE Id = @invoiceId");

      await tx.commit();
      return true;
    } catch (err) {
      await tx.rollback();
      throw err;
    }
  });
}

module.exports = { registerInvoiceHandlers };