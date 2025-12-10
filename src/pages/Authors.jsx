import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import AuthorCard from '../components/AuthorCard';
import { Users, Search } from 'lucide-react';

export default function Authors() {
    const [authors, setAuthors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

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
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Authors</h1>
                    <p className="text-[var(--text-secondary)]">
                        {authors.length} authors in your library
                    </p>
                </div>

                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                    <input
                        type="text"
                        placeholder="Filter authors..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--glass-border)] focus:border-[var(--glass-border)] outline-none text-sm"
                    />
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                    {[...Array(9)].map((_, i) => (
                        <div key={i} className="h-24 bg-[var(--bg-tertiary)] rounded-xl" />
                    ))}
                </div>
            ) : filteredAuthors.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredAuthors.map(author => (
                        <AuthorCard key={author.id} author={author} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 opacity-50">
                    <Users size={48} className="mx-auto mb-4" />
                    <p className="text-xl">No authors found</p>
                </div>
            )}
        </div>
    );
}
