import React, { useState } from 'react';

const Navbar = ({ onResetConnection }) => {
  const [resetting, setResetting] = useState(false);

  const handleLogout = async () => {
    if (resetting) return;
    setResetting(true);
    try {
      if (window.electronAPI?.dbConfig?.reset) {
        await window.electronAPI.dbConfig.reset();
      }
      if (onResetConnection) {
        onResetConnection();
      } else {
        window.location.reload();
      }
    } catch (err) {
      console.error("Logout/reset error:", err);
      window.location.reload();
    } finally {
      setResetting(false);
    }
  };

  return (
    <header className="h-[76px] bg-white border-b border-neutral-200 px-6 lg:px-8 flex items-center justify-between shrink-0 shadow-2xs">
      <div>
        <h2 className="text-base lg:text-lg font-black text-neutral-900 tracking-tight">
          Shop Management & POS Terminal
        </h2>
        <p className="text-xs text-neutral-400 font-medium hidden sm:block">
          Commercial grade desktop billing & inventory system
        </p>
      </div>

      <div className="flex items-center gap-4">

        <div className="flex items-center gap-3 pl-3 border-l border-neutral-200">
          <div className="w-9 h-9 rounded-xl bg-neutral-900 text-white font-black flex items-center justify-center text-xs shadow-sm">
            RA
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-black text-neutral-900">Rayyan Ahmed</p>
            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Administrator</p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={resetting}
            className="ml-2 px-3 py-1.5 rounded-xl text-xs font-bold border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 cursor-pointer"
          >
            {resetting ? 'Resetting...' : 'Logout'}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;