import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { ArrowLeft, BookOpen, Globe, User, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

const LevelCard = ({ icon: Icon, title, data }) => (
    <div className="glass-panel p-6 rounded-2xl">
        <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-[var(--accent-primary)]/10 rounded-lg text-[var(--accent-primary)]">
                <Icon size={24} />
            </div>
            <h2 className="text-xl font-bold">{title}</h2>
        </div>

        {data.length === 0 ? (
            <div className="text-[var(--text-secondary)] text-sm">No data yet. Keep reading!</div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.map((item) => (
                    <div key={item.id} className="bg-[var(--bg-secondary)] p-4 rounded-xl border border-[var(--glass-border)] relative overflow-hidden group hover:border-[var(--accent-primary)] transition-colors">
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold truncate pr-8">{item.categoryValue}</h3>
                                <span className="text-[var(--accent-gold)] font-bold text-sm bg-[var(--accent-gold)]/10 px-2 py-0.5 rounded">
                                    Lvl {item.level}
                                </span>
                            </div>
                            <div className="w-full bg-[var(--bg-tertiary)] h-1.5 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-[var(--accent-primary)]"
                                    style={{ width: `${(item.xp % 100)}%` }} // Simplified progress for demo
                                />
                            </div>
                            <div className="text-xs text-[var(--text-secondary)] mt-1 text-right">
                                {item.xp.toLocaleString()} XP
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
    </div>
);

const TABS = [
    { id: 'genre', label: 'Genre Mastery', icon: BookOpen },
    { id: 'tag', label: 'Custom Tags', icon: BookOpen },
    { id: 'nationality', label: 'Global Reach', icon: Globe },
    { id: 'race', label: 'Diverse Voices', icon: Users },
    { id: 'gender', label: 'Gender Representation', icon: User },
    { id: 'vocation', label: 'Vocations', icon: Users },
];

export default function CategoryLevels() {
    const [categories, setCategories] = useState({ genre: [], gender: [], race: [], nationality: [], tag: [], vocation: [] });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('genre');
    const [showAllMap, setShowAllMap] = useState({}); // Track which tabs are expanded

    useEffect(() => {
        const load = async () => {
            try {
                const data = await api.getCategoryLevels();
                // Ensure all arrays exist even if backend doesn't return them yet
                setCategories({
                    ...data,
                    tag: data.tag || [],
                    vocation: data.vocation || []
                });
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    if (loading) return <div className="p-8">Loading dimensions...</div>;

    const currentData = categories[activeTab] || [];
    const CurrentTab = TABS.find(t => t.id === activeTab);

    // Limit to top 12 items unless "Show All" is clicked
    const INITIAL_DISPLAY_COUNT = 12;
    const isShowingAll = showAllMap[activeTab];
    const displayData = isShowingAll ? currentData : currentData.slice(0, INITIAL_DISPLAY_COUNT);
    const hasMore = currentData.length > INITIAL_DISPLAY_COUNT;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Reading Dimensions 🌌</h1>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex overflow-x-auto pb-2 gap-2 border-b border-[var(--glass-border)] scrollbar-hide">
                {TABS.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-3 rounded-t-lg transition-colors whitespace-nowrap border-b-2 ${isActive
                                ? 'border-[var(--accent-primary)] text-[var(--text-primary)] bg-[var(--bg-secondary)]'
                                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-highlight)]'
                                }`}
                        >
                            <Icon size={18} className={isActive ? 'text-[var(--accent-primary)]' : ''} />
                            <span className="font-medium">{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            <div className="glass-panel p-6 rounded-b-xl rounded-tr-xl min-h-[400px]">
                <div className="mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        {CurrentTab && (
                            <>
                                <CurrentTab.icon className="text-[var(--accent-primary)]" size={24} />
                                {CurrentTab.label}
                            </>
                        )}
                    </h2>
                    <p className="text-[var(--text-secondary)] text-sm mt-1">
                        {isShowingAll
                            ? `Showing all ${currentData.length}`
                            : `Showing top ${Math.min(INITIAL_DISPLAY_COUNT, currentData.length)} of ${currentData.length}`
                        } {activeTab === 'nationality' ? 'countries' : activeTab === 'race' ? 'identities' : 'categories'}
                    </p>
                </div>

                {currentData.length === 0 ? (
                    <div className="text-center py-20 opacity-50">
                        <CurrentTab.icon size={48} className="mx-auto mb-4 text-[var(--text-muted)]" />
                        <p className="text-lg">No data yet for this dimension.</p>
                        <p className="text-sm">Import more books to unlock stats!</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {displayData.map((item) => {
                                // Determine link target based on active tab
                                let linkTarget = '/books';
                                const encodedValue = encodeURIComponent(item.categoryValue);

                                switch (activeTab) {
                                    case 'genre':
                                        linkTarget = `/books?genre=${encodedValue}`;
                                        break;
                                    case 'tag':
                                        linkTarget = `/books?tag=${encodedValue}`;
                                        break;
                                    case 'nationality':
                                        linkTarget = `/books?nationality=${encodedValue}`;
                                        break;
                                    case 'race':
                                        linkTarget = `/books?race=${encodedValue}`;
                                        break;
                                    case 'gender':
                                        linkTarget = `/books?gender=${encodedValue}`;
                                        break;
                                    case 'vocation':
                                        linkTarget = `/books?vocation=${encodedValue}`;
                                        break;
                                }

                                return (
                                    <Link
                                        key={item.id}
                                        to={linkTarget}
                                        className="block bg-[var(--bg-secondary)] p-4 rounded-xl border border-[var(--glass-border)] relative overflow-hidden group hover:border-[var(--accent-primary)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        <div className="relative z-10">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-bold truncate pr-2 flex-1" title={item.categoryValue}>
                                                    {item.categoryValue}
                                                </h3>
                                                <span className="text-[var(--accent-gold)] font-bold text-xs bg-[var(--accent-gold)]/10 px-2 py-1 rounded shrink-0 ml-2">
                                                    Lvl {item.level}
                                                </span>
                                            </div>
                                            <div className="w-full bg-[var(--bg-tertiary)] h-1.5 rounded-full overflow-hidden mb-2">
                                                <div
                                                    className="h-full bg-[var(--accent-primary)]"
                                                    style={{ width: `${Math.min(100, Math.max(5, (item.xp % 100)))}%` }}
                                                />
                                            </div>
                                            <div className="text-xs text-[var(--text-secondary)] flex justify-between">
                                                <span>{item.xp.toLocaleString()} XP</span>
                                                <span>Next Lvl: {100 * Math.pow(item.level + 1, 2) - item.xp} XP</span>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>

                        {/* Show All / Show Less Button */}
                        {hasMore && (
                            <div className="mt-6 text-center">
                                <button
                                    onClick={() => setShowAllMap({ ...showAllMap, [activeTab]: !isShowingAll })}
                                    className="px-6 py-2 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--glass-border)] rounded-lg text-sm font-medium transition-colors"
                                >
                                    {isShowingAll
                                        ? '▲ Show Less'
                                        : `▼ Show All ${currentData.length} Categories`
                                    }
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
