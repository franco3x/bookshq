
import { db } from '../database/db.js';
import { authors, authorLevels, bookAuthors, books, highlights } from '../database/schema.js';
import { sql } from 'drizzle-orm';

async function run() {
    console.log('⏱️ Profiling Optimized Authors Query...');
    const start = performance.now();

    try {
        // 1. Fetch Authors (Basic info)
        console.time('Fetch Authors');
        const allAuthors = await db.query.authors.findMany({
            columns: {
                id: true,
                name: true
            }
        });
        console.timeEnd('Fetch Authors');
        console.log(`Found ${allAuthors.length} authors.`);

        // 2. Fetch Book Counts
        console.time('Fetch Book Counts');
        const bookCounts = await db
            .select({
                authorId: bookAuthors.authorId,
                count: sql`count(*)`.mapWith(Number)
            })
            .from(bookAuthors)
            .groupBy(bookAuthors.authorId);
        console.timeEnd('Fetch Book Counts');

        // 3. Fetch Highlight Counts
        console.time('Fetch Highlights');
        const highlightCounts = await db
            .select({
                authorId: highlights.authorId,
                count: sql`count(*)`.mapWith(Number)
            })
            .from(highlights)
            .where(sql`${highlights.authorId} IS NOT NULL`)
            .groupBy(highlights.authorId);
        console.timeEnd('Fetch Highlights');

        // 4. Mapping
        console.time('Mapping');
        const bookCountMap = new Map(bookCounts.map(b => [b.authorId, b.count]));
        const highlightCountMap = new Map(highlightCounts.map(h => [h.authorId, h.count]));

        const result = allAuthors.map(author => ({
            ...author,
            bookCount: bookCountMap.get(author.id) || 0,
            totalHighlights: highlightCountMap.get(author.id) || 0
        }));
        console.timeEnd('Mapping');

        const end = performance.now();
        console.log(`✅ Total Exec Time: ${(end - start).toFixed(2)}ms`);

    } catch (e) {
        console.error('❌ Error:', e);
    }
    process.exit(0);
}

run();
