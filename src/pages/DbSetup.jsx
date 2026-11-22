import { useState, useEffect } from "react";
import { toast } from "react-toastify";

const DEFAULT_FORM = {
  server: "",
  port: "1433",
  database: "ShopDB",
  user: "shop_app",
  password: "",
};

export default function DbSetup({ onConfigured, initialError = "" }) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(initialError);
  const [testPassed, setTestPassed] = useState(false);

  useEffect(() => {
    setErrorMsg(initialError || "");
  }, [initialError]);

  useEffect(() => {
    let active = true;
    async function loadExisting() {
      try {
        const existing = await window.electronAPI?.dbConfig?.get?.();
        if (active && existing) {
          setForm({
            server: existing.server || "",
            port: String(existing.port || 1433),
            database: existing.database || "ShopDB",
            user: existing.user || "shop_app",
            password: "", // security ki wajah se password khali rakha hai
          });
        }
      } catch {
        // first run par null aana normal hai
      }
    }
    loadExisting();
    return () => {
      active = false;
    };
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setTestPassed(false);
    setErrorMsg("");
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function validateForm() {
    if (!form.server.trim()) return "Server IP ya Hostname zaroori hai (e.g. 192.168.1.10).";
    if (!form.user.trim()) return "Database Username zaroori hai (e.g. shop_app).";
    if (!form.password) return "Database Password zaroori hai.";
    const portNum = Number(form.port);
    if (!Number.isInteger(portNum) || portNum <= 0 || portNum > 65535) {
      return "Port 1 se 65535 ke darmiyan hona chahiye (default 1433).";
    }
    return "";
  }

  function buildPayload() {
    return {
      server: form.server.trim(),
      port: Number(form.port || 1433),
      database: (form.database || "ShopDB").trim() || "ShopDB",
      user: form.user.trim(),
      password: form.password,
    };
  }

  async function handleTestConnection(e) {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    setTesting(true);
    setErrorMsg("");
    setTestPassed(false);

    try {
      const res = await window.electronAPI.dbConfig.test(buildPayload());
      if (res?.success) {
        setTestPassed(true);
        toast.success("Connection kamyab! Ab Save kar sakte hain.");
      } else {
        setErrorMsg(res?.message || "Database se connection nahi ho saka.");
      }
    } catch (err) {
      setErrorMsg(err?.message || "Connection test mein masla aaya.");
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    const validationError = validateForm();
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    setSaving(true);
    setErrorMsg("");

    try {
      const res = await window.electronAPI.dbConfig.save(buildPayload());
      if (res?.success) {
        toast.success("Database configuration save ho gayi!");
        onConfigured?.();
      } else {
        setErrorMsg(res?.message || "Config save nahi ho saki.");
      }
    } catch (err) {
      setErrorMsg(err?.message || "Config save karte waqt error aaya.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen w-screen bg-[#f8fafc] flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white border border-neutral-200 rounded-2xl shadow-sm p-6 sm:p-8">
        <div className="mb-6">
          <span className="inline-block text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 mb-2">
            First-Run Setup
          </span>
          <h1 className="text-2xl font-bold text-neutral-900">
            Database Server Setup
          </h1>
          <p className="text-sm text-neutral-600 mt-1">
            Apne network ke Server PC ki SQL Server details daalein jahan{" "}
            <span className="font-medium text-neutral-800">ShopDB</span> chal raha hai.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        {testPassed && !errorMsg && (
          <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">
            SQL Server se connection test pass ho gaya hai.
          </div>
        )}

        <form onSubmit={handleTestConnection} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Server IP / Hostname
              </label>
              <input
                type="text"
                name="server"
                value={form.server}
                onChange={handleChange}
                placeholder="e.g. 192.168.1.10 ya SERVER-PC"
                className="w-full px-3.5 py-2 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Port
              </label>
              <input
                type="number"
                name="port"
                value={form.port}
                onChange={handleChange}
                placeholder="1433"
                className="w-full px-3.5 py-2 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Database Name
              </label>
              <input
                type="text"
                name="database"
                value={form.database}
                onChange={handleChange}
                placeholder="ShopDB"
                className="w-full px-3.5 py-2 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                SQL Username
              </label>
              <input
                type="text"
                name="user"
                value={form.user}
                onChange={handleChange}
                placeholder="shop_app"
                className="w-full px-3.5 py-2 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              SQL Password
            </label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="setup.sql mein set kiya gaya password"
              className="w-full px-3.5 py-2 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              disabled={testing || saving}
              className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800 text-sm font-medium transition disabled:opacity-50"
            >
              {testing ? "Testing..." : "Test Connection"}
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={testing || saving}
              className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save & Continue"}
            </button>
          </div>
        </form>

        <p className="text-xs text-neutral-500 mt-5">
          Note: Server PC par SQL Server TCP/IP (Port 1433), Mixed Mode aur Firewall allow hona zaroori hai.
        </p>
      </div>
    </div>
  );
}