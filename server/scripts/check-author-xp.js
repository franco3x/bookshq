import { db } from '../database/db.js';
import { authors, authorLevels, books, highlights } from '../database/schema.js';
import { eq, ilike, sql } from 'drizzle-orm';

async function check() {
    console.log('Searching for Brandon Turner...');

    // 1. Find Author
    const foundAuthors = await db.query.authors.findMany({
        where: ilike(authors.name, '%Brandon Turner%'),
        with: {
            books: {
                with: {
                    highlights: true
                }
            }
        }
    });

    if (foundAuthors.length === 0) {
        console.log('❌ Author not found');
        process.exit(0);
    }

    const author = foundAuthors[0];
    console.log(`\n👨‍🏫 Author: ${author.name} (ID: ${author.id})`);

    // 2. Check Levels
    const levels = await db.query.authorLevels.findFirst({
        where: eq(authorLevels.authorId, author.id)
    });

    console.log(`📊 Current Level Data:`, levels || 'No record in author_levels table');

    // 3. Calculate Expected XP
    // Rules: 10 XP per highlight, 100 XP per read book, 50 XP per re-read
    let highlightCount = 0;
    let readCount = 0;
    let expectedXP = 0;

    for (const book of author.books) {
        const hCount = book.highlights.length;
        highlightCount += hCount;
        expectedXP += (hCount * 10); // 10 XP per highlight

        if (book.readCount > 0) {
            readCount += book.readCount;
            // 100 XP for first read, 50 for subsequent
            // Formula: 100 + (readCount - 1) * 50
            const bookXP = 100 + (book.readCount - 1) * 50;
            expectedXP += bookXP;
        }

        console.log(`   📖 Book: "${book.title}"`);
        console.log(`      - Highlights: ${hCount} (${hCount * 10} XP)`);
        console.log(`      - Read Count: ${book.readCount} (${book.readCount > 0 ? 100 + (book.readCount - 1) * 50 : 0} XP)`);
    }

    console.log(`\n🧮 Summary:`);
    console.log(`   - Total Highlights: ${highlightCount}`);
    console.log(`   - Total Reads: ${readCount}`);
    console.log(`   - EXPECTED XP: ${expectedXP}`);
    console.log(`   - ACTUAL XP:   ${levels?.xp || 0}`);

    process.exit(0);
}

check();
