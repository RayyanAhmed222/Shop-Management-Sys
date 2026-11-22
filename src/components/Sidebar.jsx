import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    ShoppingCart,
    Package,
    Users,
    BookOpenCheck,
    ShoppingBag,
    Building2,
    ReceiptText,
    TrendingUp,
    History,
    DatabaseBackup
} from 'lucide-react';

const Sidebar = () => {
    const navItems = [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'Point of Sale', path: '/pos', icon: ShoppingCart },
        { name: 'Customers', path: '/customers', icon: Users },
        { name: 'Udhaar Ledger', path: '/udhaar', icon: BookOpenCheck },
        { name: 'Purchases & Stocks', path: '/purchases', icon: ShoppingBag },
        { name: 'Suppliers', path: '/suppliers', icon: Building2 },
        { name: 'Expenses', path: '/expenses', icon: ReceiptText },
        { name: 'Reports', path: '/reports', icon: TrendingUp },
        { name: 'Invoice History', path: '/history', icon: History },
        { name: 'Backup & Restore', path: '/backup', icon: DatabaseBackup },
    ];

    return (
        <aside className="
            sticky
            top-0
            z-40
            flex
            h-screen
            w-[72px]
            shrink-0
            flex-col
            border-r
            border-neutral-200
            bg-white
            lg:w-[250px]
            shadow-xs
        ">
            {/* =========================================
                BRAND LOGO
            ========================================= */}
            <div className="
                flex
                h-[76px]
                items-center
                justify-center
                border-b
                border-neutral-100
                lg:justify-start
                lg:px-6
            ">
                <div className="flex items-center gap-3">
                    <div className="
                        flex
                        h-10
                        w-10
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        bg-black
                        text-white
                        shadow-md
                        shadow-black/10
                    ">
                        <span className="text-base font-black tracking-tight">
                            ⚡
                        </span>
                    </div>

                    <div className="hidden lg:block">
                        <p className="text-sm font-black tracking-[0.12em] text-neutral-950">
                            MANAGEMENT SYSTEM
                        </p>
                        <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-neutral-400">
                            Enterprise POS
                        </p>
                    </div>
                </div>
            </div>

            {/* =========================================
                NAVIGATION MENU
            ========================================= */}
            <nav className="
                flex
                flex-1
                flex-col
                gap-1
                px-2
                py-4
                overflow-y-auto
                custom-scrollbar
                lg:px-3
            ">
                <p className="
                    mb-2
                    hidden
                    px-3
                    text-[9px]
                    font-black
                    uppercase
                    tracking-[0.18em]
                    text-neutral-400
                    lg:block
                ">
                    Management Modules
                </p>

                {navItems.map((item) => {
                    const Icon = item.icon;

                    return (
                        <NavLink
                            key={item.name}
                            to={item.path}
                            end={item.path === '/'}
                            className={({ isActive }) => `
                                group
                                relative
                                flex
                                h-11
                                items-center
                                justify-center
                                gap-3
                                rounded-xl
                                px-3
                                text-sm
                                font-semibold
                                transition-all
                                duration-200
                                lg:justify-start
                                ${
                                    isActive
                                        ? `
                                            bg-black
                                            text-white
                                            shadow-sm
                                        `
                                        : `
                                            text-neutral-500
                                            hover:bg-neutral-100
                                            hover:text-neutral-950
                                        `
                                }
                            `}
                        >
                            {({ isActive }) => (
                                <>
                                    {isActive && (
                                        <span className="
                                            absolute
                                            -left-[12px]
                                            hidden
                                            h-6
                                            w-1
                                            rounded-r-full
                                            bg-black
                                            lg:block
                                        " />
                                    )}

                                    <Icon
                                        size={18}
                                        strokeWidth={isActive ? 2.5 : 1.8}
                                        className="shrink-0 transition-transform duration-200 group-hover:scale-105"
                                    />

                                    <span className="hidden lg:block truncate">
                                        {item.name}
                                    </span>
                                </>
                            )}
                        </NavLink>
                    );
                })}
            </nav>

            {/* =========================================
                BOTTOM STATUS
            ========================================= */}
            <div className="border-t border-neutral-100 p-3">
                <div className="rounded-xl bg-neutral-50 p-3 border border-neutral-200/60">
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                        <div className="hidden lg:block">
                            <p className="text-[11px] font-bold text-neutral-800">SQL Connected</p>
                            <p className="text-[9px] text-emerald-600 font-semibold">Active Session</p>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;