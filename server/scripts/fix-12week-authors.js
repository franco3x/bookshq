import { db } from '../database/db.ts';
import { books, authors, bookAuthors, authorLevels, authorLevelsRelations, highlights } from '../database/schema.ts';
import { eq, ilike, and } from 'drizzle-orm';
import { recalculateStats } from '../services/stats.js';

async function fixAuthors() {
    console.log('Fixing authors for "The 12 Week Year Field Guide"...\n');

    const BOOK_ID = 2439;
    const OLD_AUTHOR_ID = 1898;
    const NEW_AUTHORS = ['Brian P. Moran', 'Michael Lennington'];

    // 1. Find or Create new authors
    const newAuthorIds = [];
    for (const name of NEW_AUTHORS) {
        let author = await db.query.authors.findFirst({
            where: ilike(authors.name, name)
        });

        if (!author) {
            console.log(`Creating new author: ${name}`);
            const [created] = await db.insert(authors).values({ name }).returning();
            author = created;
        } else {
            console.log(`Found existing author: ${name} (ID: ${author.id})`);
        }
        newAuthorIds.push(author.id);
    }

    // 2. Link authors to book
    console.log('Linking authors to book...');

    // Remove old link
    await db.delete(bookAuthors)
        .where(and(
            eq(bookAuthors.bookId, BOOK_ID),
            eq(bookAuthors.authorId, OLD_AUTHOR_ID)
        ));

    // Add new links
    for (const authorId of newAuthorIds) {
        // Check if link exists
        const existing = await db.query.bookAuthors.findFirst({
            where: and(
                eq(bookAuthors.bookId, BOOK_ID),
                eq(bookAuthors.authorId, authorId)
            )
        });

        if (!existing) {
            await db.insert(bookAuthors).values({
                bookId: BOOK_ID,
                authorId: authorId
            });
            console.log(`Linked author ${authorId} to book ${BOOK_ID}`);
        }
    }

    // 3. Update legacy authorId on book (set to first author)
    console.log(`Updating legacy authorId for book ${BOOK_ID} to ${newAuthorIds[0]}...`);
    await db.update(books)
        .set({ authorId: newAuthorIds[0] })
        .where(eq(books.id, BOOK_ID));

    // 4. Update highlights authorId (set to first author)
    console.log(`Updating ${newAuthorIds[0]} as author for highlights...`);
    await db.update(highlights)
        .set({ authorId: newAuthorIds[0] })
        .where(eq(highlights.bookId, BOOK_ID));

    // 5. Cleanup old author if unused
    const remainingBooks = await db.query.bookAuthors.findMany({
        where: eq(bookAuthors.authorId, OLD_AUTHOR_ID)
    });

    if (remainingBooks.length === 0) {
        console.log(`Deleting unused author record: ${OLD_AUTHOR_ID}`);
        // Delete related levels first
        await db.delete(authorLevels).where(eq(authorLevels.authorId, OLD_AUTHOR_ID));
        await db.delete(authors).where(eq(authors.id, OLD_AUTHOR_ID));
    } else {
        console.log(`Old author ${OLD_AUTHOR_ID} still has ${remainingBooks.length} books, keeping record.`);
    }

    // 6. Recalculate Stats
    console.log('\nRecalculating stats...');
    await recalculateStats();

    console.log('\n✅ Fix complete!');
    process.exit(0);
}

fixAuthors();
