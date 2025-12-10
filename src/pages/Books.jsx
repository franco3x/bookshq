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
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-display mb-1">My Library</h1>
                    <p className="text-[var(--text-secondary)]">
                        {books.length} books with highlights
                    </p>
                </div>

                <div className="flex items-center gap-3 bg-[var(--bg-secondary)] p-1 rounded-lg border border-[var(--glass-border)]">
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
