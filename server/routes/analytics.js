import express from 'express';
import { db } from '../database/db.js';

const router = express.Router();

// Analytics Endpoint (Full Data Dump for Client-Side Filtering)
router.get('/books', async (req, res) => {
    try {
        const result = await db.query.books.findMany({
            with: {
                highlights: true, // For count
                bookAuthors: {
                    with: {
                        author: true // Full demographics (race, gender, vocation)
                    }
                },
                // Legacy fallback
                author: true
            }
        });

        // Transform for lighter payload
        const analyticsData = result.map(book => {
            // consolidate authors
            let authorsList = [];
            if (book.bookAuthors && book.bookAuthors.length > 0) {
                authorsList = book.bookAuthors.map(ba => ba.author).filter(Boolean);
            } else if (book.author) {
                authorsList = [book.author];
            }

            return {
                id: book.id,
                title: book.title,
                readCount: book.readCount,
                readStatus: book.readStatus,
                dateLastRead: book.dateLastRead,
                yearPublished: book.yearPublished,
                pageCount: book.pageCount,
                userRating: book.userRating,
                genre: book.genre, // JSONB array
                tags: book.tags,   // JSONB array
                highlightCount: book.highlights ? book.highlights.length : 0,
                authors: authorsList.map(a => ({
                    id: a.id,
                    name: a.name,
                    gender: a.gender,
                    race: a.race,         // JSONB array
                    nationality: a.nationality, // JSONB array
                    vocation: a.vocation, // JSONB array
                    birthYear: a.birthYear,
                    deathYear: a.deathYear
                }))
            };
        });

        res.json({
            books: analyticsData,
            meta: {
                total: analyticsData.length,
                generatedAt: new Date()
            }
        });
    } catch (e) {
        console.error("Analytics Error:", e);
        res.status(500).json({ error: e.message });
    }
});

export default router;
