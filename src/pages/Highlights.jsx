import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import HighlightCard from '../components/HighlightCard';
import { Highlighter, Search, LayoutGrid, List as ListIcon, ArrowUpDown, Calendar, Book as BookIcon, User, ChevronDown, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

export default function Highlights() {
    console.log('🎯 Highlights component rendered!');

    const [highlights, setHighlights] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [filter, setFilter] = useState('');
    const [viewMode, setViewMode] = useState('list');
    const [sortConfig, setSortConfig] = useState({ key: 'book', direction: 'asc' });
    const [expandedBooks, setExpandedBooks] = useState(new Set());
    const [pagination, setPagination] = useState({ page: 1, hasMore: false, total: 0 });

    console.log('📊 Current highlights state:', highlights);
    console.log('⏳ Loading state:', loading);

    useEffect(() => {
        console.log('⚡ useEffect is running!');
        loadHighlights();
    }, []);

    const loadHighlights = async (page = 1) => {
        const isLoadingMore = page > 1;
        if (isLoadingMore) {
            setLoadingMore(true);
        } else {
            setLoading(true);
        }

        try {
            console.log(`Fetching highlights page ${page} from API...`);
            const response = await api.getHighlights(page, 100); // 100 highlights per page
            console.log('Received paginated data:', response);

            // Append to existing highlights if loading more, otherwise replace
            if (isLoadingMore) {
                setHighlights(prev => [...prev, ...response.data]);
            } else {
                setHighlights(response.data);
            }

            setPagination({
                page: response.pagination.page,
                hasMore: response.pagination.hasMore,
                total: response.pagination.total
            });

            console.log('Highlights state updated');
        } catch (error) {
            console.error('Error loading highlights:', error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const handleSort = (key) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const toggleBook = (bookId) => {
        setExpandedBooks(prev => {
            const newSet = new Set(prev);
            if (newSet.has(bookId)) {
                newSet.delete(bookId);
            } else {
                newSet.add(bookId);
            }
            return newSet;
        });
    };

    const getSortedHighlights = () => {
        let sorted = [...highlights];

        // Filter
        if (filter) {
            const lowQ = filter.toLowerCase();
            sorted = sorted.filter(h =>
                h.text.toLowerCase().includes(lowQ) ||
                h.book?.title.toLowerCase().includes(lowQ) ||
                h.author?.name.toLowerCase().includes(lowQ)
            );
        }

        // Sort
        sorted.sort((a, b) => {
            let aVal = a[sortConfig.key];
            let bVal = b[sortConfig.key];

            // Access nested properties
            if (sortConfig.key === 'book') {
                aVal = a.book?.title || '';
                bVal = b.book?.title || '';
            } else if (sortConfig.key === 'author') {
                aVal = a.author?.name || '';
                bVal = b.author?.name || '';
            }

            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return sorted;
    };

    // Group highlights by book
    const groupHighlightsByBook = (highlights) => {
        const grouped = {};
        highlights.forEach(h => {
            const bookId = h.book?.id || 'unknown';
            if (!grouped[bookId]) {
                grouped[bookId] = {
                    book: h.book,
                    author: h.author,
                    highlights: []
                };
            }
            grouped[bookId].highlights.push(h);
        });
        return Object.entries(grouped).map(([bookId, data]) => ({
            bookId: parseInt(bookId),
            ...data
        }));
    };

    const sortedHighlights = getSortedHighlights();
    const groupedData = groupHighlightsByBook(sortedHighlights);

    // Sort groups by book title
    groupedData.sort((a, b) => {
        const aVal = a.book?.title || '';
        const bVal = b.book?.title || '';
        if (sortConfig.key === 'book') {
            return sortConfig.direction === 'asc'
                ? aVal.localeCompare(bVal)
                : bVal.localeCompare(aVal);
        }
        return aVal.localeCompare(bVal);
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-display mb-1">All Highlights</h1>
                    <p className="text-[var(--text-secondary)]">
                        {highlights.length} saved passages from {groupedData.length} books
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
                    placeholder="Filter highlights..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="bg-transparent border-none outline-none flex-1 text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                />
            </div>

            {loading ? (
                <div className="space-y-4 animate-pulse">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-24 bg-[var(--bg-tertiary)] rounded-xl" />
                    ))}
                </div>
            ) : sortedHighlights.length > 0 ? (
                <>
                    {viewMode === 'grid' ? (
                        <div className="space-y-6 columns-1 md:columns-2 lg:columns-3 gap-6">
                            {sortedHighlights.map(highlight => (
                                <div key={highlight.id} className="break-inside-avoid mb-6">
                                    <HighlightCard highlight={highlight} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="glass-panel rounded-xl overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-sm uppercase tracking-wider font-medium">
                                    <tr>
                                        <th className="p-4 w-8"></th>
                                        <th
                                            className="p-4 cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                                            onClick={() => handleSort('book')}
                                        >
                                            <div className="flex items-center gap-2">
                                                Book
                                                {sortConfig.key === 'book' && <ArrowUpDown size={14} className="text-[var(--accent-primary)]" />}
                                            </div>
                                        </th>
                                        <th className="p-4">Author</th>
                                        <th className="p-4 text-center">Highlights</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--glass-border)]">
                                    {groupedData.map(group => (
                                        <React.Fragment key={group.bookId}>
                                            {/* Book Row */}
                                            <tr
                                                className="group hover:bg-[var(--glass-highlight)] transition-colors cursor-pointer"
                                                onClick={() => toggleBook(group.bookId)}
                                            >
                                                <td className="p-4">
                                                    {expandedBooks.has(group.bookId) ? (
                                                        <ChevronDown size={16} className="text-[var(--text-muted)]" />
                                                    ) : (
                                                        <ChevronRight size={16} className="text-[var(--text-muted)]" />
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    <Link
                                                        to={`/books/${group.book?.id}`}
                                                        className="flex items-center gap-2 font-bold text-[var(--text-primary)] hover:text-[var(--accent-primary)] transition-colors"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <BookIcon size={14} className="text-[var(--text-muted)]" />
                                                        <span>{group.book?.title}</span>
                                                    </Link>
                                                </td>
                                                <td className="p-4">
                                                    {group.author && (
                                                        <Link
                                                            to={`/authors/${group.author.id}`}
                                                            className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <User size={14} className="text-[var(--text-muted)]" />
                                                            <span>{group.author.name}</span>
                                                        </Link>
                                                    )}
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--glass-border)]">
                                                        {group.highlights.length}
                                                    </span>
                                                </td>
                                            </tr>

                                            {/* Highlights Rows (only if expanded) */}
                                            {expandedBooks.has(group.bookId) && group.highlights.map(highlight => (
                                                <tr key={highlight.id} className="bg-[var(--bg-secondary)]/30">
                                                    <td className="p-4"></td>
                                                    <td colSpan="3" className="p-4 pl-12">
                                                        <div className="flex items-start gap-4">
                                                            <div className="flex-1">
                                                                <p className="font-serif text-[var(--text-primary)] leading-relaxed mb-2">
                                                                    "{highlight.text}"
                                                                </p>
                                                                <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                                                                    <span className="flex items-center gap-1">
                                                                        <Calendar size={12} />
                                                                        {highlight.createdAt ? format(new Date(highlight.createdAt), 'MMM d, yyyy') : '-'}
                                                                    </span>
                                                                    {highlight.location && (
                                                                        <span>Location: {highlight.location}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            ) : (
                <div className="glass-panel p-12 rounded-xl text-center text-[var(--text-secondary)]">
                    No highlights found. Import your Kindle clippings to get started!
                </div>
            )}

            {/* Load More Button */}
            {!loading && pagination.hasMore && (
                <div className="flex justify-center mt-8">
                    <button
                        onClick={() => loadHighlights(pagination.page + 1)}
                        disabled={loadingMore}
                        className="px-6 py-3 bg-[var(--accent-primary)] text-white rounded-lg font-medium hover:bg-[var(--accent-secondary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {loadingMore ? 'Loading...' : `Load More (${highlights.length}/${pagination.total})`}
                    </button>
                </div>
            )}
        </div>
    );
}
