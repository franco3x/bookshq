import React, { useState } from 'react';
import { api } from '../utils/api';
import { Upload, CheckCircle, AlertCircle, Loader2, BookOpen, ExternalLink } from 'lucide-react';

export default function ImportGoodreads() {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setResults(null);
        setError(null);
    };

    const handleUpload = async () => {
        if (!file) return;

        setLoading(true);
        setError(null);
        try {
            const data = await api.importGoodreadsCSV(file);
            setResults(data);
        } catch (err) {
            console.error('Import error:', err);
            setError(err.message || 'Failed to import Goodreads data');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
            <header className="space-y-2">
                <h1 className="text-3xl font-bold">Import from Goodreads</h1>
                <p className="text-[var(--text-secondary)]">Sync your reading history and ratings from Goodreads</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <section className="glass-panel p-8 rounded-2xl border border-white/5 space-y-6">
                        <div
                            className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${file ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/5' : 'border-white/10 hover:border-white/20'
                                }`}
                        >
                            <input
                                type="file"
                                id="file-upload"
                                onChange={handleFileChange}
                                accept=".csv"
                                className="hidden"
                            />
                            <label htmlFor="file-upload" className="cursor-pointer space-y-4 block">
                                <div className="mx-auto w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                                    <Upload className={file ? 'text-[var(--accent-primary)]' : 'text-[var(--text-secondary)]'} />
                                </div>
                                <div>
                                    <p className="text-lg font-medium">{file ? file.name : 'Choose Goodreads CSV'}</p>
                                    <p className="text-sm text-[var(--text-secondary)]">Click to browse or drag and drop</p>
                                </div>
                            </label>
                        </div>

                        <button
                            onClick={handleUpload}
                            disabled={!file || loading}
                            className="w-full py-4 bg-[var(--accent-primary)] text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 shadow-lg shadow-[var(--accent-primary)]/20"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin" />
                                    Processing 1,000+ records...
                                </>
                            ) : (
                                <>
                                    <BookOpen size={20} />
                                    Import Read Books
                                </>
                            )}
                        </button>

                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
                                <AlertCircle size={20} />
                                <p className="text-sm font-medium">{error}</p>
                            </div>
                        )}
                    </section>

                    {results && (
                        <section className="glass-panel p-8 rounded-2xl border border-white/5 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center gap-3">
                                <CheckCircle className="text-green-400" />
                                <h3 className="text-xl font-bold">Import Complete</h3>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                                    <p className="text-xs text-[var(--text-secondary)] uppercase font-semibold">Imported</p>
                                    <p className="text-2xl font-bold text-green-400">{results.imported}</p>
                                </div>
                                <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                                    <p className="text-xs text-[var(--text-secondary)] uppercase font-semibold">Updated</p>
                                    <p className="text-2xl font-bold text-blue-400">{results.updated}</p>
                                </div>
                                <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                                    <p className="text-xs text-[var(--text-secondary)] uppercase font-semibold">Skipped</p>
                                    <p className="text-2xl font-bold text-[var(--text-secondary)]">{results.skipped}</p>
                                </div>
                                <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                                    <p className="text-xs text-[var(--text-secondary)] uppercase font-semibold">Errors</p>
                                    <p className="text-2xl font-bold text-red-400">{results.errors.length}</p>
                                </div>
                            </div>

                            {results.errors.length > 0 && (
                                <div className="space-y-3">
                                    <p className="text-sm font-semibold text-red-400">Failed to import:</p>
                                    <div className="max-h-32 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                                        {results.errors.map((err, i) => (
                                            <div key={i} className="text-xs p-2 bg-red-500/5 rounded border border-red-500/10 flex justify-between">
                                                <span>{err.title}</span>
                                                <span className="opacity-60">{err.error}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <p className="text-sm text-[var(--text-secondary)] italic">
                                Note: Only books from your "read" shelf were processed. Items on "to-read" or "currently-reading" were skipped to keep your library clean.
                            </p>
                        </section>
                    )}
                </div>

                <div className="space-y-6">
                    <section className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
                        <h3 className="font-bold flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] flex items-center justify-center text-xs">?</span>
                            Instructions
                        </h3>
                        <ul className="space-y-4 text-sm">
                            <li className="flex gap-3">
                                <span className="text-[var(--text-secondary)] shrink-0">1.</span>
                                <span>Go to <a href="https://www.goodreads.com/review/import" target="_blank" rel="noreferrer" className="text-[var(--accent-primary)] hover:underline flex items-center gap-1 inline-flex">Goodreads <ExternalLink size={12} /></a></span>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-[var(--text-secondary)] shrink-0">2.</span>
                                <span>Click <strong>"Export Library"</strong> in the sidebar.</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-[var(--text-secondary)] shrink-0">3.</span>
                                <span>Wait for the file to generate (usually takes a minute).</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-[var(--text-secondary)] shrink-0">4.</span>
                                <span>Download and upload the CSV here.</span>
                            </li>
                        </ul>
                    </section>

                    <section className="glass-panel p-6 rounded-2xl border border-white/5 bg-gradient-to-br from-[var(--accent-primary)]/5 to-transparent">
                        <h3 className="font-bold mb-2">What happens next?</h3>
                        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                            BooksHQ will match your Goodreads books with existing records. We'll sync your **personal ratings**, **public ratings**, **page counts**, and **read dates**.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
