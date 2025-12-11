import { db } from '../database/db.ts';
import { books, authors, authorLevels, bookAuthors } from '../database/schema.ts';
import { ilike, eq } from 'drizzle-orm';

async function checkStatus() {
    console.log('Checking Author Status:\n');

    // Check for "Brian P. Moran" variations
    const authorsFound = await db.query.authors.findMany({
        where: ilike(authors.name, '%Moran%'),
        with: {
            authorLevel: true,
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
        console.log(`   Lv: ${a.authorLevel?.level || 1} (XP: ${a.authorLevel?.xp || 0})`);
        console.log(`   Books Linked: ${a.bookAuthors.length}`);
        a.bookAuthors.forEach(ba => console.log(`     - [${ba.book.id}] ${ba.book.title} (Read: ${ba.book.readCount})`));
        console.log(`   Highlights Linked: ${a.highlights.length}`);
        console.log('---');
    }

    process.exit(0);
}

checkStatus();
