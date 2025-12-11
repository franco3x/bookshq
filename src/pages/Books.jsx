import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import BookCard from '../components/BookCard';
import { BookOpen, Search, LayoutGrid, List as ListIcon, User, Highlighter, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Books() {
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [viewMode, setViewMode] = useState('grid');
    const [sortBy, setSortBy] = useState('dateLastRead'); // 'title', 'author', 'highlightCount', 'dateLastRead'

    useEffect(() => {
        loadBooks();
    }, []);

    const loadBooks = async () => {
        try {
            const data = await api.getBooks();
            setBooks(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const filteredBooks = books.filter(b =>
        b.title.toLowerCase().includes(filter.toLowerCase()) ||
        b.author?.name.toLowerCase().includes(filter.toLowerCase())
    ).sort((a, b) => {
        switch (sortBy) {
            case 'title':
                return a.title.localeCompare(b.title);
            case 'author':
                return (a.author?.name || '').localeCompare(b.author?.name || '');
            case 'highlightCount':
                return (b.highlightCount || 0) - (a.highlightCount || 0);
            case 'dateLastRead':
                return new Date(b.dateLastRead || 0) - new Date(a.dateLastRead || 0);
            default:
                return 0;
        }
    });

    // Reverse logic for dates/counts to be descending by default, but title/author ascending
    // Actually standard sort logic is better directly in switch above.
    // 'dateLastRead': b - a (descending, newest first)
    // 'highlightCount': b - a (descending, most first)
    // 'title': a - b (ascending, A-Z)

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-display mb-1">My Library</h1>
                    <p className="text-[var(--text-secondary)]">
                        {books.length} books with highlights
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Sort Dropdown */}
                    <div className="relative group">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="appearance-none bg-[var(--bg-secondary)] border border-[var(--glass-border)] text-[var(--text-secondary)] py-2 pl-3 pr-8 rounded-lg outline-none focus:border-[var(--accent-primary)] cursor-pointer hover:bg-[var(--glass-highlight)] transition-colors"
                        >
                            <option value="dateLastRead">Last Read</option>
                            <option value="highlightCount">Most Highlights</option>
                            <option value="title">Title (A-Z)</option>
                            <option value="author">Author (A-Z)</option>
                        </select>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]">
                            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>

                    {/* View Toggle */}
                    <div className="flex items-center gap-1 bg-[var(--bg-secondary)] p-1 rounded-lg border border-[var(--glass-border)]">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-[var(--bg-tertiary)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                        >
                            <LayoutGrid size={20} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-[var(--bg-tertiary)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                        >
                            <ListIcon size={20} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="glass-panel p-4 rounded-xl flex items-center gap-4">
                <Search className="text-[var(--text-muted)]" size={20} />
                <input
                    type="text"
                    placeholder="Filter books..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="bg-transparent border-none outline-none flex-1 text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                />
            </div>

            {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 animate-pulse">
                    {[...Array(10)].map((_, i) => (
                        <div key={i} className="h-72 bg-[var(--bg-tertiary)] rounded-xl" />
                    ))}
                </div>
            ) : filteredBooks.length > 0 ? (
                <>
                    {viewMode === 'grid' ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            {filteredBooks.map(book => (
                                <BookCard key={book.id} book={book} />
                            ))}
                        </div>
                    ) : (
                        <div className="glass-panel rounded-xl overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-sm uppercase tracking-wider font-medium">
                                    <tr>
                                        <th className="p-4">Title</th>
                                        <th className="p-4">Author</th>
                                        <th className="p-4 text-center">Highlights</th>
                                        <th className="p-4 text-right">Last Read</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--glass-border)]">
                                    {filteredBooks.map(book => (
                                        <tr key={book.id} className="group hover:bg-[var(--glass-highlight)] transition-colors">
                                            <td className="p-4">
                                                <Link to={`/books/${book.id}`} className="font-bold text-[var(--text-primary)] hover:text-[var(--accent-primary)] transition-colors flex items-center gap-2">
                                                    <BookOpen size={14} className="text-[var(--text-muted)]" />
                                                    {book.title}
                                                </Link>
                                            </td>
                                            <td className="p-4">
                                                {book.author && (
                                                    <Link to={`/authors/${book.author.id}`} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-2">
                                                        <User size={14} className="text-[var(--text-muted)]" />
                                                        {book.author.name}
                                                    </Link>
                                                )}
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--glass-border)]">
                                                    <Highlighter size={12} />
                                                    {book.highlightCount || 0}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right text-[var(--text-muted)] text-sm">
                                                {book.dateLastRead ? (
                                                    <span className="flex items-center justify-end gap-1">
                                                        <Calendar size={12} />
                                                        {new Date(book.dateLastRead).toLocaleDateString()}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            ) : (
                <div className="text-center py-20 opacity-50">
                    <BookOpen size={48} className="mx-auto mb-4" />
                    <p className="text-xl">No books found</p>
                </div>
            )}
        </div>
    );
}
