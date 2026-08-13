import express from 'express';
import { db } from '../database/db.js';
import { achievements, userAchievements } from '../database/schema.js';
import { eq } from 'drizzle-orm';

const router = express.Router();

// Manual Achievement Check Endpoint
router.post('/check', async (req, res) => {
    try {
        const { checkAchievements } = await import('../services/achievements.js');
        const newUnlocks = await checkAchievements(1, ['ALL']);

        // Recalculate stats to include new XP
        const { recalculateStats } = await import('../services/stats.js');
        await recalculateStats().catch(console.error);

        res.json({ success: true, newUnlocks });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get User Achievements (List)
router.get('/', async (req, res) => {
    try {
        const allAchievements = await db.query.achievements.findMany({
            orderBy: (achievements, { asc }) => [asc(achievements.xpReward)],
        });

        const userUnlocks = await db.query.userAchievements.findMany({
            where: eq(userAchievements.userId, 1)
        });

        const unlockMap = new Map(userUnlocks.map(ua => [ua.achievementId, ua]));

        const result = allAchievements.map(a => {
            const unlock = unlockMap.get(a.id);
            return {
                ...a,
                unlocked: !!(unlock?.unlockedAt),
                unlockedAt: unlock?.unlockedAt || null,
                progress: unlock?.progress || 0
            };
        });

        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
