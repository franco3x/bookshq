import { db } from '../database/db.js';
import { books, authors, highlights, bookAuthors, authorLevels } from '../database/schema.js';
import { eq, and, sql } from 'drizzle-orm';

/**
 * Merges a source book into a target book.
 * All highlights and metadata from source are moved/merged to target.
 * Source book is deleted at the end.
 * 
 * @param {string} targetId - The ID of the book to keep.
 * @param {string} sourceId - The ID of the book to merge (and delete).
 */
export async function mergeBooks(targetId, sourceId) {
    if (targetId === sourceId) throw new Error("Cannot merge a book with itself.");

    return await db.transaction(async (tx) => {
        const target = await tx.query.books.findFirst({ where: eq(books.id, targetId) });
        const source = await tx.query.books.findFirst({ where: eq(books.id, sourceId) });

        if (!target || !source) throw new Error("One or both books not found.");

        // 1. Move all highlights
        await tx.update(highlights)
            .set({ bookId: targetId })
            .where(eq(highlights.bookId, sourceId));

        // 2. Merge Authors
        // Get authors for both books
        const sourceAuthors = await tx.query.bookAuthors.findMany({ where: eq(bookAuthors.bookId, sourceId) });
        const targetAuthors = await tx.query.bookAuthors.findMany({ where: eq(bookAuthors.bookId, targetId) });

        const targetAuthorIds = new Set(targetAuthors.map(a => a.authorId));

        for (const sa of sourceAuthors) {
            if (!targetAuthorIds.has(sa.authorId)) {
                await tx.insert(bookAuthors)
                    .values({ bookId: targetId, authorId: sa.authorId });
            }
        }

        // 3. Merge Metadata
        const updatedMetadata = {
            readCount: (target.readCount || 0) + (source.readCount || 0),
            // Take the OLDEST dateLastRead (as requested, to avoid overwriting historical dates with recent import dates)
            dateLastRead: (source.dateLastRead && target.dateLastRead)
                ? (new Date(source.dateLastRead) < new Date(target.dateLastRead) ? source.dateLastRead : target.dateLastRead)
                : (source.dateLastRead || target.dateLastRead),

            // Keep existing identifiers if target is missing them
            goodreadsId: target.goodreadsId || source.goodreadsId,
            asin: target.asin || source.asin,
            isbn10: target.isbn10 || source.isbn10,
            isbn13: target.isbn13 || source.isbn13,

            // Merge arrays (tags, genre) - Ensure they are arrays to prevent spreading strings into chars
            tags: Array.from(new Set([
                ...(Array.isArray(target.tags) ? target.tags : (target.tags ? [target.tags] : [])),
                ...(Array.isArray(source.tags) ? source.tags : (source.tags ? [source.tags] : []))
            ])),
            genre: Array.from(new Set([
                ...(Array.isArray(target.genre) ? target.genre : (target.genre ? [target.genre] : [])),
                ...(Array.isArray(source.genre) ? source.genre : (source.genre ? [source.genre] : []))
            ])),

            // Take higher ratings/reviews if target is empty
            userRating: target.userRating || source.userRating,
            userReview: target.userReview || source.userReview,
            pageCount: target.pageCount || source.pageCount,
            yearPublished: target.yearPublished || source.yearPublished,
            avgRating: target.avgRating || source.avgRating,
        };

        await tx.update(books)
            .set(updatedMetadata)
            .where(eq(books.id, targetId));

        // 4. Cleanup source book
        // Remove book-author links first
        await tx.delete(bookAuthors).where(eq(bookAuthors.bookId, sourceId));
        // Delete book
        await tx.delete(books).where(eq(books.id, sourceId));

        return { success: true, targetId };
    });
}

/**
 * Merges a source author into a target author.
 * All books from source are reassigned to target.
 * Source author is deleted at the end.
 * 
 * @param {string} targetId - The ID of the author to keep.
 * @param {string} sourceId - The ID of the author to merge (and delete).
 */
export async function mergeAuthors(targetId, sourceId) {
    if (targetId === sourceId) throw new Error("Cannot merge an author with itself.");

    return await db.transaction(async (tx) => {
        const target = await tx.query.authors.findFirst({ where: eq(authors.id, targetId) });
        const source = await tx.query.authors.findFirst({ where: eq(authors.id, sourceId) });

        if (!target || !source) throw new Error("One or both authors not found.");

        // 1. Reassign all books
        // We update the bookAuthors junction table
        await tx.update(bookAuthors)
            .set({ authorId: targetId })
            .where(eq(bookAuthors.authorId, sourceId));

        // Note: Some books might have had BOTH authors. In that case, we might have duplicate rows.
        // Drizzle/SQL might error on unique constraints if we have (book_id, author_id) PK.
        // Let's handle duplicate rows after the update.
        await tx.run(sql`
            DELETE FROM book_authors 
            WHERE id IN (
                SELECT id FROM (
                    SELECT id, ROW_NUMBER() OVER (PARTITION BY book_id, author_id ORDER BY id) as row_num
                    FROM book_authors
                    WHERE author_id = ${targetId}
                ) t
                WHERE t.row_num > 1
            )
        `);

        // 2. Migrate Highlights
        await tx.update(highlights)
            .set({ authorId: targetId })
            .where(eq(highlights.authorId, sourceId));

        // 3. Merge Metadata (bio, dates, etc.)
        const updatedMetadata = {
            bio: target.bio || source.bio,
            birthYear: target.birthYear || source.birthYear,
            deathYear: target.deathYear || source.deathYear,
            nationality: target.nationality || source.nationality,
            vocation: Array.from(new Set([...(target.vocation || []), ...(source.vocation || [])])),
        };

        await tx.update(authors)
            .set(updatedMetadata)
            .where(eq(authors.id, targetId));

        // 4. Merge XP / Levels
        const sourceLevel = await tx.query.authorLevels.findFirst({ where: eq(authorLevels.authorId, sourceId) });
        if (sourceLevel && sourceLevel.xp > 0) {
            const targetLevel = await tx.query.authorLevels.findFirst({ where: eq(authorLevels.authorId, targetId) });
            if (targetLevel) {
                await tx.update(authorLevels)
                    .set({ xp: targetLevel.xp + sourceLevel.xp })
                    .where(eq(authorLevels.authorId, targetId));
            } else {
                await tx.insert(authorLevels)
                    .values({ authorId: targetId, xp: sourceLevel.xp });
            }
        }

        // Cleanup source level record
        await tx.delete(authorLevels).where(eq(authorLevels.authorId, sourceId));

        // 5. Cleanup source author
        await tx.delete(authors).where(eq(authors.id, sourceId));

        return { success: true, targetId };
    });
}
