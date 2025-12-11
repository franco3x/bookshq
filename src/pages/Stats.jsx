import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import ProgressMeter from '../components/ProgressMeter';
import { Trophy, Zap, BookOpen, Highlighter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error }) {
    return (
        <div role="alert" className="p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-500">
            <p className="font-bold">Something went wrong:</p>
            <pre className="text-xs mt-2 overflow-auto">{error.message}</pre>
        </div>
    );
}

export default function Stats() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState(null);
    const [topAuthors, setTopAuthors] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');

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
    const currentLevel = Math.max(1, Math.floor(Math.sqrt(currentXP / 100)));
    const nextLevelXP = 100 * Math.pow(currentLevel + 1, 2);

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Reader Profile</h1>

                <div className="flex gap-2 p-1 bg-[var(--bg-tertiary)] rounded-lg">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'overview'
                            ? 'bg-[var(--bg-primary)] text-[var(--accent-primary)] shadow-sm'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                            }`}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('trophies')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'trophies'
                            ? 'bg-[var(--bg-primary)] text-[var(--accent-gold)] shadow-sm'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                            }`}
                    >
                        <Trophy size={16} />
                        Trophies
                    </button>
                </div>
            </div>

            {/* Main Level Card - Always visible */}
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

            {activeTab === 'overview' ? (
                <div className="space-y-8 fade-in">
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
                            {categories?.genre?.[0] ? (
                                <div>
                                    <div className="text-2xl font-bold mb-1">{categories.genre[0].categoryValue}</div>
                                    <div className="text-sm text-[var(--text-secondary)]">Level {categories.genre[0].level} • {categories.genre[0].xp.toLocaleString()} XP</div>
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
                            {topAuthors?.[0] ? (
                                <div>
                                    <div className="text-2xl font-bold mb-1">{topAuthors[0].author.name}</div>
                                    <div className="text-sm text-[var(--text-secondary)]">Level {topAuthors[0].level} • {topAuthors[0].xp.toLocaleString()} XP</div>
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
            ) : (
                <div className="fade-in">
                    <React.Suspense fallback={<div className="p-8 text-center text-[var(--text-muted)]">Loading trophies...</div>}>
                        <ErrorBoundary FallbackComponent={ErrorFallback}>
                            <AchievementsList />
                        </ErrorBoundary>
                    </React.Suspense>
                </div>
            )}
        </div>
    );
}

// Lazy load
const AchievementsList = React.lazy(() => import('../components/AchievementsList'));
