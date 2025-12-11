import { db } from '../database/db.ts';
import { books, authors, authorLevels, bookAuthors, highlights } from '../database/schema.ts';
import { ilike, eq } from 'drizzle-orm';

async function checkStatus() {
    console.log('Checking Author Status:\n');

    // 1. Find relevant authors
    const authorsFound = await db.query.authors.findMany({
        where: ilike(authors.name, '%Moran%'),
        with: {
            bookAuthors: {
                with: {
                    book: true
                }
            },
            highlights: true
        }
    });

    for (const a of authorsFound) {
        console.log(`👤 Author: ${a.name} (ID: ${a.id})`);

        // Fetch level manually
        const level = await db.query.authorLevels.findFirst({
            where: eq(authorLevels.authorId, a.id)
        });

        console.log(`   Lv: ${level?.level || 1} (XP: ${level?.xp || 0})`);
        console.log(`   Books Linked: ${a.bookAuthors.length}`);
        a.bookAuthors.forEach(ba => console.log(`     - [${ba.book.id}] ${ba.book.title} (Read: ${ba.book.readCount})`));
        console.log(`   Highlights Linked: ${a.highlights.length}`);

        if (a.bookAuthors.length === 0 && a.highlights.length === 0) {
            console.log('   ⚠️  ORPHAN AUTHOR DETECTED (Should be deleted)');
        }
        console.log('---');
    }

    process.exit(0);
}

checkStatus();
