import React, { useState, useRef } from 'react';
import { Upload, X, Check, AlertCircle, FileText, Loader, Bookmark, Usb } from 'lucide-react';
import { api } from '../utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import bookmarkletSource from '../bookmarklet/kindle-notebook.js?raw';

const buildBookmarkletHref = () => 'javascript:' + encodeURIComponent(
    bookmarkletSource.replace('__BOOKSHQ_URL__', window.location.origin).replace('__MODE__', 'sync')
);

export default function ImportModal({ isOpen, onClose, onSuccess }) {
    const [dragActive, setDragActive] = useState(false);
    const [status, setStatus] = useState('idle'); // idle, uploading, processing, success, error
    const [result, setResult] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [importType, setImportType] = useState('kindle'); // 'kindle', 'readwise' or 'kindle-sync'
    const [dragHint, setDragHint] = useState(false);

    // Progress simulation
    const [progress, setProgress] = useState(0);

    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0]);
        }
    };

    const processFile = async (file) => {
        setStatus('uploading');
        setProgress(10);

        // Simulate progress while waiting for the server
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 90) return 90; // Wait at 90%
                return prev + (Math.random() * 10);
            });
        }, 500);

        try {
            let data;
            if (importType === 'readwise') {
                // Call Readwise endpoint
                const formData = new FormData();
                formData.append('file', file);
                const response = await fetch('/api/import/readwise', {
                    method: 'POST',
                    body: formData,
                });
                if (!response.ok) throw new Error('Import failed');
                data = await response.json();
            } else {
                // Use existing Kindle import
                data = await api.importClippings(file);
            }

            clearInterval(interval);
            setProgress(100);
            setStatus('success');
            setResult(data);
            if (onSuccess) onSuccess(data);
        } catch (error) {
            clearInterval(interval);
            setStatus('error');
            setErrorMsg(error.message || 'Upload failed');
        }
    };

    const importFromDevice = async () => {
        setStatus('processing');
        setProgress(50);
        try {
            const data = await api.importFromKindleDevice();
            setProgress(100);
            setStatus('success');
            setResult(data);
            if (onSuccess) onSuccess(data);
        } catch (error) {
            setStatus('error');
            setErrorMsg(error.message || 'Import failed');
        }
    };

    const reset = () => {
        setStatus('idle');
        setResult(null);
        setErrorMsg('');
        setProgress(0);
    };

    const fileExtension = importType === 'readwise' ? '.csv' : '.txt';
    const fileName = importType === 'readwise' ? 'readwise-data.csv' : 'My Clippings.txt';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[var(--bg-secondary)] border border-[var(--glass-border)] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden relative" onClick={(e) => e.stopPropagation()}>

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[var(--glass-border)]">
                    <h2 className="text-xl font-bold">Import Highlights</h2>
                    <button onClick={onClose} className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Import Type Toggle */}
                {status === 'idle' && (
                    <div className="px-6 pt-4 pb-0">
                        <div className="flex gap-2 bg-[var(--bg-tertiary)] p-1 rounded-lg">
                            <button
                                onClick={() => setImportType('kindle')}
                                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${importType === 'kindle'
                                        ? 'bg-[var(--accent-primary)] text-black shadow-sm'
                                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                    }`}
                            >
                                Kindle (.txt)
                            </button>
                            <button
                                onClick={() => setImportType('readwise')}
                                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${importType === 'readwise'
                                        ? 'bg-[var(--accent-primary)] text-black shadow-sm'
                                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                    }`}
                            >
                                Readwise (.csv)
                            </button>
                            <button
                                onClick={() => setImportType('kindle-sync')}
                                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${importType === 'kindle-sync'
                                        ? 'bg-[var(--accent-primary)] text-black shadow-sm'
                                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                    }`}
                            >
                                Kindle Sync
                            </button>
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="p-8">
                    <AnimatePresence mode="wait">
                        {status === 'idle' && importType === 'kindle-sync' && (
                            <motion.div key="kindle-sync" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                                <div>
                                    <h3 className="font-bold mb-3">Sync from your Kindle notebook</h3>
                                    <ol className="list-decimal list-inside space-y-3 text-sm text-[var(--text-secondary)]">
                                        <li>
                                            Drag this button to your bookmarks bar (one time only):
                                            <div className="mt-2">
                                                <a
                                                    ref={el => el?.setAttribute('href', buildBookmarkletHref())}
                                                    onClick={(e) => { e.preventDefault(); setDragHint(true); }}
                                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent-primary)] text-black font-medium cursor-grab"
                                                >
                                                    <Bookmark size={16} /> Send to BooksHQ
                                                </a>
                                            </div>
                                            {dragHint && (
                                                <p className="mt-2 text-xs text-[var(--accent-primary)]">Drag it onto your bookmarks bar rather than clicking it here. It only works on your Kindle notebook page.</p>
                                            )}
                                        </li>
                                        <li>
                                            Open <a href="https://read.amazon.com/notebook" target="_blank" rel="noreferrer" className="underline hover:text-[var(--text-primary)]">read.amazon.com/notebook</a> and sign in.
                                        </li>
                                        <li>Click the bookmark. It reads every book's highlights and sends new ones here.</li>
                                    </ol>
                                    <p className="mt-3 text-xs text-[var(--text-muted)]">Keep BooksHQ running while it syncs. Highlights you already have are skipped.</p>
                                </div>
                                <div className="border-t border-[var(--glass-border)] pt-5">
                                    <h3 className="font-bold mb-1">Physical Kindle plugged in?</h3>
                                    <p className="text-sm text-[var(--text-secondary)] mb-3">Imports My Clippings.txt directly. This also catches books you didn't buy from Amazon, which never reach the notebook.</p>
                                    <button
                                        onClick={importFromDevice}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--glass-border)] hover:bg-[var(--bg-tertiary)] text-sm"
                                    >
                                        <Usb size={16} /> Import from plugged-in Kindle
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {status === 'idle' && importType !== 'kindle-sync' && (
                            <motion.div
                                key="idle"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                                className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${dragActive ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10' : 'border-[var(--glass-border)] hover:border-[var(--text-secondary)]'}`}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input ref={fileInputRef} type="file" className="hidden" accept={fileExtension} onChange={handleChange} />
                                <div className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mx-auto mb-4">
                                    <FileText size={32} className="text-[var(--text-secondary)]" />
                                </div>
                                <p className="font-medium text-lg mb-2">Drag "{fileName}" here</p>
                                <p className="text-[var(--text-muted)] text-sm">or click to browse</p>
                            </motion.div>
                        )}

                        {(status === 'uploading' || status === 'processing') && (
                            <motion.div key="uploading" className="text-center py-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <div className="w-16 h-16 mx-auto mb-6 relative">
                                    <svg className="w-full h-full rotate-[-90deg]" viewBox="0 0 36 36">
                                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--bg-tertiary)" strokeWidth="4" />
                                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--accent-primary)" strokeWidth="4" strokeDasharray={`${progress}, 100`} className="transition-all duration-300 ease-out" />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center font-bold text-sm">
                                        {Math.round(progress)}%
                                    </div>
                                </div>
                                <h3 className="text-lg font-bold mb-2">Processing Library...</h3>
                                <p className="text-[var(--text-secondary)]">Optimizing your highlights database. This handles thousands of entries in seconds.</p>
                            </motion.div>
                        )}

                        {status === 'success' && (
                            <motion.div key="success" className="text-center py-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <div className="w-16 h-16 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center mx-auto mb-6">
                                    <Check size={32} />
                                </div>
                                <h3 className="text-2xl font-bold mb-2">Success!</h3>
                                <p className="text-[var(--text-secondary)] mb-6">
                                    Created <strong className="text-white">{result.createdCount}</strong> new highlights.<br />
                                    Skipped {result.skippedCount} duplicates.
                                </p>
                                <div className="flex gap-4 justify-center">
                                    <button onClick={reset} className="px-6 py-2 rounded-lg border border-[var(--glass-border)] hover:bg-[var(--bg-tertiary)]">Import Another</button>
                                    <button onClick={onClose} className="px-6 py-2 rounded-lg bg-[var(--accent-primary)] hover:bg-green-600 text-white shadow-lg shadow-green-900/20">Done</button>
                                </div>
                            </motion.div>
                        )}

                        {status === 'error' && (
                            <motion.div key="error" className="text-center py-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center mx-auto mb-6">
                                    <AlertCircle size={32} />
                                </div>
                                <h3 className="text-xl font-bold mb-2">Import Failed</h3>
                                <p className="text-red-400 mb-6">{errorMsg}</p>
                                <button onClick={reset} className="px-6 py-2 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)]">Try Again</button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
