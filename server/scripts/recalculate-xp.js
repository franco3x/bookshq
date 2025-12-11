import { db } from '../database/db.ts';
import { authors, authorLevels, books, highlights, categoryLevels, userStats } from '../database/schema.ts';
import { eq, sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';
dotenv.config();

// XP Constants
const XP_PER_HIGHLIGHT = 10;
const XP_PER_BOOK_READ = 100;
const XP_PER_BOOK_REREAD = 50;
const XP_PER_BOOK_IMPORT = 10;

async function recalculate() {
    console.log('🔄 Starting XP Recalculation...');

    try {
        // 1. Clear existing levels (optional but ensures clean slate)
        console.log('🧹 Clearing existing level data...');
        await db.delete(authorLevels); // Uncomment if safe
        await db.delete(categoryLevels);

        // 2. Fetch all books with highlights and authors
        const allBooks = await db.query.books.findMany({
            with: {
                highlights: true,
                author: true
            }
        });

        console.log(`📚 Processing ${allBooks.length} books...`);

        const authorXPMap = new Map(); // authorId -> xp
        const categoryXPMap = new Map(); // "type:value" -> xp
        let totalGlobalXP = 0;

        for (const book of allBooks) {
            let bookXP = 0;

            // Usage XP (Highlights)
            const highlightXP = book.highlights.length * XP_PER_HIGHLIGHT;
            bookXP += highlightXP;

            // Reading XP
            // Assuming at least imported gives some XP? 
            bookXP += XP_PER_BOOK_IMPORT;

            if (book.readCount > 0) {
                // First read = 100, others = 50
                const readXP = XP_PER_BOOK_READ + (Math.max(0, book.readCount - 1) * XP_PER_BOOK_REREAD);
                bookXP += readXP;
            }

            // --- Accumulate ---
            totalGlobalXP += bookXP;

            // Author XP
            if (book.authorId && book.author) {
                const current = authorXPMap.get(book.authorId) || 0;
                authorXPMap.set(book.authorId, current + bookXP);

                // Category XP: Author Demographics
                // Helper to normalize strings (Title Case)
                const toTitleCase = (str) => {
                    return str
                        .toLowerCase()
                        .split(' ')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ');
                };

                // Gender
                if (book.author.gender) {
                    const normalized = toTitleCase(book.author.gender);
                    const key = `gender:${normalized}`;
                    const current = categoryXPMap.get(key) || 0;
                    categoryXPMap.set(key, current + bookXP);
                }

                // Race/Ethnicity
                if (book.author.race) {
                    const normalized = toTitleCase(book.author.race);
                    const key = `race:${normalized}`;
                    const current = categoryXPMap.get(key) || 0;
                    categoryXPMap.set(key, current + bookXP);
                }

                // Nationality
                if (book.author.nationality) {
                    // normalize some common ones if needed, otherwise just Title Case
                    let normalized = toTitleCase(book.author.nationality);
                    if (normalized === 'American') normalized = 'United States';
                    if (normalized === 'Usa') normalized = 'United States';

                    const key = `nationality:${normalized}`;
                    const current = categoryXPMap.get(key) || 0;
                    categoryXPMap.set(key, current + bookXP);
                }
            }

            // Category XP: Genre
            if (book.genre) {
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

        console.log(`📝 Prepared updates for:`);
        console.log(`   - ${authorXPMap.size} authors`);
        console.log(`   - ${categoryXPMap.size} categories`);
        console.log(`   - Global XP: ${totalGlobalXP}`);

        // 3. Batched Updates - Author Levels
        console.log('💾 Saving Author Levels...');
        for (const [authorId, xp] of authorXPMap.entries()) {
            const level = Math.max(1, Math.floor(Math.sqrt(xp / 100)));

            await db.insert(authorLevels)
                .values({ authorId, xp, level })
                .onConflictDoUpdate({
                    target: authorLevels.authorId,
                    set: { xp, level, updatedAt: new Date() }
                });
        }

        // 4. Batched Updates - Category Levels
        console.log('💾 Saving Category Levels...');
        for (const [key, xp] of categoryXPMap.entries()) {
            const [type, ...valParts] = key.split(':');
            const value = valParts.join(':');
            const level = Math.max(1, Math.floor(Math.sqrt(xp / 100)));

            await db.insert(categoryLevels)
                .values({ categoryType: type, categoryValue: value, xp, level })
                .onConflictDoUpdate({
                    target: [categoryLevels.categoryType, categoryLevels.categoryValue],
                    set: { xp, level, updatedAt: new Date() }
                });
        }

        // 5. Update User Global Stats
        console.log('💾 Updating Global Stats...');
        const globalLevel = Math.max(1, Math.floor(Math.sqrt(totalGlobalXP / 100)));

        // Ensure record exists
        const userStat = await db.query.userStats.findFirst();
        if (userStat) {
            await db.update(userStats)
                .set({ totalXp: totalGlobalXP, readerLevel: globalLevel, updatedAt: new Date() })
                .where(eq(userStats.id, userStat.id));
        } else {
            await db.insert(userStats).values({ totalXp: totalGlobalXP, readerLevel: globalLevel });
        }

        console.log('✅ Recalculation Complete!');
        process.exit(0);

    } catch (e) {
        console.error('❌ Error:', e);
        process.exit(1);
    }
}

recalculate();
