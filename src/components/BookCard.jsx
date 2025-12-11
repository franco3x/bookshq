import React from 'react';
import { Link } from 'react-router-dom';
import { Book as BookIcon } from 'lucide-react';

export default function BookCard({ book }) {
    // Generate a random gradient based on title length if no cover
    const gradients = [
        'from-pink-500 to-rose-500',
        'from-blue-500 to-cyan-500',
        'from-emerald-500 to-teal-500',
        'from-violet-500 to-purple-500',
        'from-orange-500 to-amber-500'
    ];
    const gradient = gradients[book.title.length % gradients.length];

    return (
        <Link to={`/books/${book.id}`} className="glass-panel rounded-xl overflow-hidden card-hover group cursor-pointer relative block">
            <div className={`h-48 w-full bg-gradient-to-br ${gradient} flex items-center justify-center relative overflow-hidden`}>
                {book.coverImage ? (
                    <img src={book.coverImage} alt={book.title} className="w-full h-full object-cover" />
                ) : (
                    <div className="text-white/20 group-hover:scale-110 transition-transform duration-300">
                        <BookIcon size={64} />
                    </div>
                )}
                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
            </div>

            <div className="p-4">
                <h3 className="font-bold text-lg line-clamp-2 mb-1 text-[var(--text-primary)] leading-tight">{book.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] mb-2">{book.author?.name || 'Unknown Author'}</p>

                {/* Visual Tags */}
                {book.tags && Array.isArray(book.tags) && book.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                        {book.tags.slice(0, 3).map((tag, i) => (
                            <span key={i} className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] rounded-full">
                                {tag}
                            </span>
                        ))}
                        {book.tags.length > 3 && (
                            <span className="text-[10px] text-[var(--text-muted)]">+{book.tags.length - 3}</span>
                        )}
                    </div>
                )}

                <div className="mt-4 flex items-center justify-between text-xs text-[var(--text-muted)]">
                    <span>{book.highlightCount || 0} highlights</span>
                    {book.dateLastRead && <span>Read {new Date(book.dateLastRead).getFullYear()}</span>}
                </div>
            </div>
        </Link>
    );
}
