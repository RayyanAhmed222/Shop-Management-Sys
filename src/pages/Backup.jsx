import { useState } from "react";
import { Database, Download, RefreshCw } from "lucide-react";

export default function Backup() {
  const [loading, setLoading] = useState(false);
  const [lastBackup, setLastBackup] = useState("");
  const [restoreNotice, setRestoreNotice] = useState("");

  const [showRestore, setShowRestore] = useState(false);
  const [filePath, setFilePath] = useState("C:\\ShopBackups\\");
  const [adminUser, setAdminUser] = useState("sa");
  const [adminPassword, setAdminPassword] = useState("");

  const openRestoreModal = () => {
    setAdminPassword("");
    setShowRestore(true);
  };

  const closeRestoreModal = () => {
    if (loading) return;
    setAdminPassword("");
    setShowRestore(false);
  };

  const handleBackup = async () => {
    try {
      setLoading(true);
      setRestoreNotice("");
      const savedPath = await window.electronAPI.backup.create();
      if (savedPath) {
        setLastBackup(savedPath);
        alert("Backup server PC par save ho gaya!\n\n" + savedPath);
      }
    } catch (err) {
      alert("Error: " + (err?.message || "Backup nahi ban saka."));
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (e) => {
    e.preventDefault();

    if (!filePath.trim() || !adminUser.trim() || !adminPassword) {
      alert("Backup file ka path, admin user aur admin password zaroori hain.");
      return;
    }

    if (
      !window.confirm(
        "⚠️ KHABARDAR! Purana saara current data khatam ho kar backup wala data load ho jayega. Kya aap confirm hain?"
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      const success = await window.electronAPI.backup.restore({
        filePath: filePath.trim(),
        adminUser: adminUser.trim(),
        adminPassword,
      });
      if (success) {
        setRestoreNotice(
          "Database kamyabi se restore ho gaya! Fresh connection ke liye app band karke dobara kholein."
        );
        setShowRestore(false);
        alert("Database kamyabi se restore ho gaya! App band karke dobara kholein.");
      }
    } catch (err) {
      alert("Error: " + (err?.message || "Restore nahi ho saka."));
    } finally {
      setAdminPassword(""); // password yaad nahi rakhna
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* Header Title */}
      <div>
        <h2 className="text-xl font-black text-neutral-900 tracking-tight flex items-center gap-2">
          <Database className="text-neutral-900" size={22} />
          Database Backup & Restore
        </h2>
        <p className="text-xs text-neutral-400 font-medium mt-0.5">
          Apne dukan ke data ko mehfooz rakhein aur zaroorat parne par wapas laayein:
        </p>
      </div>

      {restoreNotice && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold px-4 py-3 rounded-xl">
          {restoreNotice}
        </div>
      )}

      {/* Backup & Restore Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Backup Card */}
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-2xs flex flex-col justify-between border-t-4 border-t-emerald-500">
          <div>
            <h3 className="text-base font-black text-neutral-900 mb-2">Create Backup</h3>
            <p className="text-xs text-neutral-500 leading-relaxed mb-3">
              Database ki aik{" "}
              <code className="bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-700 font-mono">.bak</code>{" "}
              file <b>server PC</b> ke{" "}
              <code className="bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-700 font-mono">C:\ShopBackups</code>{" "}
              folder mein save hogi.
            </p>
            {lastBackup && (
              <p className="text-xs text-emerald-700 font-semibold mb-4 break-all">
                Last backup: {lastBackup}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleBackup}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl text-xs tracking-wide transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            <Download size={16} />
            {loading ? "Processing..." : "Create Backup"}
          </button>
        </div>

        {/* Restore Card */}
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-2xs flex flex-col justify-between border-t-4 border-t-rose-500">
          <div>
            <h3 className="text-base font-black text-neutral-900 mb-2">Restore Database</h3>
            <p className="text-xs text-neutral-500 leading-relaxed mb-6">
              Server PC par pehle se bani hui{" "}
              <code className="bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-700 font-mono">.bak</code>{" "}
              file ka path de kar data wapas restore karein. Is ke liye admin password chahiye hoga.
            </p>
          </div>
          <button
            type="button"
            onClick={openRestoreModal}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 px-4 rounded-xl text-xs tracking-wide transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={16} />
            Restore Database Backup
          </button>
        </div>
      </div>

      {/* Restore Modal */}
      {showRestore && (
        <div
          onClick={closeRestoreModal}
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
        >
          <form
            onSubmit={handleRestore}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-neutral-200 shadow-xl p-6 w-full max-w-md space-y-4 border-t-4 border-t-rose-500"
          >
            <div>
              <h3 className="text-base font-black text-neutral-900">Restore Database</h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Admin ki details sirf is restore ke liye use hongi, save nahi hongi.
              </p>
            </div>

            <label className="block text-xs font-bold text-neutral-700">
              Backup file ka path (server PC par)
              <input
                className="mt-1 w-full border border-neutral-200 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:border-neutral-900"
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                placeholder="C:\ShopBackups\ShopDB_2026-11-19-10-30.bak"
              />
            </label>

            <label className="block text-xs font-bold text-neutral-700">
              Admin user
              <input
                className="mt-1 w-full border border-neutral-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-neutral-900"
                value={adminUser}
                onChange={(e) => setAdminUser(e.target.value)}
              />
            </label>

            <label className="block text-xs font-bold text-neutral-700">
              Admin password
              <input
                type="password"
                className="mt-1 w-full border border-neutral-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-neutral-900"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
              />
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={closeRestoreModal}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-700 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {loading ? "Restoring..." : "Restore"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}