import React, { useState } from 'react';
import { Download, FileText, Book as BookIcon } from 'lucide-react';

export default function Settings() {
    const [exporting, setExporting] = useState(false);

    const handleExport = async () => {
        setExporting(true);
        try {
            // Trigger download by opening URL
            window.location.href = '/api/export/obsidian';
        } catch (e) {
            console.error(e);
        } finally {
            // Small delay to reset UI
            setTimeout(() => setExporting(false), 2000);
        }
    };

    return (
        <div className="space-y-8 max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold">Settings</h1>

            <div className="glass-panel p-8 rounded-2xl">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <FileText className="text-[var(--accent-purple)]" />
                    Data Export
                </h2>
                <p className="text-[var(--text-secondary)] mb-6">
                    Export your entire library, including books, authors, and highlights, as a ZIP file of Markdown files compatible with Obsidian, Logseq, or any other PKM tool.
                </p>

                <button
                    onClick={handleExport}
                    disabled={exporting}
                    className="px-6 py-3 bg-[var(--accent-primary)] hover:bg-green-600 text-white rounded-xl font-medium flex items-center gap-3 transition-colors"
                >
                    <Download size={20} />
                    {exporting ? 'Generating ZIP...' : 'Export to Obsidian'}
                </button>
            </div>

            {/* Metadata Management */}
            <div className="glass-panel p-8 rounded-2xl">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <BookIcon className="text-[var(--accent-secondary)]" />
                    Library Metadata
                </h2>
                <p className="text-[var(--text-secondary)] mb-6">
                    Automatically fetch missing book covers and genres from Google Books. This process runs in the background.
                </p>

                <button
                    onClick={async () => {
                        const btn = document.getElementById('meta-btn');
                        if (btn) {
                            btn.innerText = 'Fetching...';
                            btn.disabled = true;
                        }
                        try {
                            const res = await fetch('/api/admin/backfill-covers');
                            const data = await res.json();
                            alert(`Metadata fetch started! Check server logs for progress.`);
                        } catch (e) {
                            alert('Error starting fetch');
                        } finally {
                            if (btn) {
                                btn.innerText = 'Fetch Covers & Genres';
                                btn.disabled = false;
                            }
                        }
                    }}
                    id="meta-btn"
                    className="px-6 py-3 bg-[var(--bg-tertiary)] hover:bg-[var(--glass-border)] text-[var(--text-primary)] rounded-xl font-medium flex items-center gap-3 transition-colors border border-[var(--glass-border)]"
                >
                    <Download size={20} className="rotate-180" /> {/* Upload/Cloud icon substitute */}
                    Fetch Covers & Genres
                </button>
            </div>

            <div className="text-center text-xs text-[var(--text-muted)] mt-12">
                KindleWise V1.0 • Local-First Library Manager
            </div>
        </div>
    );
}
