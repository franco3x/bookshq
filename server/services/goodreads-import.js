import { parse } from 'csv-parse/sync';
import { db } from '../database/db.js';
import { books, authors, bookAuthors } from '../database/schema.js';
import { eq, and } from 'drizzle-orm';

/**
 * Imports books from a Goodreads CSV export.
 * Only imports books marked as 'read'.
 * 
 * @param {string} csvContent - The raw content of the Goodreads CSV file.
 * @returns {Promise<object>} Import results summary.
 */
export async function importGoodreadsCSV(csvContent) {
    const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true
    });

    const results = { imported: 0, updated: 0, skipped: 0, errors: [] };

    for (const row of records) {
        try {
            const title = row.Title;
            const authorNameRaw = row.Author;
            const isbn = (row.ISBN13 || row.ISBN || '').replace(/[^0-9X]/gi, '');
            const goodreadsId = row['Book Id'];

            if (!title) {
                results.skipped++;
                continue;
            }

            // FILTER: Only import books from the 'read' shelf
            const exclusiveShelf = row['Exclusive Shelf'];
            if (exclusiveShelf !== 'read') {
                results.skipped++;
                continue;
            }

            // 1. Handle Authors
            let author = await db.query.authors.findFirst({
                where: eq(authors.name, authorNameRaw)
            });

            if (!author) {
                [author] = await db.insert(authors)
                    .values({ name: authorNameRaw })
                    .returning();
            }

            // 2. Find existing book
            let existingBook = null;
            if (goodreadsId) {
                existingBook = await db.query.books.findFirst({
                    where: eq(books.goodreadsId, goodreadsId)
                });
            }

            if (!existingBook && isbn) {
                existingBook = await db.query.books.findFirst({
                    where: eq(books.asin, isbn)
                });
            }

            // Date Parsing
            const dateReadStr = row['Date Read'];
            let dateLastRead = null;
            if (dateReadStr && dateReadStr.trim()) {
                const parsed = new Date(dateReadStr);
                if (!isNaN(parsed.getTime())) {
                    dateLastRead = parsed;
                }
            }

            const bookData = {
                title: title,
                authorId: author.id,
                asin: isbn || null,
                goodreadsId: goodreadsId || null,
                userRating: parseInt(row['My Rating']) || null,
                avgRating: row['Average Rating'] || null,
                userReview: row['My Review'] || null,
                pageCount: parseInt(row['Number of Pages']) || null,
                yearPublished: parseInt(row['Year Published']) || null,
                readStatus: row['Exclusive Shelf'] || 'read',
                tags: row.Bookshelves ? row.Bookshelves.split(',').map(s => s.trim()).filter(Boolean) : []
            };

            if (dateLastRead) {
                bookData.dateLastRead = dateLastRead;
            }

            // Date Added Parsing (for createdAt)
            const dateAddedStr = row['Date Added'];
            let createdAt = new Date();
            if (dateAddedStr && dateAddedStr.trim()) {
                const parsed = new Date(dateAddedStr);
                if (!isNaN(parsed.getTime())) {
                    createdAt = parsed;
                }
            }

            if (existingBook) {
                await db.update(books)
                    .set({ ...bookData })
                    .where(eq(books.id, existingBook.id));
                results.updated++;
            } else {
                [existingBook] = await db.insert(books)
                    .values({ ...bookData, createdAt })
                    .returning();

                // Link in junction table
                await db.insert(bookAuthors)
                    .values({ bookId: existingBook.id, authorId: author.id })
                    .onConflictDoNothing();

                results.imported++;
            }

        } catch (error) {
            console.error(`Error importing row: ${row.Title}`, error);
            results.errors.push({ title: row.Title, error: error.message });
        }
    }

    return results;
}
