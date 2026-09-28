import React, { useState } from 'react';
import { Share2, BookOpen, Loader, Copy, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { formatQuote, highlightAuthorName } from '../utils/quote';

export default function HighlightCard({ highlight, showBookInfo = true }) {
    const [sharing, setSharing] = useState(false);
    const [copied, setCopied] = useState(false);
    const [copyFailed, setCopyFailed] = useState(false);

    const handleShare = async (e) => {
        e.preventDefault(); // Prevent link navigation
        e.stopPropagation();
        setSharing(true);
        // ... existing logic ...
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

    const handleCopy = async (e) => {
        e.preventDefault(); // Prevent link navigation
        e.stopPropagation();
        const text = formatQuote(highlight.text, highlight.book?.title, highlightAuthorName(highlight));
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Copy failed:', err);
            setCopyFailed(true);
            setTimeout(() => setCopyFailed(false), 2000);
        }
    };

    if (!highlight) return null;

    const Wrapper = ({ children }) => {
        if (!highlight.book?.id) return <div>{children}</div>;
        return (
            <Link
                to={`/books/${highlight.book.id}#${highlight.id}`}
                className="block h-full"
            >
                {children}
            </Link>
        );
    };

    return (
        <div className="glass-panel p-6 rounded-xl relative group transition-all hover:scale-[1.01] hover:border-[var(--accent-primary)] cursor-pointer">
            <Wrapper>
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-2">
                    <button
                        onClick={handleCopy}
                        className="p-2 hover:bg-[var(--glass-highlight)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                        title={copyFailed ? 'Copy failed' : 'Copy Quote'}
                    >
                        {copyFailed ? <X size={18} className="text-red-500" /> : copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                    </button>
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
            </Wrapper>

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
