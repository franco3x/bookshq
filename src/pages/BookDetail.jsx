
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../utils/api';
import { ArrowLeft, Book as BookIcon, Trophy, Highlighter, Clock, CheckCircle } from 'lucide-react';

export default function BookDetail() {
    const { id } = useParams();
    const [book, setBook] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadBook();
    }, [id]);

    const loadBook = async () => {
        try {
            const data = await api.getBook(id);
            setBook(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const [isEditingTags, setIsEditingTags] = useState(false);
    const [tagInput, setTagInput] = useState('');

    const handleSaveTags = async () => {
        try {
            const newTags = tagInput.split(',').map(t => t.trim()).filter(Boolean);
            await api.bulkUpdateTags([book.id], newTags);
            setBook(prev => ({ ...prev, tags: newTags }));
            setIsEditingTags(false);
        } catch (error) {
            console.error('Failed to update tags:', error);
            alert('Failed to update tags');
        }
    };

    const handleMarkAsRead = async () => {
        try {
            const res = await fetch(`/api/books/${id}/read`, { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                setBook(prev => ({ ...prev, readCount: data.readCount, dateLastRead: new Date() }));
            }
        } catch (error) {
            console.error('Failed to mark as read', error);
        }
    };

    if (loading) return <div>Loading...</div>;
    if (!book) return <div>Book not found</div>;

    const gradient = "from-blue-500 to-purple-600";
    const totalHighlights = book.highlights?.length || 0;

    return (
        <div className="space-y-8">
            <Link to="/books" className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                <ArrowLeft size={16} />
                Back to Books
            </Link>

            <div className="glass-panel p-8 rounded-2xl relative overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-20`} />
                <div className="relative flex flex-col md:flex-row gap-8">
                    <div className="w-full md:w-64 aspect-[2/3] rounded-lg shadow-2xl overflow-hidden flex-shrink-0 bg-black/40 flex items-center justify-center">
                        {book.coverImage ? (
                            <img src={book.coverImage} alt={book.title} className="w-full h-full object-cover" />
                        ) : (
                            <BookIcon size={64} className="text-white/40" />
                        )}
                    </div>

                    <div className="flex-1 space-y-4">
                        <h1 className="text-4xl font-bold font-display leading-tight">{book.title}</h1>
                        <Link to={`/authors/${book.author?.id}`} className="inline-flex text-xl text-[var(--text-secondary)] hover:text-[var(--accent-secondary)] transition-colors">
                            {book.author?.name}
                        </Link>

                        <div className="flex flex-wrap gap-4 pt-4">
                            {/* Tags Display/Edit */}
                            <div className="w-full mb-2">
                                {!isEditingTags ? (
                                    <div className="flex flex-wrap gap-2 items-center">
                                        {book.tags && Array.isArray(book.tags) && book.tags.map((tag, i) => (
                                            <span key={i} className="px-3 py-1 text-xs font-medium bg-[var(--bg-secondary)] border border-[var(--glass-border)] rounded-full flex items-center gap-1.5 text-[var(--text-secondary)]">
                                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]" />
                                                {tag}
                                            </span>
                                        ))}
                                        <button
                                            onClick={() => {
                                                setTagInput(book.tags?.join(', ') || '');
                                                setIsEditingTags(true);
                                            }}
                                            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors ml-1"
                                            title="Edit tags"
                                        >
                                            <Highlighter size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            placeholder="Enter tags (comma-separated)"
                                            className="flex-1 bg-[var(--bg-secondary)] border border-[var(--glass-border)] rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[var(--accent-primary)]"
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSaveTags();
                                                if (e.key === 'Escape') setIsEditingTags(false);
                                            }}
                                        />
                                        <button
                                            onClick={handleSaveTags}
                                            className="px-3 py-1.5 bg-[var(--accent-primary)] text-white text-xs font-bold rounded-lg hover:bg-[var(--accent-secondary)]"
                                        >
                                            Save
                                        </button>
                                        <button
                                            onClick={() => setIsEditingTags(false)}
                                            className="px-3 py-1.5 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] text-xs font-medium rounded-lg hover:bg-[var(--glass-border)]"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 flex items-center gap-2">
                                <Highlighter size={16} className="text-[var(--accent-primary)]" />
                                <span>{totalHighlights} highlights</span>
                            </div>

                            {book.genre && (
                                <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 flex items-center gap-2 text-[var(--accent-secondary)]">
                                    <BookIcon size={16} />
                                    <span>{book.genre}</span>
                                </div>
                            )}

                            {book.dateLastRead && (
                                <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 flex items-center gap-2">
                                    <Clock size={16} className="text-[var(--accent-secondary)]" />
                                    <span>Last read {new Date(book.dateLastRead).getFullYear()}</span>
                                </div>
                            )}

                            {book.readCount > 0 && (
                                <div className="px-4 py-2 rounded-full bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 text-[var(--accent-primary)] flex items-center gap-2">
                                    <CheckCircle size={16} />
                                    <span>Read {book.readCount}x</span>
                                </div>
                            )}
                        </div>

                        <div className="pt-8">
                            <button
                                onClick={handleMarkAsRead}
                                className="px-6 py-3 rounded-xl bg-[var(--accent-primary)] text-black font-bold hover:brightness-110 transition-all active:scale-95 flex items-center gap-2"
                            >
                                <CheckCircle size={20} />
                                {book.readCount > 0 ? 'Log Another Read' : 'Mark as Read'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div>
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <Highlighter size={20} className="text-[var(--accent-primary)]" />
                    Highlights
                </h2>

                <div className="space-y-6">
                    {book.highlights?.map(highlight => (
                        <div key={highlight.id} className="glass-panel p-6 rounded-xl hover:bg-[var(--glass-highlight)] transition-colors">
                            <p className="text-lg leading-relaxed font-serif text-[var(--text-primary)]">
                                "{highlight.text}"
                            </p>
                            <div className="mt-4 flex items-center justify-between text-sm text-[var(--text-muted)]">
                                <span>Location: {highlight.location}</span>
                                <div className="flex gap-2">
                                    <button className="hover:text-[var(--text-primary)] transition-colors">Share</button>
                                    <button className="hover:text-[var(--text-primary)] transition-colors">Copy</button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {(!book.highlights || book.highlights.length === 0) && (
                        <div className="text-center p-12 text-[var(--text-muted)]">
                            No highlights found specifically for this book yet.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
