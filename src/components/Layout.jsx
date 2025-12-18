import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
    Home,
    Book,
    Users,
    Highlighter,
    BarChart2,
    Settings,
    Search,
    Upload,
    Plus,
    Layers,
    PieChart
} from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

import SearchBar from './SearchBar';
import ImportModal from './ImportModal';

import { api } from '../utils/api';

export default function Layout() {
    const location = useLocation();
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [userLevel, setUserLevel] = useState(null);

    React.useEffect(() => {
        api.getStats().then(stats => {
            if (stats && stats.totalXp) {
                // Calculate level dynamically
                const lvl = Math.max(1, Math.floor(Math.sqrt(stats.totalXp / 100)));
                setUserLevel(lvl);
            }
        }).catch(err => console.error("Failed to load user level", err));
    }, [location.pathname]);

    const navItems = [
        { icon: Home, label: 'Home', path: '/' },
        { icon: Book, label: 'Books', path: '/books' },
        { icon: Users, label: 'Authors', path: '/authors' },
        { icon: Highlighter, label: 'Highlights', path: '/highlights' },
        { icon: BarChart2, label: 'Stats', path: '/stats' },
        { icon: PieChart, label: 'Analytics', path: '/analytics' },
        { icon: Layers, label: 'Dimensions', path: '/stats/categories' },
        { icon: Settings, label: 'Settings', path: '/settings' },
    ];

    return (
        <div className="flex h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden">
            <ImportModal
                isOpen={isImportOpen}
                onClose={() => setIsImportOpen(false)}
            />
            {/* Sidebar */}
            <aside className="w-64 flex-shrink-0 border-r border-[var(--glass-border)] bg-[var(--bg-secondary)] flex flex-col">
                <div className="p-6">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] bg-clip-text text-transparent">
                        KindleWise
                    </h1>
                </div>

                <nav className="flex-1 px-4 space-y-2">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => clsx(
                                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                                isActive
                                    ? "bg-[var(--accent-primary)] text-white shadow-lg shadow-green-900/20"
                                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-white"
                            )}
                        >
                            <item.icon size={20} />
                            <span className="font-medium">{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-[var(--glass-border)]">
                    <NavLink to="/stats" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--glass-highlight)] transition-colors group">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center font-bold text-xs group-hover:scale-110 transition-transform">
                            FC
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">Frank Coleman</p>
                            <p className="text-xs text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">
                                {userLevel ? `Level ${userLevel} Reader` : 'Reader'}
                            </p>
                        </div>
                    </NavLink>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                {/* Top Header */}
                <header className="h-16 flex items-center justify-between px-8 border-b border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-md z-10 w-full">
                    <SearchBar />

                    <button
                        onClick={() => setIsImportOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-primary)] hover:bg-green-600 text-white rounded-lg transition-colors text-sm font-medium shadow-lg shadow-green-900/20"
                    >
                        <Upload size={16} />
                        <span>Import</span>
                    </button>
                </header>

                {/* Page Content */}
                <div className="flex-1 overflow-y-auto p-8 scroll-smooth">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <Outlet />
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
}
