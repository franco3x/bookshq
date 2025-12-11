import { db } from '../database/db.ts';
import { books, authors, bookAuthors, authorLevels, highlights } from '../database/schema.ts';
import { eq } from 'drizzle-orm';
import { recalculateStats } from '../services/stats.js';

async function fixAuthorsV2() {
    console.log('Fixing highlights for Brian P. Moran...\n');

    const OLD_AUTHOR_ID = 1897; // "Brian P. Moran, Michael Lennington" (with 291 highlights)
    const NEW_AUTHOR_ID = 1900; // "Brian P. Moran"

    // 1. Move ALL highlights from Old -> New
    console.log(`Moving highlights from author ${OLD_AUTHOR_ID} to ${NEW_AUTHOR_ID}...`);
    const result = await db.update(highlights)
        .set({ authorId: NEW_AUTHOR_ID })
        .where(eq(highlights.authorId, OLD_AUTHOR_ID))
        .returning();

    console.log(`Moved ${result.length} highlights.`);

    // 2. Double check for any lingering book links
    const lingeringBooks = await db.query.bookAuthors.findMany({
        where: eq(bookAuthors.authorId, OLD_AUTHOR_ID)
    });

    if (lingeringBooks.length > 0) {
        console.log(`Found ${lingeringBooks.length} lingering book links. Cleaning up...`);
        for (const ba of lingeringBooks) {
            // Check if new author already linked
            const existing = await db.query.bookAuthors.findFirst({
                where: eq(bookAuthors.bookId, ba.bookId)
            });
            // If new author not linked, update this link
            // Actually, safer to just delete and rely on recalculate or manual check
            // But let's just delete the bad link for now
            await db.delete(bookAuthors).where(eq(bookAuthors.id, ba.id));
        }
    }

    // 3. Delete the old author
    console.log(`Deleting old author record: ${OLD_AUTHOR_ID}`);
    await db.delete(authorLevels).where(eq(authorLevels.authorId, OLD_AUTHOR_ID));
    await db.delete(authors).where(eq(authors.id, OLD_AUTHOR_ID));

    // 4. Recalculate Stats
    console.log('\nRecalculating stats...');
    await recalculateStats();

    console.log('\n✅ Fix complete!');
    process.exit(0);
}

fixAuthorsV2();
