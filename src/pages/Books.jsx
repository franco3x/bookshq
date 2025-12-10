import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import BookCard from '../components/BookCard';
import { BookOpen, Search } from 'lucide-react';

export default function Books() {
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

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
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold mb-2">My Library</h1>
                    <p className="text-[var(--text-secondary)]">
                        {books.length} books with highlights
                    </p>
                </div>

                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                    <input
                        type="text"
                        placeholder="Filter books..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--glass-border)] focus:border-[var(--glass-border)] outline-none text-sm"
                    />
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 animate-pulse">
                    {[...Array(10)].map((_, i) => (
                        <div key={i} className="h-72 bg-[var(--bg-tertiary)] rounded-xl" />
                    ))}
                </div>
            ) : filteredBooks.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {filteredBooks.map(book => (
                        <BookCard key={book.id} book={book} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 opacity-50">
                    <BookOpen size={48} className="mx-auto mb-4" />
                    <p className="text-xl">No books found</p>
                </div>
            )}
        </div>
    );
}
