import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import HighlightCard from '../components/HighlightCard';
import { Highlighter, Search } from 'lucide-react';

export default function Highlights() {
    const [highlights, setHighlights] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        loadHighlights();
    }, []);

    const loadHighlights = async () => {
        try {
            const data = await api.getHighlights();
            setHighlights(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const filteredHighlights = highlights.filter(h =>
        h.text.toLowerCase().includes(filter.toLowerCase()) ||
        h.book?.title.toLowerCase().includes(filter.toLowerCase()) ||
        h.author?.name.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold mb-2">All Highlights</h1>
                    <p className="text-[var(--text-secondary)]">
                        {highlights.length} saved passages
                    </p>
                </div>

                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                    <input
                        type="text"
                        placeholder="Filter highlights..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--glass-border)] focus:border-[var(--glass-border)] outline-none text-sm"
                    />
                </div>
            </div>

            {loading ? (
                <div className="space-y-4 animate-pulse">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-48 bg-[var(--bg-tertiary)] rounded-xl" />
                    ))}
                </div>
            ) : filteredHighlights.length > 0 ? (
                <div className="space-y-6 columns-1 md:columns-2 lg:columns-3 gap-6">
                    {filteredHighlights.map(highlight => (
                        <div key={highlight.id} className="break-inside-avoid mb-6">
                            <HighlightCard highlight={highlight} />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 opacity-50">
                    <Highlighter size={48} className="mx-auto mb-4" />
                    <p className="text-xl">No highlights found</p>
                </div>
            )}
        </div>
    );
}
