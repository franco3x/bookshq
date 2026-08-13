import express from 'express';
import { db } from '../database/db.js';
import { books } from '../database/schema.js';
import { eq } from 'drizzle-orm';
import { fetchBookCover } from '../services/cover-fetcher.js';

const router = express.Router();

// Admin: Backfill covers
router.get('/backfill-covers', async (req, res) => {
    try {
        const booksWithoutCovers = await db.query.books.findMany({
            where: (books, { isNull, or, eq }) => or(isNull(books.coverImage), eq(books.coverImage, '')),
            with: { author: true }
        });

        console.log(`Found ${booksWithoutCovers.length} books without covers. Starting backfill...`);

        // Process in chunks to avoid rate limits
        let updatedCount = 0;
        for (const book of booksWithoutCovers) {
            if (!book.author) continue;

            const { coverUrl, genre } = await fetchBookCover(book.title, book.author.name);

            if (coverUrl || genre) {
                await db.update(books)
                    .set({
                        ...(coverUrl ? { coverImage: coverUrl } : {}),
                        ...(genre ? { genre: genre } : {})
                    })
                    .where(eq(books.id, book.id));

                updatedCount++;
                console.log(`Updated details for "${book.title}" (Genre: ${genre || 'None'})`);
            }
            // Small delay to be nice to API
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        res.json({ success: true, total: booksWithoutCovers.length, updated: updatedCount });
    } catch (e) {
        console.error('Backfill error:', e);
        res.status(500).json({ error: e.message });
    }
});

export default router;
