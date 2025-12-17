
import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { Trophy, Lock, Star } from 'lucide-react';
import * as Icons from 'lucide-react';
import { format } from 'date-fns';

export default function AchievementsList() {
    const [achievements, setAchievements] = useState([]);
    const [loading, setLoading] = useState(true);
    // State for expanded categories
    const [expandedCategories, setExpandedCategories] = useState({});

    useEffect(() => {
        loadAchievements();
    }, []);

    const toggleCategory = (category) => {
        setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
    };

    const loadAchievements = async () => {
        try {
            const data = await api.getAchievements();
            setAchievements(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-[var(--text-muted)]">Loading trophies...</div>;

    // Group by category (filter out nulls)
    const categorySet = new Set(achievements.map(a => a.category).filter(Boolean));
    const categories = [...categorySet];

    // Custom Sort Order
    const sortOrder = ['Collector', 'Reader', 'Highlighter'];
    categories.sort((a, b) => {
        const indexA = sortOrder.indexOf(a);
        const indexB = sortOrder.indexOf(b);
        // If both are in the priority list, sort by index
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        // If only A is in list, A comes first
        if (indexA !== -1) return -1;
        // If only B is in list, B comes first
        if (indexB !== -1) return 1;
        // Otherwise alphabetical, handling potential null/undefined
        return (a || '').localeCompare(b || '');
    });



    return (
        <div className="space-y-8">
            {categories.map(category => {
                let categoryAchievements = achievements.filter(a => a.category === category);
                const isPriority = sortOrder.includes(category);

                // Sort non-priority categories by XP (highest tier first)
                if (!isPriority) {
                    categoryAchievements = categoryAchievements.sort((a, b) => b.xpReward - a.xpReward);
                }

                // Show all if priority, otherwise show max 6 unless expanded
                const showCount = (isPriority || expandedCategories[category]) ? categoryAchievements.length : 6;
                const visibleAchievements = categoryAchievements.slice(0, showCount);
                // const hasHidden = categoryAchievements.length > 6 && !isPriority && !expandedCategories[category];

                return (
                    <div key={category}>
                        <h3 className="text-lg font-bold text-[var(--text-secondary)] mb-4 flex items-center gap-2">
                            {category} Badges
                            <span className="bg-[var(--bg-tertiary)] text-xs px-2 py-0.5 rounded-full text-[var(--text-muted)]">
                                {categoryAchievements.filter(a => a.unlocked).length}/{categoryAchievements.length}
                            </span>
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {visibleAchievements.map(achievement => {
                                const IconComponent = (achievement.icon && Icons[achievement.icon]) ? Icons[achievement.icon] : Trophy;
                                const isUnlocked = achievement.unlocked;
                                const unlockedDate = achievement.unlockedAt ? new Date(achievement.unlockedAt) : null;
                                const isValidDate = unlockedDate && !isNaN(unlockedDate);

                                return (
                                    <div
                                        key={achievement.id}
                                        className={`relative p-4 rounded-xl border transition-all ${isUnlocked
                                            ? 'bg-[var(--bg-secondary)] border-[var(--glass-border)]'
                                            : 'bg-[var(--bg-tertiary)]/30 border-dashed border-[var(--glass-border)] opacity-60'
                                            }`}
                                    >
                                        <div className="flex gap-4">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${isUnlocked
                                                ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
                                                : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
                                                }`}>
                                                {isUnlocked ? <IconComponent size={24} /> : <Lock size={20} />}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start gap-2">
                                                    <h4 className={`font-bold text-sm leading-tight ${isUnlocked ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                                                        {achievement.title}
                                                    </h4>
                                                    {isUnlocked && (
                                                        <span className="text-[10px] text-[var(--accent-gold)] px-1.5 py-0.5 bg-[var(--accent-gold)]/10 rounded border border-[var(--accent-gold)]/20 whitespace-nowrap flex-shrink-0">
                                                            +{achievement.xpReward} XP
                                                        </span>
                                                    )}
                                                </div>

                                                <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">
                                                    {achievement.description}
                                                </p>

                                                {/* Progress Bar (if partially complete) */}
                                                {!isUnlocked && achievement.conditionType === 'COUNT' && achievement.progress > 0 && (
                                                    <div className="mt-3">
                                                        <div className="flex justify-between text-[10px] text-[var(--text-muted)] mb-1">
                                                            <span>Progress</span>
                                                            <span>{achievement.progress} / {achievement.conditionValue}</span>
                                                        </div>
                                                        <div className="h-1 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-[var(--text-muted)]/30"
                                                                style={{ width: `${Math.min(100, (achievement.progress / achievement.conditionValue) * 100)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {isUnlocked && isValidDate && (
                                                    <div className="mt-3 text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                                                        <Star size={10} className="text-[var(--accent-gold)]" fill="currentColor" />
                                                        Unlocked {format(unlockedDate, 'MMM d, yyyy')}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Pagination Toggle */}
                        {categoryAchievements.length > 6 && !isPriority && (
                            <button
                                onClick={() => toggleCategory(category)}
                                className="mt-4 text-xs font-medium text-[var(--accent-primary)] hover:underline flex items-center gap-1"
                            >
                                {expandedCategories[category] ? 'Show Less' : `Show All (${categoryAchievements.length})`}
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
