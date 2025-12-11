
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

    const [isEditingGenre, setIsEditingGenre] = useState(false);
    const [genreInput, setGenreInput] = useState('');

    const [isEditingDate, setIsEditingDate] = useState(false);
    const [dateInput, setDateInput] = useState('');

    const [isEditingAuthors, setIsEditingAuthors] = useState(false);
    const [allAuthors, setAllAuthors] = useState([]);

    const loadAllAuthors = async () => {
        try {
            const authors = await api.getAuthors();
            setAllAuthors(authors);
        } catch (e) {
            console.error(e);
        }
    };

    const handleSaveAuthors = async () => {
        try {
            const authorIds = book.authors.map(a => a.id);
            await api.updateBook(book.id, { authorIds });
            setIsEditingAuthors(false);
            // Optionally reload to clean up state, but local optim works fine
        } catch (error) {
            console.error('Failed to update authors:', error);
            alert('Failed to update authors');
        }
    };

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

    const handleSaveGenre = async () => {
        try {
            // Split by comma and clean up
            const newGenres = genreInput.split(',').map(g => g.trim()).filter(Boolean);
            if (newGenres.length === 0) return;

            await api.updateBook(book.id, { genre: newGenres });
            setBook(prev => ({ ...prev, genre: newGenres }));
            setIsEditingGenre(false);
        } catch (error) {
            console.error('Failed to update genre:', error);
            alert('Failed to update genre');
        }
    };

    const handleSaveDate = async () => {
        try {
            if (!dateInput) return;
            const newDate = new Date(dateInput);

            await api.updateBook(book.id, { dateLastRead: newDate.toISOString() });
            setBook(prev => ({ ...prev, dateLastRead: newDate.toISOString() }));
            setIsEditingDate(false);
        } catch (error) {
            console.error('Failed to update date:', error);
            alert('Failed to update date');
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
                        <div className="flex items-center gap-2">
                            {isEditingAuthors ? (
                                <div className="space-y-2 w-full max-w-md">
                                    <div className="flex flex-wrap gap-2">
                                        {book.authors?.map(author => (
                                            <div key={author.id} className="bg-[var(--bg-secondary)] px-2 py-1 rounded flex items-center gap-2 border border-[var(--glass-border)]">
                                                <span>{author.name}</span>
                                                <button
                                                    onClick={() => {
                                                        const newAuthors = book.authors.filter(a => a.id !== author.id);
                                                        setBook(prev => ({ ...prev, authors: newAuthors }));
                                                    }}
                                                    className="text-red-400 hover:text-red-300"
                                                >
                                                    &times;
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <div className="flex gap-2">
                                            <select
                                                onChange={(e) => {
                                                    const authorId = parseInt(e.target.value);
                                                    if (!authorId) return;
                                                    const authorToAdd = allAuthors.find(a => a.id === authorId);
                                                    if (authorToAdd && !book.authors?.some(a => a.id === authorId)) {
                                                        setBook(prev => ({
                                                            ...prev,
                                                            authors: [...(prev.authors || []), authorToAdd]
                                                        }));
                                                    }
                                                    e.target.value = '';
                                                }}
                                                className="bg-[var(--bg-secondary)] border border-[var(--glass-border)] rounded-lg px-3 py-1.5 text-sm outline-none w-full"
                                            >
                                                <option value="">+ Select Existing Author...</option>
                                                {allAuthors.map(a => (
                                                    <option key={a.id} value={a.id}>{a.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="flex gap-2 items-center">
                                            <input
                                                type="text"
                                                placeholder="Or type new author name..."
                                                className="flex-1 bg-[var(--bg-secondary)] border border-[var(--glass-border)] rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[var(--accent-secondary)]"
                                                onKeyDown={async (e) => {
                                                    if (e.key === 'Enter' && e.target.value.trim()) {
                                                        try {
                                                            const newAuthor = await api.createAuthor(e.target.value.trim());
                                                            // Add to local list if not present
                                                            if (!book.authors?.some(a => a.id === newAuthor.id)) {
                                                                setBook(prev => ({
                                                                    ...prev,
                                                                    authors: [...(prev.authors || []), newAuthor]
                                                                }));
                                                            }
                                                            // Also add to allAuthors dropdown for future
                                                            setAllAuthors(prev => [...prev, newAuthor]);
                                                            e.target.value = '';
                                                        } catch (err) {
                                                            console.error(err);
                                                            alert('Failed to create author');
                                                        }
                                                    }
                                                }}
                                            />
                                        </div>

                                        <div className="flex gap-2 mt-2">
                                            <button
                                                onClick={handleSaveAuthors}
                                                className="px-3 py-1.5 bg-[var(--accent-secondary)] text-white text-xs font-bold rounded-lg hover:brightness-110 flex-1"
                                            >
                                                Save Changes
                                            </button>
                                            <button
                                                onClick={() => setIsEditingAuthors(false)}
                                                className="px-3 py-1.5 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] text-xs font-medium rounded-lg hover:bg-[var(--glass-border)]"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="group flex items-center gap-2">
                                    <div className="text-xl text-[var(--text-secondary)]">
                                        {book.authors && book.authors.length > 0 ? (
                                            book.authors.map((author, i) => (
                                                <span key={author.id}>
                                                    <Link
                                                        to={`/authors/${author.id}`}
                                                        className="hover:text-[var(--accent-secondary)] transition-colors"
                                                    >
                                                        {author.name}
                                                    </Link>
                                                    {i < book.authors.length - 1 && ", "}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="italic text-[var(--text-muted)]">Unknown Author</span>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (allAuthors.length === 0) loadAllAuthors();
                                            setIsEditingAuthors(true);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all rounded-full hover:bg-[var(--glass-highlight)]"
                                        title="Edit authors"
                                    >
                                        <Highlighter size={14} />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-4 pt-4">
                            {/* Tags Display/Edit */}
                            <div className="w-full mb-2">
                                {!isEditingTags ? (
                                    <div className="flex flex-wrap gap-2 items-center">
                                        {book.tags && Array.isArray(book.tags) && book.tags.map((tag, i) => (
                                            <Link
                                                key={i}
                                                to={`/books?tag=${encodeURIComponent(tag)}`}
                                                className="px-3 py-1 text-xs font-medium bg-[var(--bg-secondary)] border border-[var(--glass-border)] rounded-full flex items-center gap-1.5 text-[var(--text-secondary)] hover:bg-[var(--accent-primary)]/10 hover:border-[var(--accent-primary)]/30 transition-colors cursor-pointer"
                                            >
                                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]" />
                                                {tag}
                                            </Link>
                                        ))}
                                        <button
                                            onClick={() => {
                                                setTagInput(book.tags?.join(', ') || '');
                                                setIsEditingTags(true);
                                            }}
                                            className={`p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors ${(!book.tags || book.tags.length === 0) ? 'ml-0' : 'ml-1'}`}
                                            title="Edit tags"
                                        >
                                            {(!book.tags || book.tags.length === 0) ? (
                                                <span className="text-xs text-[var(--text-secondary)] hover:text-[var(--accent-primary)] flex items-center gap-1 border border-dashed border-[var(--glass-border)] px-2 py-1 rounded-full hover:bg-[var(--glass-highlight)] transition-all">
                                                    + Add Tags
                                                </span>
                                            ) : (
                                                <Highlighter size={14} />
                                            )}
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

                            <div className="flex items-center gap-2">
                                {isEditingGenre ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={genreInput}
                                            onChange={(e) => setGenreInput(e.target.value)}
                                            placeholder="Enter genres (comma-separated)"
                                            className="bg-[var(--bg-secondary)] border border-[var(--glass-border)] rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[var(--accent-secondary)] min-w-[200px]"
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSaveGenre();
                                                if (e.key === 'Escape') setIsEditingGenre(false);
                                            }}
                                        />
                                        <button
                                            onClick={handleSaveGenre}
                                            className="px-3 py-1.5 bg-[var(--accent-secondary)] text-white text-xs font-bold rounded-lg hover:brightness-110"
                                        >
                                            Save
                                        </button>
                                        <button
                                            onClick={() => setIsEditingGenre(false)}
                                            className="px-3 py-1.5 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] text-xs font-medium rounded-lg hover:bg-[var(--glass-border)]"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap items-center gap-2">
                                        {Array.isArray(book.genre) && book.genre.length > 0 ? (
                                            book.genre.map((g, i) => (
                                                <Link
                                                    key={i}
                                                    to={`/books?genre=${encodeURIComponent(g)}`}
                                                    className="px-4 py-2 rounded-full bg-white/5 border border-white/10 flex items-center gap-2 text-[var(--accent-secondary)] hover:bg-[var(--accent-secondary)]/10 hover:border-[var(--accent-secondary)]/30 transition-colors cursor-pointer"
                                                >
                                                    <BookIcon size={16} />
                                                    <span>{g}</span>
                                                </Link>
                                            ))
                                        ) : (
                                            <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 flex items-center gap-2 text-[var(--text-muted)] italic">
                                                <span>No genres</span>
                                            </div>
                                        )}
                                        <button
                                            onClick={() => {
                                                const val = Array.isArray(book.genre) ? book.genre.join(', ') : (book.genre || '');
                                                setGenreInput(val);
                                                setIsEditingGenre(true);
                                            }}
                                            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors rounded-full hover:bg-[var(--glass-highlight)]"
                                            title="Edit genres"
                                        >
                                            <Highlighter size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                {isEditingDate ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="date"
                                            value={dateInput}
                                            onChange={(e) => setDateInput(e.target.value)}
                                            className="bg-[var(--bg-secondary)] border border-[var(--glass-border)] rounded-lg px-2 py-1.5 text-sm outline-none focus:border-[var(--accent-secondary)]"
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSaveDate();
                                                if (e.key === 'Escape') setIsEditingDate(false);
                                            }}
                                        />
                                        <button
                                            onClick={handleSaveDate}
                                            className="px-3 py-1.5 bg-[var(--accent-secondary)] text-white text-xs font-bold rounded-lg hover:brightness-110"
                                        >
                                            Save
                                        </button>
                                        <button
                                            onClick={() => setIsEditingDate(false)}
                                            className="px-3 py-1.5 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] text-xs font-medium rounded-lg hover:bg-[var(--glass-border)]"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1 group">
                                        <div className={`px-4 py-2 rounded-full border flex items-center gap-2 ${book.dateLastRead
                                            ? 'bg-white/5 border-white/10'
                                            : 'bg-[var(--bg-tertiary)]/50 border-dashed border-[var(--text-muted)]/30 text-[var(--text-muted)]'
                                            }`}>
                                            <Clock size={16} className={book.dateLastRead ? "text-[var(--accent-secondary)]" : ""} />
                                            <span className={!book.dateLastRead ? "italic" : ""}>
                                                {book.dateLastRead
                                                    ? `Last read ${new Date(book.dateLastRead).getFullYear()}`
                                                    : 'Set read date'}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => {
                                                // Default to today or existing date
                                                const d = book.dateLastRead ? new Date(book.dateLastRead) : new Date();
                                                setDateInput(d.toISOString().split('T')[0]);
                                                setIsEditingDate(true);
                                            }}
                                            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors rounded-full hover:bg-[var(--glass-highlight)]"
                                            title="Edit date"
                                        >
                                            <Highlighter size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>

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
