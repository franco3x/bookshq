
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, X } from 'lucide-react';
import * as Icons from 'lucide-react';

export default function AchievementToast({ achievement, onClose }) {
    useEffect(() => {
        const timer = setTimeout(onClose, 5000);
        return () => clearTimeout(timer);
    }, [onClose]);

    if (!achievement) return null;

    // Dynamic Icon
    const IconComponent = Icons[achievement.icon] || Trophy;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.9 }}
                className="fixed bottom-8 right-8 z-[100]"
            >
                <div className="bg-[var(--bg-secondary)] border border-[var(--accent-gold)]/50 shadow-2xl shadow-[var(--accent-gold)]/20 p-4 rounded-xl flex items-center gap-4 min-w-[320px] backdrop-blur-xl relative overflow-hidden">
                    {/* Shimmer Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />

                    <div className="w-12 h-12 rounded-full bg-[var(--accent-gold)]/20 flex items-center justify-center flex-shrink-0 border border-[var(--accent-gold)]/50">
                        <IconComponent className="text-[var(--accent-gold)]" size={24} />
                    </div>

                    <div className="flex-1 z-10">
                        <p className="text-xs uppercase tracking-wider text-[var(--accent-gold)] font-bold mb-0.5">
                            Achievement Unlocked!
                        </p>
                        <h4 className="font-bold text-[var(--text-primary)]">{achievement.title}</h4>
                        <p className="text-sm text-[var(--accent-gold)]">+{achievement.xpReward} XP</p>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-[var(--bg-tertiary)] rounded-full transition-colors z-10"
                    >
                        <X size={16} className="text-[var(--text-muted)]" />
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
