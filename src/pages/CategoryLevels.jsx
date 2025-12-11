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

export default function CategoryLevels() {
    const [categories, setCategories] = useState({ genre: [], gender: [], race: [], nationality: [], tag: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await api.getCategoryLevels();
                // Ensure tags array exists even if backend doesn't return it yet
                setCategories({ ...data, tag: data.tag || [] });
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    if (loading) return <div className="p-8">Loading dimensions...</div>;

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Reading Dimensions 🌌</h1>
                    <p className="text-[var(--text-secondary)]">Track your mastery across different genres, demographics, and custom tags.</p>
                </div>
            </div>

            <div className="grid gap-8">
                <LevelCard
                    icon={BookOpen}
                    title="Genre Mastery"
                    data={categories.genre}
                />

                {categories.tag && categories.tag.length > 0 && (
                    <LevelCard
                        icon={BookOpen}
                        title="Custom Tags"
                        data={categories.tag}
                    />
                )}

                <div className="grid md:grid-cols-2 gap-8">
                    <LevelCard
                        icon={Globe}
                        title="Global Reach (Nationality)"
                        data={categories.nationality}
                    />
                    <LevelCard
                        icon={Users}
                        title="Diverse Voices (Race/Ethnicity)"
                        data={categories.race}
                    />
                </div>

                <LevelCard
                    icon={User}
                    title="Gender Representation"
                    data={categories.gender}
                />
            </div>
        </div>
    );
}
