import React from 'react';
import { motion } from 'framer-motion';

export default function ProgressMeter({ xp, level, nextLevelXP }) {
    const currentLevelXP = 100 * Math.pow(level, 2);
    const xpInLevel = xp - currentLevelXP;
    const xpRequiredForLevel = nextLevelXP - currentLevelXP;
    const percentage = Math.min(100, Math.max(0, (xpInLevel / xpRequiredForLevel) * 100));

    return (
        <div className="w-full">
            <div className="flex justify-between text-sm mb-2 font-medium">
                <span>Lvl {level}</span>
                <span>{Math.floor(xpInLevel)} / {xpRequiredForLevel} XP</span>
                <span>Lvl {level + 1}</span>
            </div>
            <div className="h-4 bg-[var(--bg-tertiary)] rounded-full overflow-hidden border border-[var(--glass-border)]">
                <motion.div
                    className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                />
            </div>
        </div>
    );
}
