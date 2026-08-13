import express from 'express';
import { db } from '../database/db.js';
import { books, highlights, categoryLevels, authorLevels } from '../database/schema.js';
import { desc, sql, gt } from 'drizzle-orm';

const router = express.Router();

// Manual Recalculate Stats Endpoint
router.post('/recalculate', async (req, res) => {
    try {
        // Check achievements first
        const { checkAchievements } = await import('../services/achievements.js');
        await checkAchievements(1, ['ALL']);

        // Then recalculate stats
        const { recalculateStats } = await import('../services/stats.js');
        const success = await recalculateStats();

        if (success) {
            res.json({ success: true, message: 'Achievements checked and stats recalculated' });
        } else {
            res.status(500).json({ error: 'Recalculation failed check server logs' });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/', async (req, res) => {
    try {
        const stats = await db.query.userStats.findFirst();

        // Count total highlights
        const highlightsCount = await db
            .select({ count: sql`count(*)`.mapWith(Number) })
            .from(highlights);

        // Count total books (Total Libary)
        const booksCount = await db
            .select({ count: sql`count(*)`.mapWith(Number) })
            .from(books);

        // Count books read (readCount > 0)
        const booksReadCount = await db
            .select({ count: sql`count(*)`.mapWith(Number) })
            .from(books)
            .where(gt(books.readCount, 0));

        res.json({
            ...stats,
            totalHighlights: highlightsCount[0].count,
            totalBooks: booksCount[0].count,
            booksRead: booksReadCount[0].count
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Category Levels (Genres, Demographics, Tags)
router.get('/categories', async (req, res) => {
    try {
        const categories = await db.query.categoryLevels.findMany({
            orderBy: [desc(categoryLevels.level), desc(categoryLevels.xp)]
        });

        // Group by type for easier frontend consumption
        const grouped = {
            genre: categories.filter(c => c.categoryType === 'genre'),
            tag: categories.filter(c => c.categoryType === 'tag'),
            gender: categories.filter(c => c.categoryType === 'gender'),
            race: categories.filter(c => c.categoryType === 'race'),
            nationality: categories.filter(c => c.categoryType === 'nationality'),
            vocation: categories.filter(c => c.categoryType === 'vocation'),
        };

        res.json(grouped);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Author Rankings (Top Leveled Authors)
router.get('/authors/rankings', async (req, res) => {
    try {
        const rankings = await db.query.authorLevels.findMany({
            with: { author: true },
            orderBy: [desc(authorLevels.level), desc(authorLevels.xp)],
            limit: 50,
        });
        res.json(rankings);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
