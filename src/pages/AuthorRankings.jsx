import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { Trophy, Medal, Award } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AuthorRankings() {
    const [authors, setAuthors] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await api.getAuthorRankings();
                setAuthors(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    if (loading) return <div className="p-8">Loading leaderboard...</div>;

    const getRankIcon = (index) => {
        if (index === 0) return <Trophy size={20} className="text-yellow-400" />;
        if (index === 1) return <Medal size={20} className="text-gray-400" />;
        if (index === 2) return <Award size={20} className="text-amber-600" />;
        return <span className="text-[var(--text-secondary)] font-bold w-5 text-center">{index + 1}</span>;
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold mb-2">Author Mastery 👑</h1>
                <p className="text-[var(--text-secondary)]">Your top authors ranked by XP gained.</p>
            </div>

            <div className="glass-panel overflow-hidden rounded-2xl">
                <table className="w-full text-left">
                    <thead className="bg-[var(--bg-secondary)] border-b border-[var(--glass-border)]">
                        <tr>
                            <th className="p-4 w-16 text-center">Rank</th>
                            <th className="p-4">Author</th>
                            <th className="p-4 text-center">Level</th>
                            <th className="p-4 text-right">Total XP</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--glass-border)]">
                        {authors.map((item, index) => (
                            <tr key={item.id} className="hover:bg-[var(--bg-secondary)]/50 transition-colors">
                                <td className="p-4 text-center flex justify-center items-center h-full">
                                    {getRankIcon(index)}
                                </td>
                                <td className="p-4 font-medium">
                                    <Link to={`/author/${item.author.id}`} className="hover:text-[var(--accent-primary)] transition-colors">
                                        {item.author.name}
                                    </Link>
                                </td>
                                <td className="p-4 text-center">
                                    <span className="bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] px-2 py-1 rounded text-sm font-bold">
                                        Lvl {item.level}
                                    </span>
                                </td>
                                <td className="p-4 text-right font-mono text-[var(--text-secondary)]">
                                    {item.xp.toLocaleString()}
                                </td>
                            </tr>
                        ))}
                        {authors.length === 0 && (
                            <tr>
                                <td colSpan="4" className="p-8 text-center text-[var(--text-secondary)]">
                                    No ranked authors yet. Start reading!
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
