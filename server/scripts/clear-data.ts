import { db } from '../database/db';
import { books, authors, highlights } from '../database/schema';
import { sql } from 'drizzle-orm';

/**
 * Clear all imported data (books, authors, highlights)
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

        console.log('\n✅ Database cleared successfully!');
        console.log('You can now re-import your filtered Readwise CSV.');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error clearing database:', error);
        process.exit(1);
    }
}

clearData();
