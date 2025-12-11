import React, { useEffect, useState } from 'react';
import RandomHighlight from '../components/RandomHighlight';
import { api } from '../utils/api';

export default function Home() {
    const [stats, setStats] = useState(null);

    useEffect(() => {
        api.getStats().then(setStats).catch(console.error);
    }, []);

    const totalHighlights = stats?.totalHighlights || 0;
    const booksRead = stats?.booksRead || 0;
    // Mock streak for now until we have real streak logic
    const streak = stats?.streak || 0;

    return (
        <div className="max-w-4xl mx-auto space-y-12">
            <section>
                <div className="mb-2">
                    <h1 className="text-3xl font-bold">Welcome back, Frank</h1>
                    <p className="text-[var(--text-secondary)]">Ready to remember what you read?</p>
                </div>

                <div className="mt-8">
                    <RandomHighlight />
                </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-panel p-6 rounded-xl">
                    <h3 className="text-[var(--text-secondary)] text-sm font-medium mb-1">Total Highlights</h3>
                    <p className="text-3xl font-bold">{totalHighlights.toLocaleString()}</p>
                </div>
                <div className="glass-panel p-6 rounded-xl">
                    <h3 className="text-[var(--text-secondary)] text-sm font-medium mb-1">Books Read</h3>
                    <p className="text-3xl font-bold">{booksRead}</p>
                </div>
                <div className="glass-panel p-6 rounded-xl">
                    <h3 className="text-[var(--text-secondary)] text-sm font-medium mb-1">Current Streak</h3>
                    <p className="text-3xl font-bold text-[var(--accent-primary)]">{streak} days</p>
                </div>
            </section>
        </div>
    );
}
