import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Search, GitMerge, AlertTriangle, Book as BookIcon, User as UserIcon, Check, X, ArrowRight, Wand2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

export default function MergePortal() {
    const [mode, setMode] = useState('books'); // 'books' or 'authors'
    const [target, setTarget] = useState(null);
    const [source, setSource] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [activeSelection, setActiveSelection] = useState(null); // 'target' or 'source'
    const [isMerging, setIsMerging] = useState(false);
    const [status, setStatus] = useState(null); // { type: 'success' | 'error', message: string }

    useEffect(() => {
        if (searchQuery.length < 2) {
            setSearchResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                if (mode === 'books') {
                    const allBooks = await api.getBooks();
                    const filtered = allBooks.filter(b =>
                        b.title.toLowerCase().includes(searchQuery.toLowerCase())
                    ).slice(0, 5);
                    setSearchResults(filtered);
                } else {
                    const allAuthors = await api.getAuthors();
                    const filtered = allAuthors.filter(a =>
                        a.name.toLowerCase().includes(searchQuery.toLowerCase())
                    ).slice(0, 5);
                    setSearchResults(filtered);
                }
            } catch (error) {
                console.error('Search failed', error);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, mode]);

    const [suggestions, setSuggestions] = useState([]);
    const [isScanning, setIsScanning] = useState(false);

    const scanForDuplicates = async () => {
        setIsScanning(true);
        setStatus(null);
        try {
            const allBooks = await api.getBooks();
            const groups = {};

            // Normalize titles and group
            allBooks.forEach(book => {
                const normalized = book.title.toLowerCase().trim()
                    .replace(/[^a-z0-9 ]/g, '') // remove special chars
                    .replace(/\s+/g, ' ');      // normalize whitespace
                if (!groups[normalized]) groups[normalized] = [];
                groups[normalized].push(book);
            });

            const found = [];
            Object.values(groups).forEach(group => {
                if (group.length > 1) {
                    // Try to identify which is the "primary" (the one with metadata)
                    // and which is the "duplicate" (the one with highlights)
                    const sorted = [...group].sort((a, b) => {
                        // Score based on metadata
                        const scoreA = (a.goodreadsId ? 2 : 0) + (a.asin ? 2 : 0) + (a.dateLastRead ? 1 : 0);
                        const scoreB = (b.goodreadsId ? 2 : 0) + (b.asin ? 2 : 0) + (b.dateLastRead ? 1 : 0);
                        return scoreB - scoreA;
                    });

                    // Suggest merging others into the first (highest score)
                    for (let i = 1; i < sorted.length; i++) {
                        found.push({
                            target: sorted[0],
                            source: sorted[i]
                        });
                    }
                }
            });

            setSuggestions(found);
            if (found.length === 0) {
                setStatus({ type: 'success', message: 'No duplicates found!' });
            }
        } catch (error) {
            console.error('Scan failed', error);
            setStatus({ type: 'error', message: 'Failed to scan for duplicates.' });
        } finally {
            setIsScanning(false);
        }
    };

    const handleMerge = async () => {
        if (!target || !source) return;
        if (target.id === source.id) {
            setStatus({ type: 'error', message: 'Cannot merge an item with itself.' });
            return;
        }

        setIsMerging(true);
        setStatus(null);
        try {
            if (mode === 'books') {
                await api.mergeBooks(target.id, source.id);
            } else {
                await api.mergeAuthors(target.id, source.id);
            }
            setStatus({ type: 'success', message: `${mode === 'books' ? 'Books' : 'Authors'} merged successfully!` });

            // Remove from suggestions if it was there
            setSuggestions(prev => prev.filter(s =>
                !(s.target.id === target.id && s.source.id === source.id) &&
                !(s.target.id === source.id && s.source.id === target.id)
            ));

            setTarget(null);
            setSource(null);
            setSearchQuery('');
        } catch (error) {
            setStatus({ type: 'error', message: error.message || 'Merge failed' });
        } finally {
            setIsMerging(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold font-display">Data Consolidation</h1>
                    <p className="text-[var(--text-secondary)] mt-1">Merge duplicate books or authors to keep your stats clean.</p>
                </div>

                <div className="flex items-center gap-4">
                    {mode === 'books' && (
                        <button
                            onClick={scanForDuplicates}
                            disabled={isScanning}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent-secondary)]/10 text-[var(--accent-secondary)] hover:bg-[var(--accent-secondary)]/20 transition-all font-medium border border-[var(--accent-secondary)]/20 disabled:opacity-50"
                        >
                            <Wand2 size={18} className={isScanning ? "animate-spin" : ""} />
                            {isScanning ? 'Scanning...' : 'Scan for Duplicates'}
                        </button>
                    )}

                    <div className="flex bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--glass-border)]">
                        <button
                            onClick={() => { setMode('books'); setTarget(null); setSource(null); setSuggestions([]); }}
                            className={clsx(
                                "px-4 py-2 rounded-lg text-sm font-medium transition-all text-center",
                                mode === 'books' ? "bg-[var(--accent-primary)] text-black shadow-lg" : "text-[var(--text-secondary)] hover:text-white"
                            )}
                        >
                            Books
                        </button>
                        <button
                            onClick={() => { setMode('authors'); setTarget(null); setSource(null); setSuggestions([]); }}
                            className={clsx(
                                "px-4 py-2 rounded-lg text-sm font-medium transition-all text-center",
                                mode === 'authors' ? "bg-[var(--accent-secondary)] text-white shadow-lg" : "text-[var(--text-secondary)] hover:text-white"
                            )}
                        >
                            Authors
                        </button>
                    </div>
                </div>
            </header>

            {status && (
                <div className={clsx(
                    "p-4 rounded-xl flex items-center gap-3 animate-in zoom-in duration-300",
                    status.type === 'success' ? "bg-green-500/10 border border-green-500/20 text-green-500" : "bg-red-500/10 border border-red-500/20 text-red-400"
                )}>
                    {status.type === 'success' ? <Check size={20} /> : <AlertTriangle size={20} />}
                    <p className="font-medium">{status.message}</p>
                    <button onClick={() => setStatus(null)} className="ml-auto opacity-60 hover:opacity-100 transition-opacity"><X size={16} /></button>
                </div>
            )}

            {/* Suggestions View */}
            <AnimatePresence>
                {suggestions.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4 overflow-hidden"
                    >
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Wand2 size={20} className="text-[var(--accent-secondary)]" />
                                Suggested Merges ({suggestions.length})
                            </h2>
                            <button
                                onClick={async () => {
                                    if (!confirm(`Are you sure you want to merge all ${suggestions.length} pairs? This is irreversible.`)) return;
                                    setIsMerging(true);
                                    let count = 0;
                                    for (const s of [...suggestions]) {
                                        try {
                                            await api.mergeBooks(s.target.id, s.source.id);
                                            count++;
                                            setSuggestions(prev => prev.filter(item => item !== s));
                                        } catch (e) {
                                            console.error('Batch merge failed for', s.source.title, e);
                                        }
                                    }
                                    setIsMerging(false);
                                    setStatus({ type: 'success', message: `Batch merged ${count} book pairs!` });
                                }}
                                disabled={isMerging}
                                className="text-sm font-bold text-[var(--accent-secondary)] hover:underline"
                            >
                                Auto-Consolidate All
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {suggestions.slice(0, 6).map((s, idx) => (
                                <div key={idx} className="glass-panel p-4 rounded-xl border border-[var(--glass-border)] flex flex-col gap-3">
                                    <div className="flex-1">
                                        <p className="font-bold text-sm truncate">{s.target.title}</p>
                                        <div className="flex items-center gap-2 mt-2 text-[10px] uppercase font-bold tracking-wider">
                                            <span className="text-[var(--accent-primary)]">{s.target.highlightCount} dots</span>
                                            <span className="text-[var(--text-muted)] group-hover:block">←</span>
                                            <span className="text-red-400">{s.source.highlightCount} dots</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setTarget(s.target);
                                            setSource(s.source);
                                            window.scrollTo({ top: 300, behavior: 'smooth' });
                                        }}
                                        className="w-full py-1.5 bg-[var(--bg-tertiary)] hover:bg-[var(--glass-highlight)] rounded-lg text-xs font-bold transition-colors"
                                    >
                                        Review Merge
                                    </button>
                                </div>
                            ))}
                            {suggestions.length > 6 && (
                                <div className="flex items-center justify-center glass-panel rounded-xl border border-dashed border-[var(--glass-border)] text-[var(--text-muted)] text-sm">
                                    +{suggestions.length - 6} more suggested
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                {/* Target Column */}
                <div className="space-y-4">
                    <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] ml-1">
                        1. Primary Item (Keep this one)
                    </label>
                    <div
                        onClick={() => setActiveSelection('target')}
                        className={clsx(
                            "glass-panel p-6 rounded-2xl border-2 transition-all cursor-pointer h-48 flex flex-col justify-center relative",
                            activeSelection === 'target' ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/5" : "border-transparent hover:border-[var(--glass-border)]",
                            target && "ring-2 ring-[var(--accent-primary)]/20"
                        )}
                    >
                        {target ? (
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
                                    {mode === 'books' ? <BookIcon size={24} /> : <UserIcon size={24} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold truncate">{mode === 'books' ? target.title : target.name}</h3>
                                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                                        <p className="text-xs text-[var(--text-secondary)]">ID: {target.id}</p>
                                        {mode === 'books' && (
                                            <>
                                                <p className="text-xs text-[var(--accent-primary)] font-bold">{target.highlightCount || 0} highlights</p>
                                                {target.dateLastRead && (
                                                    <p className="text-xs text-[var(--text-muted)]">Read: {new Date(target.dateLastRead).toLocaleDateString()}</p>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); setTarget(null); }} className="p-2 hover:bg-black/20 rounded-full transition-colors"><X size={16} /></button>
                            </div>
                        ) : (
                            <div className="text-center space-y-2 opacity-60">
                                <PlusCircle className="mx-auto text-[var(--text-muted)]" size={32} />
                                <p className="text-sm">Click to select primary</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="hidden md:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex-col gap-2">
                    <div className="w-10 h-10 rounded-full bg-[var(--bg-secondary)] border border-[var(--glass-border)] flex items-center justify-center text-[var(--text-muted)]">
                        <ArrowRight size={18} />
                    </div>
                    {target && source && (
                        <button
                            onClick={() => {
                                const t = target;
                                setTarget(source);
                                setSource(t);
                            }}
                            className="w-10 h-10 rounded-full bg-[var(--bg-tertiary)] border border-[var(--glass-border)] flex items-center justify-center text-[var(--text-primary)] hover:bg-[var(--accent-primary)] hover:text-black transition-all shadow-lg active:scale-90"
                            title="Swap Direction"
                        >
                            <GitMerge size={18} className="rotate-180" />
                        </button>
                    )}
                </div>

                {/* Source Column */}
                <div className="space-y-4">
                    <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] ml-1">
                        2. Duplicate Item (Merge & Delete)
                    </label>
                    <div
                        onClick={() => setActiveSelection('source')}
                        className={clsx(
                            "glass-panel p-6 rounded-2xl border-2 transition-all cursor-pointer h-48 flex flex-col justify-center relative",
                            activeSelection === 'source' ? "border-red-500/50 bg-red-500/5" : "border-transparent hover:border-[var(--glass-border)]",
                            source && "ring-2 ring-red-500/20"
                        )}
                    >
                        {source ? (
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-red-500/10 text-red-500">
                                    {mode === 'books' ? <BookIcon size={24} /> : <UserIcon size={24} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold truncate">{mode === 'books' ? source.title : source.name}</h3>
                                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                                        <p className="text-xs text-[var(--text-secondary)]">ID: {source.id}</p>
                                        {mode === 'books' && (
                                            <>
                                                <p className="text-xs text-red-400 font-bold">{source.highlightCount || 0} highlights</p>
                                                {source.dateLastRead && (
                                                    <p className="text-xs text-[var(--text-muted)]">Read: {new Date(source.dateLastRead).toLocaleDateString()}</p>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); setSource(null); }} className="p-2 hover:bg-black/20 rounded-full transition-colors"><X size={16} /></button>
                            </div>
                        ) : (
                            <div className="text-center space-y-2 opacity-60">
                                <PlusCircle className="mx-auto text-[var(--text-muted)]" size={32} />
                                <p className="text-sm">Click to select duplicate</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Selection Search Bar */}
            <AnimatePresence>
                {activeSelection && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="glass-panel p-8 rounded-2xl border-[var(--glass-border)] space-y-6 shadow-2xl relative"
                    >
                        <button
                            onClick={() => setActiveSelection(null)}
                            className="absolute top-4 right-4 p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <div className="space-y-2">
                            <h2 className="text-lg font-bold">Select {activeSelection === 'target' ? 'Primary' : 'Duplicate'} {mode === 'books' ? 'Book' : 'Author'}</h2>
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                                <input
                                    type="text"
                                    placeholder={`Search for ${mode}...`}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    autoFocus
                                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--glass-border)] rounded-xl py-3 pl-12 pr-4 outline-none focus:border-[var(--accent-primary)] transition-colors"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            {isSearching ? (
                                <div className="py-8 text-center text-[var(--text-secondary)]">Searching...</div>
                            ) : searchResults.length > 0 ? (
                                searchResults.map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => {
                                            if (activeSelection === 'target') setTarget(item);
                                            else setSource(item);
                                            setActiveSelection(null);
                                            setSearchQuery('');
                                        }}
                                        disabled={(activeSelection === 'target' && source?.id === item.id) || (activeSelection === 'source' && target?.id === item.id)}
                                        className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-[var(--glass-highlight)] transition-colors text-left group disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-muted)]">
                                            {mode === 'books' ? <BookIcon size={18} /> : <UserIcon size={18} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold truncate">{mode === 'books' ? item.title : item.name}</p>
                                            <p className="text-xs text-[var(--text-secondary)]">ID: {item.id} {mode === 'books' && item.author?.name && `• by ${item.author.name}`}</p>
                                        </div>
                                        <Check className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--accent-primary)]" size={18} />
                                    </button>
                                ))
                            ) : searchQuery.length >= 2 ? (
                                <div className="py-8 text-center text-[var(--text-secondary)]">No results found</div>
                            ) : null}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Merge Button */}
            <div className="flex justify-center pt-8">
                <button
                    disabled={!target || !source || isMerging}
                    onClick={handleMerge}
                    className={clsx(
                        "flex items-center gap-3 px-12 py-4 rounded-2xl font-bold transition-all shadow-xl active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed",
                        isMerging ? "bg-[var(--bg-tertiary)] text-[var(--text-muted)]" : "bg-gradient-to-r from-red-600 to-orange-600 text-white hover:brightness-110 shadow-red-900/20"
                    )}
                >
                    {isMerging ? (
                        <>Merging...</>
                    ) : (
                        <>
                            <GitMerge size={24} />
                            Consolidate {mode === 'books' ? 'Books' : 'Authors'}
                        </>
                    )}
                </button>
            </div>

            {target && source && !isMerging && (
                <div className="max-w-xl mx-auto p-4 rounded-xl bg-red-500/5 border border-red-500/20 flex gap-4 text-sm text-red-300">
                    <AlertTriangle size={32} className="flex-shrink-0" />
                    <div>
                        <p className="font-bold">Dangerous Action</p>
                        <p className="opacity-80">This will merge all data from <strong>{mode === 'books' ? source.title : source.name}</strong> into <strong>{mode === 'books' ? target.title : target.name}</strong>. The duplicate entry will be permanently deleted. This cannot be undone.</p>
                    </div>
                </div>
            )}
        </div>
    );
}

function PlusCircle({ className, size }) {
    return (
        <svg
            className={className}
            width={size} height={size}
            viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
        </svg>
    );
}
