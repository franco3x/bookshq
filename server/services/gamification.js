import { db } from '../database/db';
import { userStats, categoryLevels, achievements } from '../database/schema';
import { eq, sql } from 'drizzle-orm';

const XP_CONFIG = {
    PER_HIGHLIGHT: 10,
    PER_BOOK: 100,
    LEVEL_BASE_XP: 100, // XP for Level 1
};

// Quadratic Formula: XP = 100 * Level^2
// Level = sqrt(XP / 100)
export function calculateLevel(xp) {
    if (xp < XP_CONFIG.LEVEL_BASE_XP) return 1;
    return Math.floor(Math.sqrt(xp / XP_CONFIG.LEVEL_BASE_XP));
}

export function xpForNextLevel(currentLevel) {
    return XP_CONFIG.LEVEL_BASE_XP * Math.pow(currentLevel + 1, 2);
}

export async function addXP(amount) {
    // Ensure stats record exists
    let stats = await db.query.userStats.findFirst();
    if (!stats) {
        [stats] = await db.insert(userStats).values({ totalXp: 0, readerLevel: 1 }).returning();
    }

    const newXP = stats.totalXp + amount;
    const newLevel = calculateLevel(newXP);

    await db.update(userStats)
        .set({
            totalXp: newXP,
            readerLevel: newLevel,
            updatedAt: new Date()
        })
        .where(eq(userStats.id, stats.id));

    return { newXP, newLevel, leveledUp: newLevel > stats.readerLevel };
}

// Hook to call when adding a highlight
export async function onHighlightAdded(count = 1) {
    return await addXP(count * XP_CONFIG.PER_HIGHLIGHT);
}
