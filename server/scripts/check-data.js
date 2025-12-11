import { db } from '../database/db.js';
import { books, authors, highlights } from '../database/schema.js';

async function checkData() {
    try {
        console.log('Checking database...\n');

        const bookCount = await db.select().from(books);
        const authorCount = await db.select().from(authors);
        const highlightCount = await db.select().from(highlights);

        console.log(`📚 Books: ${bookCount.length}`);
        console.log(`✍️  Authors: ${authorCount.length}`);
        console.log(`💡 Highlights: ${highlightCount.length}`);

        if (bookCount.length > 0) {
            console.log('\n✅ Data exists! It might just be a display issue.');
        } else {
            console.log('\n❌ No data found in database.');
        }

        process.exit(0);
    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
}

checkData();
