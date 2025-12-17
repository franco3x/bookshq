
import { db } from '../database/db.js';
import { achievements, userAchievements, books, highlights } from '../database/schema.js';
import { eq, and, count, gte, sql } from 'drizzle-orm';

/**
 * Checks and awards achievements for a user.
 * triggers: 'READ', 'HIGHLIGHT', 'IMPORT', 'STREAK', 'ALL'
 */
// --- Helpers for Dynamic Achievements ---
const DYNAMIC_TIERS = [
    { level: 1, count: 1, name: 'Student', suffix: 'Explorer' },
    { level: 2, count: 3, name: 'Novice', suffix: 'Tourist' },
    { level: 3, count: 10, name: 'Devotee', suffix: 'Resident' },
    { level: 4, count: 25, name: 'Aficionado', suffix: 'Citizen' },
    { level: 5, count: 50, name: 'Authority', suffix: 'Ambassador' }
];

const VOCATION_TITLES = [
    { level: 1, prefix: 'Curious' },
    { level: 2, prefix: 'Apprentice' },
    { level: 3, prefix: 'Journeyman' },
    { level: 4, prefix: 'Master' },
    { level: 5, prefix: 'Grandmaster' }
];

const AUTHOR_TIERS = [
    { level: 1, count: 2, name: 'Fan' },
    { level: 2, count: 3, name: 'Devotee' },
    { level: 3, count: 4, name: 'Scholar' },
    { level: 4, count: 5, name: 'Disciple' },
    { level: 5, count: 6, name: 'Authority' }
];

/**
 * Checks and awards achievements for a user.
 * triggers: 'READ', 'HIGHLIGHT', 'IMPORT', 'STREAK', 'ALL'
 */
export async function checkAchievements(userId = 1, triggers = ['ALL']) {
    console.log(`🏆 Checking achievements for User ${userId}...`);
    const newUnlocks = [];

    try {
        // 1. Fetch Current Stats
        const [booksReadRes] = await db.select({ count: count() }).from(books).where(sql`${books.readCount} > 0`);
        const booksRead = booksReadRes.count;

        const [booksImportedRes] = await db.select({ count: count() }).from(books);
        const booksImported = booksImportedRes.count;

        const [highlightsRes] = await db.select({ count: count() }).from(highlights);
        const totalHighlights = highlightsRes.count;

        // --- Aggregations for Dynamic Categories ---
        // Genre Counts
        const booksWithGenre = await db.query.books.findMany({
            where: sql`${books.readCount} > 0`,
            columns: { genre: true }
        });
        const genreCounts = {};
        for (const b of booksWithGenre) {
            if (b.genre) genreCounts[b.genre] = (genreCounts[b.genre] || 0) + 1;
        }

        // Author Stats (Nationality, Vocation)
        const booksWithAuthors = await db.query.books.findMany({
            where: sql`${books.readCount} > 0`,
            with: {
                bookAuthors: {
                    with: { author: true }
                }
            }
        });

        const nationalityCounts = {};
        const vocationCounts = {};
        const authorCounts = {}; // Author Name -> Count of Unique Books

        // Helper: Iterate all authors of read books
        for (const b of booksWithAuthors) {
            for (const ba of b.bookAuthors) {
                const author = ba.author;
                if (!author) continue;

                if (author.nationality) {
                    const nats = Array.isArray(author.nationality) ? author.nationality : [author.nationality];
                    for (const n of nats) {
                        const key = n.trim();
                        nationalityCounts[key] = (nationalityCounts[key] || 0) + 1;
                    }
                }

                if (author.vocation) {
                    const vocs = Array.isArray(author.vocation) ? author.vocation : [author.vocation];
                    for (const v of vocs) {
                        const key = v.trim();
                        vocationCounts[key] = (vocationCounts[key] || 0) + 1;
                    }
                }

                // Author Counts (Name based)
                // Note: bookAuthors logic inside "booksWithAuthors" loop ensures we are counting books.
                // However, we need to ensure we don't double count if an author is listed twice on same book (unlikely but possible).
                // Since this loop iterates books, then authors, simply incrementing is correct for "number of books read by author"
                // provided the same author isn't linked multiple times to the same book. The DB schema prevents that usually.
                if (author.name) {
                    authorCounts[author.name] = (authorCounts[author.name] || 0) + 1;
                }
            }
        }

        // --- JIT Creation & Checks ---
        await db.transaction(async (tx) => {
            // Function to handle dynamic check/creation
            const processDynamicCategory = async (counts, categoryType, getNaming, tiers = DYNAMIC_TIERS) => {
                for (const [key, userCount] of Object.entries(counts)) {
                    for (const tier of tiers) {
                        if (userCount >= tier.count) {
                            // Construct Code: GENRE_MYSTERY_10
                            const safeKey = key.toUpperCase().replace(/[^A-Z0-9]/g, '_');
                            const code = `${categoryType.toUpperCase()}_${safeKey}_${tier.count}`;

                            // Check if definition exists (cache this?)
                            let achievement = await tx.query.achievements.findFirst({
                                where: eq(achievements.code, code)
                            });

                            // JIT Create Definition
                            if (!achievement) {
                                const { title, description } = getNaming(key, tier);
                                const icon = categoryType === 'Genre' ? 'Book' :
                                    (categoryType === 'Nationality' ? 'Globe' :
                                        (categoryType === 'Author' ? 'User' : 'Briefcase'));

                                [achievement] = await tx.insert(achievements).values({
                                    code,
                                    title,
                                    description,
                                    icon,
                                    xpReward: tier.level === 1 ? 250 : (tier.level === 2 ? 1000 : (tier.level === 3 ? 5000 : (tier.level === 4 ? 25000 : 100000))),
                                    category: categoryType, // Grouping
                                    conditionType: 'SPECIFIC',
                                    conditionValue: tier.count
                                }).returning();

                                console.log(`✨ JIT Created System Achievement: ${title} (${code})`);
                            }

                            // Check User Unlock
                            const existing = await tx.query.userAchievements.findFirst({
                                where: and(
                                    eq(userAchievements.userId, userId),
                                    eq(userAchievements.achievementId, achievement.id)
                                )
                            });

                            if (!existing) {
                                await tx.insert(userAchievements).values({
                                    userId,
                                    achievementId: achievement.id,
                                    unlockedAt: new Date(),
                                    progress: userCount
                                });
                                newUnlocks.push({ ...achievement, unlockedAt: new Date() });
                                console.log(`🎉 Unlocked Dynamic: ${achievement.title}`);
                            }
                        }
                    }
                }
            };

            // Run Processors
            await processDynamicCategory(genreCounts, 'Genre', (key, tier) => ({
                title: `${tier.name} of ${key}`,
                description: `Read ${tier.count} ${key} books`
            }));

            await processDynamicCategory(nationalityCounts, 'Global', (key, tier) => ({
                title: tier.level === 1 ? `Visitor to ${key}` : (tier.level === 5 ? `Ambassador of ${key}` : `${tier.suffix} of ${key}`), // Simple logic for now
                description: `Read ${tier.count} authors from ${key}`
            }));

            await processDynamicCategory(vocationCounts, 'Vocation', (key, tier) => {
                const vocTitle = VOCATION_TITLES.find(v => v.level === tier.level)?.prefix || 'Expert';
                return {
                    title: `${vocTitle} ${key}`,
                    description: `Read ${tier.count} books by ${key}s`
                };
            });

            await processDynamicCategory(authorCounts, 'Author', (key, tier) => ({
                title: `${tier.name} of ${key}`,
                description: `Read ${tier.count} books by ${key}`
            }), AUTHOR_TIERS);

            // --- Standard Static Checks (Reader, Collector, etc.) ---
            const allAchievements = await tx.select().from(achievements).where(eq(achievements.conditionType, 'COUNT'));
            const existingUnlocks = await tx.select().from(userAchievements).where(eq(userAchievements.userId, userId));
            const unlockedIds = new Set(existingUnlocks.map(ua => ua.achievementId));

            for (const achievement of allAchievements) {
                if (unlockedIds.has(achievement.id)) continue;

                let isUnlocked = false;
                let progress = 0;

                switch (achievement.category) {
                    case 'Reader':
                        progress = booksRead;
                        isUnlocked = booksRead >= achievement.conditionValue;
                        break;
                    case 'Collector':
                        progress = booksImported;
                        isUnlocked = booksImported >= achievement.conditionValue;
                        break;
                    case 'Highlighter':
                        progress = totalHighlights;
                        isUnlocked = totalHighlights >= achievement.conditionValue;
                        break;
                }

                if (isUnlocked) {
                    await tx.insert(userAchievements).values({
                        userId,
                        achievementId: achievement.id,
                        unlockedAt: new Date(),
                        progress: progress
                    });
                    newUnlocks.push({ ...achievement, unlockedAt: new Date() });
                    console.log(`🎉 Unlocked Static: ${achievement.title}`);
                } else if (progress > 0) {
                    // Save progress for locked achievements so UI can show progress bars
                    const existing = existingUnlocks.find(ua => ua.achievementId === achievement.id);
                    if (existing) {
                        // Update existing progress
                        await tx.update(userAchievements)
                            .set({ progress })
                            .where(and(
                                eq(userAchievements.userId, userId),
                                eq(userAchievements.achievementId, achievement.id)
                            ));
                    } else {
                        // Insert new locked achievement with progress
                        await tx.insert(userAchievements).values({
                            userId,
                            achievementId: achievement.id,
                            unlockedAt: null, // Not unlocked yet
                            progress: progress
                        });
                    }
                }
            }
        });

        return newUnlocks;

    } catch (error) {
        console.error('Error checking achievements:', error);
        return [];
    }
}
