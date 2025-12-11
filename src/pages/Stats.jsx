import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import ProgressMeter from '../components/ProgressMeter';
import { Trophy, Zap, BookOpen, Highlighter } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Stats() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState(null);
    const [topAuthors, setTopAuthors] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [statsData, catData, authorData] = await Promise.all([
                api.getStats(),
                api.getCategoryLevels(),
                api.getAuthorRankings()
            ]);
            setStats(statsData);
            setCategories(catData);
            setTopAuthors(authorData);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Loading stats...</div>;

    // Calculate frontend derivables
    const currentXP = stats.totalXp || 0;
    // Calculate level dynamically to ensure sync with XP (XP = 100 * Level^2)
    // Level = sqrt(XP / 100)
    const currentLevel = Math.max(1, Math.floor(Math.sqrt(currentXP / 100)));
    const nextLevelXP = 100 * Math.pow(currentLevel + 1, 2);

    // Get top stats
    const topGenre = categories?.genre?.[0];
    const topAuthor = topAuthors?.[0];

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold">Reader Profile</h1>

            {/* Main Level Card */}
            <div className="glass-panel p-8 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-32 bg-[var(--accent-primary)]/10 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />

                <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
                    <div className="w-32 h-32 rounded-full border-4 border-[var(--accent-gold)] flex items-center justify-center bg-[var(--bg-tertiary)] shadow-[0_0_30px_rgba(234,179,8,0.3)]">
                        <div className="text-center">
                            <div className="text-xs text-[var(--accent-gold)] font-bold uppercase tracking-wider">Level</div>
                            <div className="text-4xl font-bold">{currentLevel}</div>
                        </div>
                    </div>

                    <div className="flex-1 w-full">
                        <h2 className="text-2xl font-bold mb-2">Keep Reading!</h2>
                        <p className="text-[var(--text-secondary)] mb-6">You're making great progress. Import more books to level up.</p>
                        <ProgressMeter xp={currentXP} level={currentLevel} nextLevelXP={nextLevelXP} />
                    </div>
                </div>
            </div>

            {/* Top Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Link to="/stats/categories" className="glass-panel p-6 rounded-xl hover:border-[var(--accent-primary)] transition-colors group">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            <BookOpen size={20} className="text-[var(--accent-primary)]" />
                            Top Genre
                        </h3>
                        <span className="text-xs text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">View All &rarr;</span>
                    </div>
                    {topGenre ? (
                        <div>
                            <div className="text-2xl font-bold mb-1">{topGenre.categoryValue}</div>
                            <div className="text-sm text-[var(--text-secondary)]">Level {topGenre.level} • {topGenre.xp.toLocaleString()} XP</div>
                        </div>
                    ) : (
                        <div className="text-[var(--text-secondary)]">No genre data yet</div>
                    )}
                </Link>

                <Link to="/stats/authors" className="glass-panel p-6 rounded-xl hover:border-[var(--accent-primary)] transition-colors group">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            <Trophy size={20} className="text-[var(--accent-gold)]" />
                            Top Author
                        </h3>
                        <span className="text-xs text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">View Rankings &rarr;</span>
                    </div>
                    {topAuthor ? (
                        <div>
                            <div className="text-2xl font-bold mb-1">{topAuthor.author.name}</div>
                            <div className="text-sm text-[var(--text-secondary)]">Level {topAuthor.level} • {topAuthor.xp.toLocaleString()} XP</div>
                        </div>
                    ) : (
                        <div className="text-[var(--text-secondary)]">No author data yet</div>
                    )}
                </Link>
            </div>

            {/* Grid Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="glass-panel p-6 rounded-xl flex items-center gap-4">
                    <div className="p-3 bg-purple-500/20 text-purple-400 rounded-lg">
                        <Zap size={24} />
                    </div>
                    <div>
                        <div className="text-sm text-[var(--text-secondary)]">Total XP</div>
                        <div className="text-2xl font-bold">{currentXP.toLocaleString()}</div>
                    </div>
                </div>
                {/* ... existing stats ... */}
                <div className="glass-panel p-6 rounded-xl flex items-center gap-4">
                    <div className="p-3 bg-blue-500/20 text-blue-400 rounded-lg">
                        <Highlighter size={24} />
                    </div>
                    <div>
                        <div className="text-sm text-[var(--text-secondary)]">Highlights</div>
                        <div className="text-2xl font-bold">{stats.totalHighlights}</div>
                    </div>
                </div>

                <div className="glass-panel p-6 rounded-xl flex items-center gap-4">
                    <div className="p-3 bg-green-500/20 text-green-400 rounded-lg">
                        <BookOpen size={24} />
                    </div>
                    <div>
                        <div className="text-sm text-[var(--text-secondary)]">Books Read</div>
                        <div className="text-2xl font-bold">{stats.booksRead || 0}</div>
                    </div>
                </div>

                <div className="glass-panel p-6 rounded-xl flex items-center gap-4">
                    <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-lg">
                        <BookOpen size={24} />
                    </div>
                    <div>
                        <div className="text-sm text-[var(--text-secondary)]">Total Library</div>
                        <div className="text-2xl font-bold">{stats.totalBooks}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
