import { db } from '../database/db';
import { userStats, categoryLevels, authorLevels, achievements } from '../database/schema';
import { eq, sql } from 'drizzle-orm';

const XP_CONFIG = {
    PER_HIGHLIGHT: 10,
    PER_BOOK_IMPORT: 10,      // XP for importing a book
    PER_BOOK_FIRST_READ: 100, // XP for marking book as read (first time)
    PER_BOOK_REREAD: 50,      // XP for re-reading a book
    LEVEL_BASE_XP: 100,       // XP for Level 1
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

// Hook to call when adding a highlight (legacy simple version)
export async function onHighlightAdded(count = 1) {
    return await addXP(count * XP_CONFIG.PER_HIGHLIGHT);
}

// Advanced Hook for granular XP (Genre, Author, Demographics)
export async function onHighlightAddedWithContext(highlightsData) {
    // highlightsData = [{ authorId, bookId, genre, gender, race, nationality }]
    const xpPerHighlight = XP_CONFIG.PER_HIGHLIGHT;

    // 1. Award Global XP
    const totalXP = highlightsData.length * xpPerHighlight;
    await addXP(totalXP);

    // 2. Aggregate counts to minimize DB writes
    const genreCounts = {};
    const authorCounts = {};
    const demoCounts = { gender: {}, race: {}, nationality: {} };

    for (const h of highlightsData) {
        // Genre
        if (h.genre) {
            genreCounts[h.genre] = (genreCounts[h.genre] || 0) + xpPerHighlight;
        }

        // Author
        if (h.authorId) {
            authorCounts[h.authorId] = (authorCounts[h.authorId] || 0) + xpPerHighlight;
        }

        // Demographics
        if (h.gender) demoCounts.gender[h.gender] = (demoCounts.gender[h.gender] || 0) + xpPerHighlight;
        if (h.race) demoCounts.race[h.race] = (demoCounts.race[h.race] || 0) + xpPerHighlight;
        if (h.nationality) demoCounts.nationality[h.nationality] = (demoCounts.nationality[h.nationality] || 0) + xpPerHighlight;
    }

    // 3. Update Category Levels
    for (const [genre, amount] of Object.entries(genreCounts)) {
        await addCategoryXP('genre', genre, amount);
    }
    for (const [gender, amount] of Object.entries(demoCounts.gender)) {
        await addCategoryXP('gender', gender, amount);
    }
    for (const [race, amount] of Object.entries(demoCounts.race)) {
        await addCategoryXP('race', race, amount);
    }
    for (const [nat, amount] of Object.entries(demoCounts.nationality)) {
        await addCategoryXP('nationality', nat, amount);
    }

    // 4. Update Author Levels
    for (const [authorId, amount] of Object.entries(authorCounts)) {
        await addAuthorXP(parseInt(authorId), amount);
    }
}

async function addCategoryXP(categoryType, categoryValue, amount) {
    const { and } = await import('drizzle-orm');

    let category = await db.query.categoryLevels.findFirst({
        where: and(
            eq(categoryLevels.categoryType, categoryType),
            eq(categoryLevels.categoryValue, categoryValue)
        )
    });

    if (!category) {
        [category] = await db.insert(categoryLevels)
            .values({ categoryType, categoryValue, xp: 0, level: 1 })
            .returning();
    }

    const newXP = category.xp + amount;
    const newLevel = calculateLevel(newXP);

    if (newXP !== category.xp) {
        await db.update(categoryLevels)
            .set({ xp: newXP, level: newLevel, updatedAt: new Date() })
            .where(eq(categoryLevels.id, category.id));
    }
}

async function addAuthorXP(authorId, amount) {
    let authorLevel = await db.query.authorLevels.findFirst({
        where: eq(authorLevels.authorId, authorId)
    });

    if (!authorLevel) {
        [authorLevel] = await db.insert(authorLevels)
            .values({ authorId, xp: 0, level: 1 })
            .returning();
    }

    const newXP = authorLevel.xp + amount;
    const newLevel = calculateLevel(newXP);

    if (newXP !== authorLevel.xp) {
        await db.update(authorLevels)
            .set({ xp: newXP, level: newLevel, updatedAt: new Date() })
            .where(eq(authorLevels.id, authorLevel.id));
    }
}

// Hook to call when marking a book as read
export async function onBookRead(isFirstRead) {
    const xpAmount = isFirstRead
        ? XP_CONFIG.PER_BOOK_FIRST_READ
        : XP_CONFIG.PER_BOOK_REREAD;
    return await addXP(xpAmount);
}

// Hook to call when importing a new book
export async function onBookImported() {
    return await addXP(XP_CONFIG.PER_BOOK_IMPORT);
}
