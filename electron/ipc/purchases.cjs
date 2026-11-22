const { ipcMain } = require("electron");
const { sql, getPool } = require("../db/connection.cjs");

function registerPurchaseHandlers() {
  // Purani purchases ki list
  ipcMain.handle("purchases:getAll", async () => {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT p.*, s.Name as SupplierName
      FROM Purchases p
      LEFT JOIN Suppliers s ON p.SupplierId = s.Id
      ORDER BY p.PurchaseDate DESC, p.Id DESC
    `);
    return result.recordset;
  });

  // Nayi purchase entry (Mal kharida — existing ya naya product dono support)
  ipcMain.handle("purchases:add", async (_e, data = {}) => {
    const supplierId = Number(data.supplierId);
    if (!Number.isInteger(supplierId) || supplierId <= 0) {
      throw new Error("Supplier select karna zaroori hai");
    }

    const paidAmount =
      data.paidAmount === "" || data.paidAmount == null
        ? 0
        : Number(data.paidAmount);
    if (!(paidAmount >= 0)) {
      throw new Error("Paid amount negative nahi ho sakta");
    }

    const note = data.note ? String(data.note).trim() : null;
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      // Case A: Agar seedha ek naya product + stock + purchase aaya ho
      const hasNewProductFields =
        Boolean(String(data.name || data.productName || "").trim()) &&
        !Array.isArray(data.items);

      if (hasNewProductFields) {
        const name = String(data.name || data.productName || "").trim();
        const barcode = data.barcode ? String(data.barcode).trim() : null;
        const costPrice = Number(data.costPrice ?? 0);
        const salePrice = Number(data.salePrice ?? 0);
        const qty = Number(data.quantity ?? data.qty ?? data.stock ?? 0);

        if (!Number.isInteger(qty) || qty <= 0) {
          throw new Error("Quantity / Stock 1 ya us se zyada hona chahiye");
        }
        if (!(costPrice >= 0) || !(salePrice >= 0)) {
          throw new Error("Cost price aur sale price valid hona chahiye");
        }

        const totalAmount = Number((qty * costPrice).toFixed(2));

        const prodReq = new sql.Request(transaction);
        const prodResult = await prodReq
          .input("name", sql.NVarChar(150), name)
          .input("barcode", sql.NVarChar(50), barcode || null)
          .input("cost", sql.Decimal(18, 2), costPrice)
          .input("sale", sql.Decimal(18, 2), salePrice)
          .input("stock", sql.Int, qty).query(`
            INSERT INTO Products (Name, Barcode, CostPrice, SalePrice, Stock)
            OUTPUT INSERTED.Id
            VALUES (@name, @barcode, @cost, @sale, @stock)
          `);

        const productId = prodResult.recordset[0].Id;

        const purchaseReq = new sql.Request(transaction);
        const pResult = await purchaseReq
          .input("supplierId", sql.Int, supplierId)
          .input("totalAmount", sql.Decimal(18, 2), totalAmount)
          .input("paidAmount", sql.Decimal(18, 2), paidAmount)
          .input("note", sql.NVarChar(250), note).query(`
            INSERT INTO Purchases (SupplierId, TotalAmount, PaidAmount, Note, PurchaseDate)
            OUTPUT INSERTED.Id
            VALUES (@supplierId, @totalAmount, @paidAmount, @note, GETDATE())
          `);

        const purchaseId = pResult.recordset[0].Id;

        const itemReq = new sql.Request(transaction);
        await itemReq
          .input("purchaseId", sql.Int, purchaseId)
          .input("productId", sql.Int, productId)
          .input("qty", sql.Int, qty)
          .input("costPrice", sql.Decimal(18, 2), costPrice).query(`
            INSERT INTO PurchaseItems (PurchaseId, ProductId, Quantity, CostPrice)
            VALUES (@purchaseId, @productId, @qty, @costPrice)
          `);

        await transaction.commit();
        return {
          success: true,
          productId,
          purchaseId,
          totalAmount,
        };
      }

      // Case B: Existing items array flow
      if (!Array.isArray(data.items) || data.items.length === 0) {
        throw new Error("Purchase mein kam az kam aik product honi chahiye");
      }

      const totalAmount = data.items.reduce(
        (sum, item) => sum + Number(item.qty || 0) * Number(item.costPrice || 0),
        0
      );

      const purchaseReq = new sql.Request(transaction);
      purchaseReq.input("supplierId", sql.Int, supplierId);
      purchaseReq.input("totalAmount", sql.Decimal(18, 2), totalAmount);
      purchaseReq.input("paidAmount", sql.Decimal(18, 2), paidAmount);
      purchaseReq.input("note", sql.NVarChar(250), note);

      const pResult = await purchaseReq.query(`
        INSERT INTO Purchases (SupplierId, TotalAmount, PaidAmount, Note, PurchaseDate)
        OUTPUT INSERTED.Id
        VALUES (@supplierId, @totalAmount, @paidAmount, @note, GETDATE())
      `);

      const purchaseId = pResult.recordset[0].Id;

      for (const item of data.items) {
        const productId = Number(item.productId);
        const qty = Number(item.qty);
        const costPrice = Number(item.costPrice);

        if (!Number.isInteger(productId) || productId <= 0) {
          throw new Error("Invalid product ID in purchase items");
        }
        if (!Number.isInteger(qty) || qty <= 0) {
          throw new Error("Item quantity 1 ya us se zyada honi chahiye");
        }

        const itemReq = new sql.Request(transaction);
        itemReq.input("purchaseId", sql.Int, purchaseId);
        itemReq.input("productId", sql.Int, productId);
        itemReq.input("qty", sql.Int, qty);
        itemReq.input("costPrice", sql.Decimal(18, 2), costPrice);

        await itemReq.query(`
          INSERT INTO PurchaseItems (PurchaseId, ProductId, Quantity, CostPrice)
          VALUES (@purchaseId, @productId, @qty, @costPrice)
        `);

        const stockReq = new sql.Request(transaction);
        stockReq.input("productId", sql.Int, productId);
        stockReq.input("qty", sql.Int, qty);

        await stockReq.query(`
          UPDATE Products
          SET Stock = Stock + @qty
          WHERE Id = @productId
        `);
      }

      await transaction.commit();
      return true;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  });
}

module.exports = { registerPurchaseHandlers };