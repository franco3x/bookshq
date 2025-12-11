import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../utils/api';
import BookCard from '../components/BookCard';
import { Search, LayoutGrid, List as ListIcon, X, BookOpen, User, Highlighter, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Books() {
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('grid');
    const [sortBy, setSortBy] = useState('dateLastRead');
    const [selectedBooks, setSelectedBooks] = useState(new Set());
    const [searchParams, setSearchParams] = useSearchParams();
    const [bulkTagInput, setBulkTagInput] = useState('');
    const [isTagging, setIsTagging] = useState(false);

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

    const handleBulkTag = async () => {
        if (selectedBooks.size === 0 || !bulkTagInput.trim()) return;

        setIsTagging(true);
        try {
            // Parse tags (comma-separated, trim whitespace)
            const tags = bulkTagInput.split(',').map(t => t.trim()).filter(Boolean);
            await api.bulkUpdateTags(Array.from(selectedBooks), tags);

            // Reload books and clear selection
            await loadBooks();
            setSelectedBooks(new Set());
            setBulkTagInput('');
        } catch (e) {
            console.error(e);
            alert('Failed to update tags');
        } finally {
            setIsTagging(false);
        }
    };

    const toggleBookSelection = (bookId) => {
        const newSelection = new Set(selectedBooks);
        if (newSelection.has(bookId)) {
            newSelection.delete(bookId);
        } else {
            newSelection.add(bookId);
        }
        setSelectedBooks(newSelection);
    };
    // Get filter params from URL
    const tagFilter = searchParams.get('tag');
    const genreFilter = searchParams.get('genre');
    const nationalityFilter = searchParams.get('nationality');
    const raceFilter = searchParams.get('race');
    const genderFilter = searchParams.get('gender');

    // Filter and sort books
    const filteredBooks = books
        .filter(book => {
            // Search query filter
            const query = searchQuery.toLowerCase();
            const matchesSearch = book.title.toLowerCase().includes(query) ||
                book.author?.name.toLowerCase().includes(query);

            // Tag filter
            const matchesTag = !tagFilter || (book.tags && book.tags.includes(tagFilter));

            // Genre filter
            const matchesGenre = !genreFilter || book.genre === genreFilter;

            // Demographics filters
            const matchesNationality = !nationalityFilter || book.author?.nationality === nationalityFilter;
            const matchesRace = !raceFilter || book.author?.race === raceFilter;
            const matchesGender = !genderFilter || book.author?.gender === genderFilter;

            return matchesSearch && matchesTag && matchesGenre && matchesNationality && matchesRace && matchesGender;
        })
        .sort((a, b) => {
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

    // ... sort logic comments ...

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
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none outline-none flex-1 text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                />
            </div>

            {/* Active Filters */}
            {(tagFilter || genreFilter || nationalityFilter || raceFilter || genderFilter) && (
                <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-sm text-[var(--text-muted)]">Filtered by:</span>
                    {tagFilter && (
                        <div className="px-3 py-1 bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 rounded-full flex items-center gap-2 text-sm">
                            <span className="font-medium text-[var(--accent-primary)]">Tag: {tagFilter}</span>
                            <button
                                onClick={() => {
                                    searchParams.delete('tag');
                                    setSearchParams(searchParams);
                                }}
                                className="hover:bg-[var(--accent-primary)]/20 rounded-full p-0.5"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    )}
                    {genreFilter && (
                        <div className="px-3 py-1 bg-[var(--accent-secondary)]/10 border border-[var(--accent-secondary)]/20 rounded-full flex items-center gap-2 text-sm">
                            <span className="font-medium text-[var(--accent-secondary)]">Genre: {genreFilter}</span>
                            <button
                                onClick={() => {
                                    searchParams.delete('genre');
                                    setSearchParams(searchParams);
                                }}
                                className="hover:bg-[var(--accent-secondary)]/20 rounded-full p-0.5"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    )}
                    {nationalityFilter && (
                        <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center gap-2 text-sm">
                            <span className="font-medium text-blue-400">Nation: {nationalityFilter}</span>
                            <button
                                onClick={() => {
                                    searchParams.delete('nationality');
                                    setSearchParams(searchParams);
                                }}
                                className="hover:bg-blue-500/20 rounded-full p-0.5"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    )}
                    {raceFilter && (
                        <div className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full flex items-center gap-2 text-sm">
                            <span className="font-medium text-purple-400">Race: {raceFilter}</span>
                            <button
                                onClick={() => {
                                    searchParams.delete('race');
                                    setSearchParams(searchParams);
                                }}
                                className="hover:bg-purple-500/20 rounded-full p-0.5"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    )}
                    {genderFilter && (
                        <div className="px-3 py-1 bg-pink-500/10 border border-pink-500/20 rounded-full flex items-center gap-2 text-sm">
                            <span className="font-medium text-pink-400">Gender: {genderFilter}</span>
                            <button
                                onClick={() => {
                                    searchParams.delete('gender');
                                    setSearchParams(searchParams);
                                }}
                                className="hover:bg-pink-500/20 rounded-full p-0.5"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Bulk Tagging Toolbar */}
            {selectedBooks.size > 0 && (
                <div className="glass-panel p-4 rounded-xl flex items-center gap-4 bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]">
                    <div className="text-sm font-medium">
                        {selectedBooks.size} book{selectedBooks.size > 1 ? 's' : ''} selected
                    </div>
                    <input
                        type="text"
                        value={bulkTagInput}
                        onChange={(e) => setBulkTagInput(e.target.value)}
                        placeholder="Enter tags (comma-separated)"
                        className="flex-1 bg-[var(--bg-secondary)] border border-[var(--glass-border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--accent-primary)]"
                    />
                    <button
                        onClick={handleBulkTag}
                        disabled={isTagging || !bulkTagInput.trim()}
                        className="px-4 py-2 bg-[var(--accent-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--accent-secondary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isTagging ? 'Tagging...' : 'Tag Books'}
                    </button>
                    <button
                        onClick={() => setSelectedBooks(new Set())}
                        className="px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                        Clear
                    </button>
                </div>
            )}

            {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 animate-pulse">
                    {[...Array(10)].map((_, i) => (
                        <div key={i} className="h-72 bg-[var(--bg-tertiary)] rounded-xl" />
                    ))}
                </div>
            ) : filteredBooks.length > 0 ? (
                <>
                    {viewMode === 'grid' && (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                            {filteredBooks.map(book => (
                                <div key={book.id} className="relative">
                                    <input
                                        type="checkbox"
                                        checked={selectedBooks.has(book.id)}
                                        onChange={() => toggleBookSelection(book.id)}
                                        className="absolute top-2 left-2 z-10 w-5 h-5 cursor-pointer"
                                    />
                                    <BookCard book={book} />
                                </div>
                            ))}
                        </div>
                    )}
                    {viewMode === 'list' && (
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
