import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../utils/api';
import BookCard from '../components/BookCard';
import { ArrowLeft, Book, Trophy } from 'lucide-react';

export default function AuthorDetail() {
    const { id } = useParams();
    const [author, setAuthor] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAuthor();
    }, [id]);

    const loadAuthor = async () => {
        try {
            const data = await api.getAuthor(id);
            setAuthor(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Loading...</div>;
    if (!author) return <div>Author not found</div>;

    const totalHighlights = author.highlights?.length || 0;
    const totalXP = totalHighlights * 10;
    // Level = sqrt(XP / 100)
    const level = Math.floor(Math.sqrt(totalXP / 100));

    return (
        <div className="space-y-8">
            <Link to="/authors" className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                <ArrowLeft size={16} />
                Back to Authors
            </Link>

            <div className="glass-panel p-8 rounded-2xl">
                <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-3xl font-bold text-white">
                        {author.name.substring(0, 2)}
                    </div>
                    <div className="text-center md:text-left">
                        <h1 className="text-3xl font-bold mb-2">{author.name}</h1>
                        <div className="flex items-center gap-6 justify-center md:justify-start text-sm text-[var(--text-secondary)]">
                            <span className="flex items-center gap-2">
                                <Book size={16} />
                                {author.books?.length} Books
                            </span>
                            <span className="flex items-center gap-2 text-[var(--accent-gold)] font-bold">
                                <Trophy size={16} />
                                Lvl {level || 1}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div>
                <h2 className="text-xl font-bold mb-6">Bibliography</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {author.books?.map(book => (
                        <BookCard key={book.id} book={{ ...book, author: author }} />
                    ))}
                </div>
            </div>
        </div>
    );
}
