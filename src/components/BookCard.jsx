import React from 'react';
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
        <div className="glass-panel rounded-xl overflow-hidden card-hover group cursor-pointer relative">
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
                <p className="text-sm text-[var(--text-secondary)]">{book.author?.name || 'Unknown Author'}</p>

                <div className="mt-4 flex items-center justify-between text-xs text-[var(--text-muted)]">
                    <span>{book.highlightCount || 0} highlights</span>
                    {book.dateLastRead && <span>Read {new Date(book.dateLastRead).getFullYear()}</span>}
                </div>
            </div>
        </div>
    );
}
