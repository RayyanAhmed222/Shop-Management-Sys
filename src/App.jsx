import { useState, useEffect, useCallback } from "react";
import Sidebar from "./components/Sidebar.jsx";
import Navbar from "./components/Navbar.jsx";
import DbSetup from "./pages/DbSetup.jsx";
import { Routes, Route, Navigate } from "react-router-dom";

import Dashboard from "./pages/Dashboard.jsx";
import POS from "./pages/POS.jsx";
import Customers from "./pages/Customers.jsx";
import Udhaar from "./pages/Udhaar.jsx";
import Purchases from "./pages/Purchases.jsx";
import Suppliers from "./pages/Suppliers.jsx";
import Expenses from "./pages/Expenses.jsx";
import Reports from "./pages/Reports.jsx";
import InvoiceHistory from "./pages/InvoiceHistory.jsx";
import Backup from "./pages/Backup.jsx";

export const currency = "Rs. ";

export default function App() {
  const [checkingConfig, setCheckingConfig] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [setupError, setSetupError] = useState("");

  const checkDbConfig = useCallback(async () => {
    setCheckingConfig(true);
    try {
      const cfg = await window.electronAPI?.dbConfig?.get?.();
      if (!cfg || !cfg.server) {
        setNeedsSetup(true);
      } else {
        setNeedsSetup(false);
        setSetupError("");
      }
    } catch {
      setNeedsSetup(true);
    } finally {
      setCheckingConfig(false);
    }
  }, []);

  useEffect(() => {
    checkDbConfig();
  }, [checkDbConfig]);

  useEffect(() => {
    function onUnhandledRejection(event) {
      const msg = String(event?.reason?.message || event?.reason || "");
      if (msg.includes("DB_NOT_CONFIGURED")) {
        setSetupError("Database abhi configure nahi hai. Pehle connection details save karein.");
        setNeedsSetup(true);
      }
    }
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => window.removeEventListener("unhandledrejection", onUnhandledRejection);
  }, []);

  if (checkingConfig) {
    return (
      <div className="h-screen w-screen bg-[#f8fafc] flex items-center justify-center text-sm text-neutral-600">
        Loading configuration...
      </div>
    );
  }

  if (needsSetup) {
    return (
      <DbSetup
        initialError={setupError}
        onConfigured={() => {
          setSetupError("");
          setNeedsSetup(false);
        }}
      />
    );
  }

  return (
    <div className="flex h-screen w-screen bg-[#f8fafc] font-sans text-neutral-800 overflow-hidden select-none">
      {/* SIDEBAR */}
      <Sidebar />

      {/* MAIN VIEWPORT */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* NAVBAR */}
        <Navbar />

        {/* CONTENT SCROLLABLE AREA */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-neutral-50/50">
          <div className="max-w-7xl mx-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/pos" element={<POS />} />
              <Route path="/products" element={<Navigate to="/purchases" replace />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/udhaar" element={<Udhaar />} />
              <Route path="/purchases" element={<Purchases />} />
              <Route path="/suppliers" element={<Suppliers />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/history" element={<InvoiceHistory />} />
              <Route path="/backup" element={<Backup />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}