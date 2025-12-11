import { db } from '../database/db';
import { books, authors, highlights, userStats } from '../database/schema';
import { sql } from 'drizzle-orm';

/**
 * Clear all imported data (books, authors, highlights, and reset XP)
 * Use this before re-importing Readwise data
 */
async function clearData() {
    try {
        console.log('🗑️  Starting database cleanup...');

        // Delete in correct order due to foreign key constraints
        console.log('Deleting highlights...');
        const deletedHighlights = await db.delete(highlights);
        console.log(`✓ Deleted all highlights`);

        console.log('Deleting books...');
        const deletedBooks = await db.delete(books);
        console.log(`✓ Deleted all books`);

        console.log('Deleting authors...');
        const deletedAuthors = await db.delete(authors);
        console.log(`✓ Deleted all authors`);

        // Reset user stats (XP and level)
        console.log('Resetting user stats (XP & Level)...');
        await db.update(userStats)
            .set({
                totalXp: 0,
                readerLevel: 1,
                updatedAt: new Date()
            });
        console.log(`✓ Reset XP and level to defaults`);

        console.log('\n✅ Database cleared successfully!');
        console.log('You can now re-import your filtered Readwise CSV.');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error clearing database:', error);
        process.exit(1);
    }
}

clearData();
