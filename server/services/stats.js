import { db } from '../database/db.ts';
import { authors, authorLevels, books, highlights, categoryLevels, userStats, userAchievements } from '../database/schema.ts';
import { eq, sql } from 'drizzle-orm';

// XP Constants
const XP_PER_HIGHLIGHT = 10;
const XP_PER_BOOK_READ = 250;
const XP_PER_BOOK_REREAD = 150;
const XP_PER_BOOK_IMPORT = 10;

export async function recalculateStats() {
    console.log('🔄 Starting XP Recalculation (Service)...');

    try {
        // 1. Fetch all books with highlights and authors
        const allBooks = await db.query.books.findMany({
            with: {
                highlights: true,
                author: true, // Keep legacy for now
                bookAuthors: {
                    with: {
                        author: true
                    }
                }
            }
        });

        console.log(`📚 Processing ${allBooks.length} books...`);

        const authorXPMap = new Map(); // authorId -> xp
        const categoryXPMap = new Map(); // "type:value" -> xp
        const authorNameMap = new Map(); // "name" -> authorId (for reverse lookup from achievements)
        let totalGlobalXP = 0;

        for (const book of allBooks) {
            let bookXP = 0;

            // Usage XP (Highlights)
            const highlightXP = book.highlights.length * XP_PER_HIGHLIGHT;
            bookXP += highlightXP;

            // Reading XP
            bookXP += XP_PER_BOOK_IMPORT;

            // Check if book is read (via count OR status)
            const isRead = (book.readCount && book.readCount > 0) || book.readStatus === 'read';

            if (isRead) {
                // Ensure effective count is at least 1 if status is read
                const effectiveCount = Math.max(1, book.readCount || 0);

                // First read = XP_PER_BOOK_READ, others = XP_PER_BOOK_REREAD
                const readXP = XP_PER_BOOK_READ + (Math.max(0, effectiveCount - 1) * XP_PER_BOOK_REREAD);
                bookXP += readXP;
            }

            // --- Accumulate ---
            totalGlobalXP += bookXP;

            // Author XP (Multiple Authors Support)
            if (book.bookAuthors && Array.isArray(book.bookAuthors)) {
                for (const connection of book.bookAuthors) {
                    const author = connection.author;
                    if (!author) continue;

                    const current = authorXPMap.get(author.id) || 0;
                    authorXPMap.set(author.id, current + bookXP);
                    if (author.name) authorNameMap.set(author.name.toLowerCase(), author.id);

                    // Helper to normalize strings (Title Case)
                    const toTitleCase = (str) => {
                        return str
                            .toLowerCase()
                            .split(' ')
                            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                            .join(' ');
                    };

                    // Gender
                    if (author.gender) {
                        const normalized = toTitleCase(author.gender);
                        const key = `gender:${normalized}`;
                        const current = categoryXPMap.get(key) || 0;
                        categoryXPMap.set(key, current + bookXP);
                    }

                    // Race/Ethnicity (Array support)
                    if (author.race) {
                        const races = Array.isArray(author.race) ? author.race : [author.race];
                        for (const r of races) {
                            if (!r) continue;
                            const normalized = toTitleCase(r);
                            const key = `race:${normalized}`;
                            const current = categoryXPMap.get(key) || 0;
                            categoryXPMap.set(key, current + bookXP);
                        }
                    }

                    // Nationality (Array support)
                    if (author.nationality) {
                        const nationalities = Array.isArray(author.nationality) ? author.nationality : [author.nationality];
                        for (const n of nationalities) {
                            if (!n) continue;
                            // normalize some common ones
                            let normalized = toTitleCase(n);
                            if (normalized === 'American') normalized = 'United States';
                            if (normalized === 'Usa') normalized = 'United States';
                            if (normalized === 'Uk') normalized = 'United Kingdom';

                            const key = `nationality:${normalized}`;
                            const current = categoryXPMap.get(key) || 0;
                            categoryXPMap.set(key, current + bookXP);
                        }
                    }

                    // Vocation (Array support)
                    if (author.vocation) {
                        const vocations = Array.isArray(author.vocation) ? author.vocation : [author.vocation];
                        for (const v of vocations) {
                            if (!v) continue;
                            const normalized = toTitleCase(v);
                            const key = `vocation:${normalized}`;
                            const current = categoryXPMap.get(key) || 0;
                            categoryXPMap.set(key, current + bookXP);
                        }
                    }
                }
            } else if (book.authorId && book.author) {
                // Legacy fallback (only for books WITHOUT bookAuthors entries)
                const current = authorXPMap.get(book.authorId) || 0;
                authorXPMap.set(book.authorId, current + bookXP);
                if (book.author && book.author.name) authorNameMap.set(book.author.name.toLowerCase(), book.authorId);
            }

            // Category XP: Genre
            if (book.genre && Array.isArray(book.genre)) {
                for (const g of book.genre) {
                    const key = `genre:${g}`;
                    const current = categoryXPMap.get(key) || 0;
                    categoryXPMap.set(key, current + bookXP);
                }
            } else if (typeof book.genre === 'string') {
                const key = `genre:${book.genre}`;
                const current = categoryXPMap.get(key) || 0;
                categoryXPMap.set(key, current + bookXP);
            }

            // Category XP: Tags
            if (book.tags && Array.isArray(book.tags)) {
                for (const tag of book.tags) {
                    const key = `tag:${tag}`;
                    const current = categoryXPMap.get(key) || 0;
                    categoryXPMap.set(key, current + bookXP);
                }
            }
        }

        // --- Achievement XP (Global Only) ---
        const unlockedAchievements = await db.query.userAchievements.findMany({
            with: {
                achievement: true
            }
        });

        let achievementXP = 0;
        for (const ua of unlockedAchievements) {
            if (ua.achievement) {
                achievementXP += ua.achievement.xpReward;
            }
        }
        console.log(`🏆 Adding ${achievementXP} XP from ${unlockedAchievements.length} achievements to GLOBAL XP only...`);
        totalGlobalXP += achievementXP;

        // Batched Updates (Transactional for safety and cleanup)
        await db.transaction(async (tx) => {
            console.log('🧹 Clearing existing level data...');
            await tx.delete(authorLevels);
            await tx.delete(categoryLevels);

            // 3. Save Author Levels
            console.log('💾 Saving Author Levels...');
            if (authorXPMap.size > 0) {
                // Convert map to array for bulk insert
                const authorValues = Array.from(authorXPMap.entries()).map(([authorId, xp]) => ({
                    authorId,
                    xp,
                    level: Math.max(1, Math.floor(Math.sqrt(xp / 100)))
                }));

                // Drizzle insert many
                await tx.insert(authorLevels).values(authorValues);
            }

            // 4. Save Category Levels
            console.log('💾 Saving Category Levels...');
            if (categoryXPMap.size > 0) {
                const categoryValues = Array.from(categoryXPMap.entries()).map(([key, xp]) => {
                    const [type, ...valParts] = key.split(':');
                    return {
                        categoryType: type,
                        categoryValue: valParts.join(':'),
                        xp,
                        level: Math.max(1, Math.floor(Math.sqrt((Number(xp) || 0) / 100)))
                    };
                });

                await tx.insert(categoryLevels).values(categoryValues);
            }

            // 5. Update User Global Stats
            console.log('💾 Updating Global Stats...');
            const globalLevel = Math.max(1, Math.floor(Math.sqrt(totalGlobalXP / 100)));
            const userStat = await tx.query.userStats.findFirst();

            if (userStat) {
                await tx.update(userStats)
                    .set({ totalXp: totalGlobalXP, readerLevel: globalLevel, updatedAt: new Date() })
                    .where(eq(userStats.id, userStat.id));
            } else {
                await tx.insert(userStats).values({ totalXp: totalGlobalXP, readerLevel: globalLevel });
            }
        });

        console.log('✅ Recalculation Complete!');
        return true;

    } catch (e) {
        console.error('❌ Error recalculating stats:', e);
        return false;
    }
}
