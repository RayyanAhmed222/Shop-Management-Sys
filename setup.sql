/* ============================================================
   Shop Management System - setup.sql
   Naye (server) PC par SQL Server Express install hone ke baad
   sirf EK baar chalayein. Dobara chalane se data nahi mitta.

   Chalane ka tareeqa (admin/Windows login se):
     SSMS mein File > Open > yeh file > Execute
   ya Command Prompt (Run as Administrator):
     sqlcmd -S .\SQLEXPRESS -E -i setup.sql

   ZAROORI: neeche @AppPassword ki value apni strong password se badal dein.
   ============================================================ */

USE master;
GO

/* ---------- 1. Database ---------- */
IF DB_ID(N'ShopDB') IS NULL
BEGIN
    CREATE DATABASE [ShopDB];
END
GO

ALTER DATABASE [ShopDB] SET AUTO_CLOSE OFF;   -- server ke liye zaroori
ALTER DATABASE [ShopDB] SET RECOVERY SIMPLE;
GO

/* ---------- 2. Backup folder (server PC par) ---------- */
/* SQL Server khud folder banata hai, to uski permissions khud theek hoti hain */
EXEC master.sys.xp_create_subdir N'C:\ShopBackups';
GO

/* ---------- 3. App login (password yahan badlein) ---------- */
DECLARE @AppPassword NVARCHAR(128) = N'Shop_app_999';

IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'shop_app')
BEGIN
    DECLARE @sql NVARCHAR(MAX) =
        N'CREATE LOGIN [shop_app] WITH PASSWORD = N''' + REPLACE(@AppPassword, '''', '''''') + N''', CHECK_POLICY = ON;';
    EXEC (@sql);
END
GO

/* ---------- 4. Tables ---------- */
USE [ShopDB];
GO

IF OBJECT_ID(N'dbo.Products', N'U') IS NULL
CREATE TABLE dbo.Products (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(150) NOT NULL,
    Barcode NVARCHAR(50) NULL,
    CostPrice DECIMAL(18,2) NOT NULL DEFAULT 0,
    SalePrice DECIMAL(18,2) NOT NULL DEFAULT 0,
    Stock INT NOT NULL DEFAULT 0,
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE()
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_Products_Barcode' AND object_id = OBJECT_ID(N'dbo.Products'))
    CREATE UNIQUE INDEX UX_Products_Barcode ON dbo.Products(Barcode) WHERE Barcode IS NOT NULL;
GO

IF OBJECT_ID(N'dbo.Customers', N'U') IS NULL
CREATE TABLE dbo.Customers (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(150) NOT NULL,
    Phone NVARCHAR(20) NULL,
    Address NVARCHAR(250) NULL,
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE()
);
GO

IF OBJECT_ID(N'dbo.Invoices', N'U') IS NULL
CREATE TABLE dbo.Invoices (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    CustomerId INT NULL FOREIGN KEY REFERENCES dbo.Customers(Id),
    Total DECIMAL(18,2) NOT NULL,
    Paid DECIMAL(18,2) NOT NULL,
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE()
);
GO

IF OBJECT_ID(N'dbo.InvoiceItems', N'U') IS NULL
CREATE TABLE dbo.InvoiceItems (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    InvoiceId INT NOT NULL FOREIGN KEY REFERENCES dbo.Invoices(Id),
    ProductId INT NOT NULL FOREIGN KEY REFERENCES dbo.Products(Id),
    ProductName NVARCHAR(150) NOT NULL,
    Quantity INT NOT NULL CHECK (Quantity > 0),
    CostPrice DECIMAL(18,2) NOT NULL,
    SalePrice DECIMAL(18,2) NOT NULL
);
GO

IF OBJECT_ID(N'dbo.UdhaarLedger', N'U') IS NULL
CREATE TABLE dbo.UdhaarLedger (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    CustomerId INT NOT NULL FOREIGN KEY REFERENCES dbo.Customers(Id),
    Type NVARCHAR(10) NOT NULL CHECK (Type IN ('Udhaar', 'Payment')),
    Amount DECIMAL(18,2) NOT NULL CHECK (Amount > 0),
    Note NVARCHAR(250) NULL,
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
    InvoiceId INT NULL FOREIGN KEY REFERENCES dbo.Invoices(Id)
);
GO

IF OBJECT_ID(N'dbo.Expenses', N'U') IS NULL
CREATE TABLE dbo.Expenses (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Title NVARCHAR(150) NOT NULL,
    Category NVARCHAR(100) NOT NULL,
    Amount DECIMAL(18,2) NOT NULL CHECK (Amount > 0),
    Note NVARCHAR(250) NULL,
    ExpenseDate DATETIME NOT NULL DEFAULT GETDATE(),
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE()
);
GO

IF OBJECT_ID(N'dbo.Suppliers', N'U') IS NULL
CREATE TABLE dbo.Suppliers (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(150) NOT NULL,
    Phone NVARCHAR(50) NULL,
    Address NVARCHAR(250) NULL,
    CreatedAt DATETIME DEFAULT GETDATE()
);
GO

IF OBJECT_ID(N'dbo.Purchases', N'U') IS NULL
CREATE TABLE dbo.Purchases (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    SupplierId INT NOT NULL,
    TotalAmount DECIMAL(18,2) NOT NULL,
    PaidAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
    Note NVARCHAR(250) NULL,
    PurchaseDate DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (SupplierId) REFERENCES dbo.Suppliers(Id)
);
GO

IF OBJECT_ID(N'dbo.PurchaseItems', N'U') IS NULL
CREATE TABLE dbo.PurchaseItems (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    PurchaseId INT NOT NULL,
    ProductId INT NOT NULL,
    Quantity INT NOT NULL,
    CostPrice DECIMAL(18,2) NOT NULL,
    FOREIGN KEY (PurchaseId) REFERENCES dbo.Purchases(Id) ON DELETE CASCADE,
    FOREIGN KEY (ProductId) REFERENCES dbo.Products(Id)
);
GO

IF OBJECT_ID(N'dbo.SupplierPayments', N'U') IS NULL
CREATE TABLE dbo.SupplierPayments (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    SupplierId INT NOT NULL FOREIGN KEY REFERENCES dbo.Suppliers(Id),
    Amount DECIMAL(18,2) NOT NULL CHECK (Amount > 0),
    Note NVARCHAR(250) NULL,
    PaymentDate DATETIME NOT NULL DEFAULT GETDATE()
);
GO

/* ---------- 5. App user ke permissions ---------- */
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'shop_app')
    CREATE USER [shop_app] FOR LOGIN [shop_app] WITH DEFAULT_SCHEMA = [dbo];
GO

ALTER ROLE db_datareader     ADD MEMBER [shop_app];
ALTER ROLE db_datawriter     ADD MEMBER [shop_app];
ALTER ROLE db_backupoperator ADD MEMBER [shop_app];
GO

PRINT 'ShopDB setup mukammal.';
GO
