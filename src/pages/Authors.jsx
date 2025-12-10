import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import AuthorCard from '../components/AuthorCard';
import { Users, Search, LayoutGrid, List as ListIcon, BookOpen, Highlighter } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Authors() {
    const [authors, setAuthors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [viewMode, setViewMode] = useState('grid');

    useEffect(() => {
        loadAuthors();
    }, []);

    const loadAuthors = async () => {
        try {
            const data = await api.getAuthors();
            setAuthors(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const filteredAuthors = authors.filter(a =>
        a.name.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-display mb-1">Authors</h1>
                    <p className="text-[var(--text-secondary)]">
                        {authors.length} authors in your library
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
                    placeholder="Filter authors..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="bg-transparent border-none outline-none flex-1 text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                />
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                    {[...Array(9)].map((_, i) => (
                        <div key={i} className="h-24 bg-[var(--bg-tertiary)] rounded-xl" />
                    ))}
                </div>
            ) : filteredAuthors.length > 0 ? (
                <>
                    {viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredAuthors.map(author => (
                                <AuthorCard key={author.id} author={author} />
                            ))}
                        </div>
                    ) : (
                        <div className="glass-panel rounded-xl overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-sm uppercase tracking-wider font-medium">
                                    <tr>
                                        <th className="p-4">Author</th>
                                        <th className="p-4 text-center">Books</th>
                                        <th className="p-4 text-right">Total Highlights</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--glass-border)]">
                                    {filteredAuthors.map(author => {
                                        const totalHighlights = author.books?.reduce((sum, book) => sum + (book.highlightCount || 0), 0) || 0;

                                        return (
                                            <tr key={author.id} className="group hover:bg-[var(--glass-highlight)] transition-colors">
                                                <td className="p-4">
                                                    <Link to={`/authors/${author.id}`} className="font-bold text-[var(--text-primary)] hover:text-[var(--accent-primary)] transition-colors flex items-center gap-2">
                                                        <Users size={14} className="text-[var(--text-muted)]" />
                                                        {author.name}
                                                    </Link>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--glass-border)]">
                                                        <BookOpen size={12} />
                                                        {author.books?.length || 0}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <span className="inline-flex items-center gap-1 text-[var(--text-muted)] text-sm">
                                                        <Highlighter size={12} />
                                                        {totalHighlights}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            ) : (
                <div className="text-center py-20 opacity-50">
                    <Users size={48} className="mx-auto mb-4" />
                    <p className="text-xl">No authors found</p>
                </div>
            )}
        </div>
    );
}
