import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { db } from '../database/db.ts';
import { books, authors, bookAuthors } from '../database/schema.ts';
import { eq, and } from 'drizzle-orm';

/**
 * Goodreads CSV Import Test Script
 * 
 * Usage: node server/scripts/import-goodreads-test.js [path-to-csv]
 */

async function testImport() {
    let csvPath = process.argv[2];

    if (!csvPath) {
        const importDir = path.resolve('data/imports/goodreads');
        if (!fs.existsSync(importDir)) {
            console.error('❌ Import directory not found at data/imports/goodreads');
            process.exit(1);
        }

        const files = fs.readdirSync(importDir).filter(f => f.endsWith('.csv'));
        if (files.length === 0) {
            console.error('❌ No CSV files found in data/imports/goodreads');
            process.exit(1);
        }

        csvPath = path.join(importDir, files[0]);
    }

    console.log(`🚀 Starting test import from: ${csvPath}`);

    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true
    }) as any[];

    console.log(`📊 Found ${records.length} records in CSV.`);

    const results: any = { imported: 0, updated: 0, skipped: 0, errors: [] };

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
            // Goodreads format is usually "Last, First" or "First Last"
            // We'll try to find an author with this name or create one
            let author = await db.query.authors.findFirst({
                where: eq(authors.name, authorNameRaw)
            });

            if (!author) {
                console.log(`➕ Creating new author: ${authorNameRaw}`);
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

            // Date Added Parsing (for createdAt)
            const dateAddedStr = row['Date Added'];
            let createdAt = new Date();
            if (dateAddedStr && dateAddedStr.trim()) {
                const parsed = new Date(dateAddedStr);
                if (!isNaN(parsed.getTime())) {
                    createdAt = parsed;
                }
            }

            const bookData: any = {
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

            if (existingBook) {
                console.log(`🔄 Updating: ${title}`);
                await db.update(books)
                    .set(bookData)
                    .where(eq(books.id, existingBook.id));
                results.updated++;
            } else {
                console.log(`✨ Importing: ${title}`);
                [existingBook] = await db.insert(books)
                    .values({ ...bookData, createdAt })
                    .returning();

                // Link in junction table if it exists (assuming bookAuthors exists from previous tasks)
                try {
                    await db.insert(bookAuthors)
                        .values({ bookId: existingBook.id, authorId: author.id })
                        .onConflictDoNothing();
                } catch (e) {
                    // Junction table might not be enforced yet in all environments
                }

                results.imported++;
            }

        } catch (error) {
            console.error(`❌ Error importing row: ${row.Title}`, error);
            results.errors.push({ title: row.Title, error: error.message });
        }
    }

    console.log('\n✅ Import finished!');
    console.log(`- Imported: ${results.imported}`);
    console.log(`- Updated: ${results.updated}`);
    console.log(`- Skipped: ${results.skipped}`);
    console.log(`- Errors: ${results.errors.length}`);

    process.exit(0);
}

testImport().catch(err => {
    console.error('💥 Fatal error:', err);
    process.exit(1);
});
