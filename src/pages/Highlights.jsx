import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import HighlightCard from '../components/HighlightCard';
import { Highlighter, Search, LayoutGrid, List as ListIcon, ArrowUpDown, Calendar, Book as BookIcon, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

export default function Highlights() {
    console.log('🎯 Highlights component rendered!');

    const [highlights, setHighlights] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [viewMode, setViewMode] = useState('list');
    const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });

    console.log('📊 Current highlights state:', highlights);
    console.log('⏳ Loading state:', loading);

    useEffect(() => {
        console.log('⚡ useEffect is running!');
        loadHighlights();
    }, []);

    const loadHighlights = async () => {
        try {
            console.log('Fetching highlights from API...');
            const data = await api.getHighlights();
            console.log('Received data:', data);
            console.log('Data type:', typeof data, 'Is array:', Array.isArray(data));
            console.log('Data length:', data?.length);
            setHighlights(data);
            console.log('Highlights state set to:', data);
        } catch (error) {
            console.error('Error loading highlights:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSort = (key) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
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

    const sortedHighlights = getSortedHighlights();

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-display mb-1">All Highlights</h1>
                    <p className="text-[var(--text-secondary)]">
                        {highlights.length} saved passages
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
                                        <th className="p-4 w-1/2 cursor-pointer hover:text-[var(--text-primary)] transition-colors" onClick={() => handleSort('text')}>
                                            <div className="flex items-center gap-2">
                                                Highlight
                                                {sortConfig.key === 'text' && <ArrowUpDown size={14} className="text-[var(--accent-primary)]" />}
                                            </div>
                                        </th>
                                        <th className="p-4 cursor-pointer hover:text-[var(--text-primary)] transition-colors" onClick={() => handleSort('book')}>
                                            <div className="flex items-center gap-2">
                                                Book
                                                {sortConfig.key === 'book' && <ArrowUpDown size={14} className="text-[var(--accent-primary)]" />}
                                            </div>
                                        </th>
                                        <th className="p-4 cursor-pointer hover:text-[var(--text-primary)] transition-colors" onClick={() => handleSort('author')}>
                                            <div className="flex items-center gap-2">
                                                Author
                                                {sortConfig.key === 'author' && <ArrowUpDown size={14} className="text-[var(--accent-primary)]" />}
                                            </div>
                                        </th>
                                        <th className="p-4 text-right cursor-pointer hover:text-[var(--text-primary)] transition-colors" onClick={() => handleSort('createdAt')}>
                                            <div className="flex items-center justify-end gap-2">
                                                <Calendar size={14} />
                                                Date
                                                {sortConfig.key === 'createdAt' && <ArrowUpDown size={14} className="text-[var(--accent-primary)]" />}
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--glass-border)]">
                                    {sortedHighlights.map(highlight => (
                                        <tr key={highlight.id} className="group hover:bg-[var(--glass-highlight)] transition-colors">
                                            <td className="p-4 align-top">
                                                <p className="font-serif text-[var(--text-primary)] line-clamp-2 md:line-clamp-3 leading-relaxed">
                                                    "{highlight.text}"
                                                </p>
                                            </td>
                                            <td className="p-4 align-top">
                                                {highlight.book ? (
                                                    <Link to={`/books/${highlight.book.id}`} className="flex items-center gap-2 font-medium text-[var(--text-primary)] hover:text-[var(--accent-primary)] transition-colors">
                                                        <BookIcon size={14} className="text-[var(--text-muted)]" />
                                                        <span className="line-clamp-1">{highlight.book.title}</span>
                                                    </Link>
                                                ) : <span className="text-[var(--text-muted)]">-</span>}
                                            </td>
                                            <td className="p-4 align-top">
                                                {highlight.author ? (
                                                    <Link to={`/authors/${highlight.author.id}`} className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                                                        <User size={14} className="text-[var(--text-muted)]" />
                                                        <span className="line-clamp-1">{highlight.author.name}</span>
                                                    </Link>
                                                ) : <span className="text-[var(--text-muted)]">-</span>}
                                            </td>
                                            <td className="p-4 align-top text-right text-[var(--text-muted)] text-sm whitespace-nowrap">
                                                {highlight.createdAt ? format(new Date(highlight.createdAt), 'MMM d, yyyy') : '-'}
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
                    <Highlighter size={48} className="mx-auto mb-4" />
                    <p className="text-xl">No highlights found</p>
                </div>
            )}
        </div>
    );
}
