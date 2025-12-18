import React from 'react';
import { Link } from 'react-router-dom';
import { User, BookOpen, Highlighter } from 'lucide-react';

export default function AuthorCard({ author }) {
    const totalHighlights = author.totalHighlights || 0;
    const level = author.authorLevel?.level || 1;

    return (
        <Link to={`/authors/${author.id}`} className="glass-panel p-6 rounded-xl flex items-center gap-4 hover:bg-[var(--glass-highlight)] transition-colors cursor-pointer group">
            <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <span className="text-xl font-bold text-white">
                        {author.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </span>
                </div>
                <div className="absolute -bottom-1 -right-1 bg-[var(--accent-gold)] text-black text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-[var(--bg-secondary)] shadow-sm">
                    Lvl {level}
                </div>
            </div>

            <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg text-[var(--text-primary)] truncate">{author.name}</h3>
                <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)] mt-1">
                    <span className="flex items-center gap-1">
                        <BookOpen size={14} />
                        {author.bookCount || 0} books
                    </span>
                    <span className="flex items-center gap-1">
                        <Highlighter size={14} />
                        {totalHighlights} highlights
                    </span>
                </div>
            </div>
        </Link>
    );
}
