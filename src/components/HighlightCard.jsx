import React, { useState } from 'react';
import { Share2, BookOpen, Loader } from 'lucide-react';
import { format } from 'date-fns';

export default function HighlightCard({ highlight, showBookInfo = true }) {
    const [sharing, setSharing] = useState(false);

    const handleShare = async () => {
        setSharing(true);
        try {
            const response = await fetch('/api/export/image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: highlight.text,
                    title: highlight.book?.title,
                    author: highlight.author?.name,
                    coverUrl: highlight.book?.coverImage
                })
            });

            if (!response.ok) throw new Error('Generation failed');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `quote-${highlight.id}.png`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (e) {
            console.error(e);
        } finally {
            setSharing(false);
        }
    };

    if (!highlight) return null;

    return (
        <div className="glass-panel p-6 rounded-xl relative group">
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={handleShare}
                    disabled={sharing}
                    className="p-2 hover:bg-[var(--glass-highlight)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    title="Share as Image"
                >
                    {sharing ? <Loader size={18} className="animate-spin" /> : <Share2 size={18} />}
                </button>
            </div>

            <div className="mb-4">
                <p className="text-xl font-serif leading-relaxed text-[var(--text-primary)]">
                    "{highlight.text}"
                </p>
            </div>

            {showBookInfo && (
                <div className="flex items-center gap-3 pt-4 border-t border-[var(--glass-border)]">
                    <div className="w-10 h-10 rounded bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center flex-shrink-0">
                        <BookOpen size={16} className="text-gray-400" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-sm text-[var(--text-primary)]">{highlight.book?.title}</h4>
                        <p className="text-xs text-[var(--text-secondary)]">{highlight.author?.name}</p>
                    </div>
                </div>
            )}

            {highlight.originalDate && (
                <div className="mt-4 text-xs text-[var(--text-muted)] text-right">
                    Added on {format(new Date(highlight.originalDate), 'PPP')}
                </div>
            )}
        </div>
    );
}
