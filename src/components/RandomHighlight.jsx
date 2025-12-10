import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import HighlightCard from './HighlightCard';
import { Shuffle, Loader } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function RandomHighlight() {
    const [highlight, setHighlight] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRandom();
    }, []);

    const fetchRandom = async () => {
        setLoading(true);
        try {
            const data = await api.getRandomHighlight();
            setHighlight(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold bg-gradient-to-r from-[var(--accent-gold)] to-orange-500 bg-clip-text text-transparent">
                    Daily Inspiration
                </h2>
                <button
                    onClick={fetchRandom}
                    disabled={loading}
                    className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                    <Shuffle size={14} />
                    <span>Shuffle</span>
                </button>
            </div>

            <div className="min-h-[200px]">
                {loading ? (
                    <div className="glass-panel p-8 rounded-xl flex items-center justify-center min-h-[200px]">
                        <Loader className="animate-spin text-[var(--accent-primary)]" />
                    </div>
                ) : highlight ? (
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={highlight.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <HighlightCard highlight={highlight} />
                        </motion.div>
                    </AnimatePresence>
                ) : (
                    <div className="glass-panel p-8 rounded-xl text-center text-[var(--text-muted)]">
                        <p>No highlights yet. Import some books!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
