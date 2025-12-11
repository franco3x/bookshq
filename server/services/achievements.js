
import { db } from '../database/db.js';
import { achievements, userAchievements, books, highlights } from '../database/schema.js';
import { eq, and, count, gte, sql } from 'drizzle-orm';

/**
 * Checks and awards achievements for a user.
 * triggers: 'READ', 'HIGHLIGHT', 'IMPORT', 'STREAK', 'ALL'
 */
export async function checkAchievements(userId = 1, triggers = ['ALL']) {
    console.log(`🏆 Checking achievements for User ${userId}...`);
    const newUnlocks = [];

    try {
        // 1. Fetch Current Stats
        // We calculate these live to ensure accuracy
        const [booksReadRes] = await db.select({ count: count() }).from(books).where(sql`${books.readCount} > 0`);
        const booksRead = booksReadRes.count;

        const [booksImportedRes] = await db.select({ count: count() }).from(books);
        const booksImported = booksImportedRes.count;

        const [highlightsRes] = await db.select({ count: count() }).from(highlights);
        const totalHighlights = highlightsRes.count;

        // Start Transaction to Ensure Consistency
        await db.transaction(async (tx) => {
            // 2. Fetch All Achievements
            const allAchievements = await tx.select().from(achievements);

            // 3. Fetch User's Existing Unlocks
            const existingUnlocks = await tx.select().from(userAchievements).where(eq(userAchievements.userId, userId));
            const unlockedIds = new Set(existingUnlocks.map(ua => ua.achievementId));

            // 4. Evaluate Conditions
            for (const achievement of allAchievements) {
                // Skip if already unlocked
                if (unlockedIds.has(achievement.id)) continue;

                let isUnlocked = false;
                let progress = 0;

                // Condition Logic
                switch (achievement.conditionType) {
                    case 'COUNT':
                        if (achievement.category === 'Reader') {
                            progress = booksRead;
                            isUnlocked = booksRead >= achievement.conditionValue;
                        } else if (achievement.category === 'Collector') {
                            progress = booksImported;
                            isUnlocked = booksImported >= achievement.conditionValue;
                        } else if (achievement.category === 'Highlighter') {
                            progress = totalHighlights;
                            isUnlocked = totalHighlights >= achievement.conditionValue;
                        }
                        break;

                    case 'STREAK':
                        // TODO: Implement Streak Logic
                        break;
                }

                if (isUnlocked) {
                    // Award the Achievement!
                    await tx.insert(userAchievements).values({
                        userId,
                        achievementId: achievement.id,
                        unlockedAt: new Date(),
                        progress: progress
                    });

                    // Add Query to returned list (enriched)
                    newUnlocks.push({
                        ...achievement,
                        unlockedAt: new Date()
                    });

                    console.log(`🎉 Unlocked: ${achievement.title}`);
                }
            }
        });

        return newUnlocks;

    } catch (error) {
        console.error('Error checking achievements:', error);
        return [];
    }
}
