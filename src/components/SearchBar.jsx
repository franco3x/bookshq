import React, { useState, useEffect, useRef } from 'react';
import { Search, Book, User, Highlighter, Loader } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function SearchBar() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);
    const navigate = useNavigate();

    // Debounce search
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (query.length >= 2) {
                performSearch(query);
            } else {
                setResults(null);
            }
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [query]);

    // Click outside to close
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const performSearch = async (q) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
            const data = await res.json();
            setResults(data);
            setIsOpen(true);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = () => {
        setIsOpen(false);
        setQuery('');
    };

    return (
        <div ref={wrapperRef} className="w-96 relative z-50">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
            <input
                type="text"
                placeholder="Search books, authors, highlights..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => { if (results) setIsOpen(true) }}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-transparent focus:border-[var(--glass-border)] focus:bg-[var(--bg-secondary)] outline-none text-sm transition-all"
            />

            {loading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader size={14} className="animate-spin text-[var(--accent-primary)]" />
                </div>
            )}

            {isOpen && results && (results.books.length > 0 || results.authors.length > 0 || results.highlights.length > 0) && (
                <div className="absolute top-full mt-2 w-full bg-[var(--bg-secondary)] border border-[var(--glass-border)] rounded-xl shadow-2xl overflow-hidden max-h-96 overflow-y-auto ring-1 ring-black/5">

                    {results.books.length > 0 && (
                        <div className="p-2">
                            <div className="text-xs font-bold text-[var(--text-muted)] px-3 py-1 uppercase tracking-wider">Books</div>
                            {results.books.map(book => (
                                <Link
                                    key={book.id}
                                    to={`/books/${book.id}`}
                                    onClick={handleSelect}
                                    className="flex items-center gap-3 px-3 py-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
                                >
                                    <Book size={14} className="text-[var(--accent-secondary)]" />
                                    <span className="text-sm truncate">{book.title}</span>
                                </Link>
                            ))}
                        </div>
                    )}

                    {results.authors.length > 0 && (
                        <div className="p-2 border-t border-[var(--glass-border)]">
                            <div className="text-xs font-bold text-[var(--text-muted)] px-3 py-1 uppercase tracking-wider">Authors</div>
                            {results.authors.map(author => (
                                <Link
                                    key={author.id}
                                    to={`/authors/${author.id}`}
                                    onClick={handleSelect}
                                    className="flex items-center gap-3 px-3 py-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
                                >
                                    <User size={14} className="text-[var(--accent-purple)]" />
                                    <span className="text-sm truncate">{author.name}</span>
                                </Link>
                            ))}
                        </div>
                    )}

                    {results.highlights.length > 0 && (
                        <div className="p-2 border-t border-[var(--glass-border)]">
                            <div className="text-xs font-bold text-[var(--text-muted)] px-3 py-1 uppercase tracking-wider">Highlights</div>
                            {results.highlights.map(highlight => (
                                <div
                                    key={highlight.id}
                                    className="flex items-start gap-3 px-3 py-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors cursor-default"
                                >
                                    <Highlighter size={14} className="text-[var(--accent-gold)] mt-1 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm line-clamp-2">"{highlight.text}"</p>
                                        <p className="text-xs text-[var(--text-muted)] mt-0.5">{highlight.book?.title}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
