import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../utils/api';
import HighlightCard from '../components/HighlightCard';
import { ArrowLeft, BookOpen, User } from 'lucide-react';
import { motion } from 'framer-motion';

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

    if (loading) return <div>Loading...</div>;
    if (!book) return <div>Book not found</div>;

    return (
        <div className="space-y-8">
            <Link to="/books" className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                <ArrowLeft size={16} />
                Back to Library
            </Link>

            {/* Header */}
            <div className="glass-panel p-8 rounded-2xl flex flex-col md:flex-row gap-8 items-start">
                <div className="w-32 h-48 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-xl flex-shrink-0 flex items-center justify-center">
                    {book.coverImage ? (
                        <img src={book.coverImage} alt={book.title} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                        <BookOpen size={48} className="text-white/30" />
                    )}
                </div>

                <div>
                    <h1 className="text-3xl font-bold font-serif mb-2">{book.title}</h1>
                    <Link to={`/authors/${book.author?.id}`} className="text-xl text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors flex items-center gap-2 mb-6">
                        <User size={18} />
                        {book.author?.name}
                    </Link>

                    <div className="flex gap-4">
                        <div className="px-4 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--glass-border)]">
                            <span className="block text-xs text-[var(--text-muted)] uppercase tracking-wider">Highlights</span>
                            <span className="text-lg font-bold">{book.highlights?.length || 0}</span>
                        </div>
                        <div className="px-4 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--glass-border)]">
                            <span className="block text-xs text-[var(--text-muted)] uppercase tracking-wider">XP Earned</span>
                            <span className="text-lg font-bold text-[var(--accent-gold)]">
                                {(book.highlights?.length || 0) * 10}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Highlights */}
            <div className="max-w-3xl mx-auto space-y-6">
                <h2 className="text-xl font-bold sticky top-0 bg-[var(--bg-primary)]/80 backdrop-blur py-4 z-10">
                    Highlights
                </h2>
                {book.highlights?.map((highlight, index) => (
                    <HighlightCard key={highlight.id} highlight={{ ...highlight, book: book, author: book.author }} showBookInfo={false} />
                ))}
            </div>
        </div>
    );
}
