import express from 'express';
import { db } from '../database/db.js';
import { authors, bookAuthors, highlights, authorLevels } from '../database/schema.js';
import { eq, sql } from 'drizzle-orm';

const router = express.Router();

// Create new author
router.post('/', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });

        // Check if exists
        const existing = await db.query.authors.findFirst({
            where: eq(authors.name, name)
        });
        if (existing) return res.json(existing);

        const [newAuthor] = await db.insert(authors).values({ name }).returning();
        res.json(newAuthor);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/', async (req, res) => {
    try {
        // 1. Fetch all authors (id and name only for list view)
        // orderBy name for default sort
        const allAuthors = await db.query.authors.findMany({
            columns: {
                id: true,
                name: true
            },
            orderBy: authors.name
        });

        // 2. Fetch Book Counts (GROUP BY authorId in bookAuthors)
        const bookCounts = await db
            .select({
                authorId: bookAuthors.authorId,
                count: sql`count(*)`.mapWith(Number)
            })
            .from(bookAuthors)
            .groupBy(bookAuthors.authorId);

        const bookCountMap = new Map(bookCounts.map(b => [b.authorId, b.count]));

        // 3. Fetch Highlight Counts (GROUP BY authorId in highlights - utilizing denormalized col)
        const highlightCounts = await db
            .select({
                authorId: highlights.authorId,
                count: sql`count(*)`.mapWith(Number)
            })
            .from(highlights)
            .where(sql`${highlights.authorId} IS NOT NULL`)
            .groupBy(highlights.authorId);

        const highlightCountMap = new Map(highlightCounts.map(h => [h.authorId, h.count]));

        // 4. Fetch Levels
        const levels = await db.query.authorLevels.findMany();
        const levelMap = new Map(levels.map(l => [l.authorId, { xp: l.xp, level: l.level }]));

        // 5. Merge in memory (fast, no heavy objects)
        const optimizedAuthors = allAuthors.map(author => {
            return {
                ...author,
                authorLevel: levelMap.get(author.id) || { xp: 0, level: 1 },
                // Allow UI to access length or raw property
                bookCount: bookCountMap.get(author.id) || 0,
                // Provide "books" array with length proxy for compatibility with sorting logic "b.books?.length"
                // OR just update frontend to use bookCount
                books: Array(bookCountMap.get(author.id) || 0).fill(null),
                totalHighlights: highlightCountMap.get(author.id) || 0
            };
        });

        res.json(optimizedAuthors);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const authorId = parseInt(req.params.id);

        const author = await db.query.authors.findFirst({
            where: eq(authors.id, authorId),
            with: {
                bookAuthors: {
                    with: {
                        book: {
                            with: {
                                highlights: true
                            }
                        }
                    }
                },
                highlights: true
            }
        });

        if (!author) return res.status(404).json({ error: 'Author not found' });

        // Fetch the author level separately
        const authorLevel = await db.query.authorLevels.findFirst({
            where: eq(authorLevels.authorId, authorId)
        });

        // Flatten books
        const books = author.bookAuthors.map(ba => ba.book);

        // Add the level data to the response
        res.json({
            ...author,
            books: books, // Override/Add flattened books
            authorLevel: authorLevel || { xp: 0, level: 1 }
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Fetch and save author demographics from Wikidata
router.post('/:id/enrich', async (req, res) => {
    try {
        const authorId = parseInt(req.params.id);
        const author = await db.query.authors.findFirst({
            where: eq(authors.id, authorId)
        });

        if (!author) return res.status(404).json({ error: 'Author not found' });

        const { fetchAuthorDemographics } = await import('../services/author-enrichment.js');
        const demographics = await fetchAuthorDemographics(author.name);

        if (demographics && Object.keys(demographics).length > 0) {
            await db.update(authors)
                .set(demographics)
                .where(eq(authors.id, authorId));

            res.json({ success: true, demographics });
        } else {
            res.status(404).json({ error: 'No demographic data found' });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Manually update author demographics
router.patch('/:id', async (req, res) => {
    try {
        const authorId = parseInt(req.params.id);
        const { gender, race, nationality, birthYear, deathYear, bio, vocation } = req.body;

        // Construct update object with only provided fields
        const updateData = {};
        if (gender !== undefined) updateData.gender = gender; // Text
        if (race !== undefined) updateData.race = race;       // JSONB Array
        if (nationality !== undefined) updateData.nationality = nationality; // JSONB Array
        if (vocation !== undefined) updateData.vocation = vocation; // JSONB Array
        if (birthYear !== undefined) updateData.birthYear = birthYear; // Integer
        if (deathYear !== undefined) updateData.deathYear = deathYear; // Integer
        if (bio !== undefined) updateData.bio = bio; // Text

        // Helper: Title Case Normalization
        const normalize = (val) => {
            if (!val) return val;
            if (Array.isArray(val)) {
                return [...new Set(val.map(v => v.trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase())))];
            }
            return val.trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
        };

        // Apply Normalization
        if (updateData.gender) updateData.gender = normalize(updateData.gender);
        if (updateData.race) updateData.race = normalize(updateData.race);
        if (updateData.nationality) updateData.nationality = normalize(updateData.nationality);
        if (updateData.vocation) updateData.vocation = normalize(updateData.vocation);

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        await db.update(authors)
            .set(updateData)
            .where(eq(authors.id, authorId));

        // Auto-recalculate stats in background
        const { recalculateStats } = await import('../services/stats.js');
        recalculateStats().catch(console.error);

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
