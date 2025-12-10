import React from 'react';
import { Link } from 'react-router-dom';
import { User } from 'lucide-react';

export default function AuthorCard({ author }) {
    return (
        <Link to={`/authors/${author.id}`} className="glass-panel p-6 rounded-xl flex items-center gap-4 hover:bg-[var(--glass-highlight)] transition-colors cursor-pointer group">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <span className="text-xl font-bold text-white">
                    {author.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </span>
            </div>

            <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg text-[var(--text-primary)] truncate">{author.name}</h3>
                <p className="text-sm text-[var(--text-secondary)]">
                    {author.books ? author.books.length : 0} books
                </p>
            </div>
        </Link>
    );
}
