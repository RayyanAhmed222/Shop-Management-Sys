const { ipcMain } = require("electron");
const { sql, getPool } = require("../db/connection.cjs");

function registerProductHandlers() {
  ipcMain.handle("products:getAll", async () => {
    const pool = await getPool();
    const result = await pool
      .request()
      .query("SELECT * FROM Products ORDER BY Id DESC");
    return result.recordset;
  });

  ipcMain.handle("products:add", async (_e, p = {}) => {
    const name = String(p.name || "").trim();
    const barcode = p.barcode ? String(p.barcode).trim() : null;
    const costPrice = Number(p.costPrice ?? 0);
    const salePrice = Number(p.salePrice ?? 0);
    const stock = Number(p.stock ?? 0);

    if (!name) {
      throw new Error("Product ka naam likhna zaroori hai");
    }
    if (costPrice < 0 || salePrice < 0 || !Number.isInteger(stock) || stock < 0) {
      throw new Error("Valid prices aur stock enter karein");
    }

    const pool = await getPool();
    await pool
      .request()
      .input("name", sql.NVarChar(150), name)
      .input("barcode", sql.NVarChar(50), barcode || null)
      .input("cost", sql.Decimal(18, 2), costPrice)
      .input("sale", sql.Decimal(18, 2), salePrice)
      .input("stock", sql.Int, stock).query(`
        INSERT INTO Products (Name, Barcode, CostPrice, SalePrice, Stock)
        VALUES (@name, @barcode, @cost, @sale, @stock)
      `);
    return true;
  });

  // Ek hi transaction mein Product create + Purchase & PurchaseItems record
  ipcMain.handle("products:addWithPurchase", async (_e, payload = {}) => {
    const name = String(payload.name || "").trim();
    const barcode = payload.barcode ? String(payload.barcode).trim() : null;
    const costPrice = Number(payload.costPrice);
    const salePrice = Number(payload.salePrice);
    const quantity = Number(payload.quantity ?? payload.stock);
    const supplierId = Number(payload.supplierId);
    const paidAmount =
      payload.paidAmount === "" || payload.paidAmount == null
        ? 0
        : Number(payload.paidAmount);
    const note = payload.note ? String(payload.note).trim() : null;

    if (!name) {
      throw new Error("Product ka naam likhna zaroori hai");
    }
    if (!Number.isInteger(supplierId) || supplierId <= 0) {
      throw new Error("Supplier select karna zaroori hai");
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error("Quantity / Stock 1 ya us se zyada hona chahiye");
    }
    if (!(costPrice >= 0) || !(salePrice >= 0)) {
      throw new Error("Cost price aur sale price valid hona chahiye");
    }
    if (!(paidAmount >= 0)) {
      throw new Error("Paid amount negative nahi ho sakta");
    }

    const totalAmount = Number((quantity * costPrice).toFixed(2));
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      // 1. Product insert karo (initial Stock = quantity)
      const prodReq = new sql.Request(transaction);
      const prodResult = await prodReq
        .input("name", sql.NVarChar(150), name)
        .input("barcode", sql.NVarChar(50), barcode || null)
        .input("cost", sql.Decimal(18, 2), costPrice)
        .input("sale", sql.Decimal(18, 2), salePrice)
        .input("stock", sql.Int, quantity).query(`
          INSERT INTO Products (Name, Barcode, CostPrice, SalePrice, Stock)
          OUTPUT INSERTED.Id
          VALUES (@name, @barcode, @cost, @sale, @stock)
        `);

      const productId = prodResult.recordset[0].Id;

      // 2. Purchases master table mein entry
      const purchaseReq = new sql.Request(transaction);
      const purchaseResult = await purchaseReq
        .input("supplierId", sql.Int, supplierId)
        .input("totalAmount", sql.Decimal(18, 2), totalAmount)
        .input("paidAmount", sql.Decimal(18, 2), paidAmount)
        .input("note", sql.NVarChar(250), note).query(`
          INSERT INTO Purchases (SupplierId, TotalAmount, PaidAmount, Note, PurchaseDate)
          OUTPUT INSERTED.Id
          VALUES (@supplierId, @totalAmount, @paidAmount, @note, GETDATE())
        `);

      const purchaseId = purchaseResult.recordset[0].Id;

      // 3. PurchaseItems mein item record
      const itemReq = new sql.Request(transaction);
      await itemReq
        .input("purchaseId", sql.Int, purchaseId)
        .input("productId", sql.Int, productId)
        .input("qty", sql.Int, quantity)
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
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  });

  ipcMain.handle("products:update", async (_e, p = {}) => {
    const id = Number(p.id);
    const name = String(p.name || "").trim();
    const barcode = p.barcode ? String(p.barcode).trim() : null;
    const costPrice = Number(p.costPrice ?? 0);
    const salePrice = Number(p.salePrice ?? 0);
    const stock = Number(p.stock ?? 0);

    if (!Number.isInteger(id) || id <= 0) {
      throw new Error("Invalid product ID");
    }
    if (!name) {
      throw new Error("Product ka naam likhna zaroori hai");
    }

    const pool = await getPool();
    await pool
      .request()
      .input("id", sql.Int, id)
      .input("name", sql.NVarChar(150), name)
      .input("barcode", sql.NVarChar(50), barcode || null)
      .input("cost", sql.Decimal(18, 2), costPrice)
      .input("sale", sql.Decimal(18, 2), salePrice)
      .input("stock", sql.Int, stock).query(`
        UPDATE Products
        SET Name = @name, Barcode = @barcode,
            CostPrice = @cost, SalePrice = @sale, Stock = @stock
        WHERE Id = @id
      `);
    return true;
  });

  ipcMain.handle("products:delete", async (_e, id) => {
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      throw new Error("Invalid product ID");
    }

    const pool = await getPool();
    await pool
      .request()
      .input("id", sql.Int, numericId)
      .query("DELETE FROM Products WHERE Id = @id");
    return true;
  });
}

module.exports = { registerProductHandlers };