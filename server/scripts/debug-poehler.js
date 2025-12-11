import { db } from '../database/db.ts';
import { books, authors, bookAuthors } from '../database/schema.ts';
import { eq, ilike } from 'drizzle-orm';

async function checkPoehler() {
    console.log('Checking Amy Poehler book data...\n');

    const result = await db.query.books.findFirst({
        where: ilike(books.title, '%Yes Please%'),
        with: {
            bookAuthors: {
                with: {
                    author: true
                }
            },
            highlights: true
        }
    });

    if (!result) {
        console.log('Book not found!');
        return;
    }

    console.log('📖 Book:', result.title);
    console.log('👤 Author:', result.bookAuthors[0]?.author?.name);
    console.log('📊 Read Count:', result.readCount);
    console.log('🖍️  Highlights:', result.highlights.length);
    console.log('\n🧮 Expected XP Calculation:');
    console.log('  Import: 10 XP');
    console.log(`  Read: ${result.readCount > 0 ? `250 + (${result.readCount - 1} * 150) = ${250 + (Math.max(0, result.readCount - 1) * 150)} XP` : '0 XP (not marked as read!)'}`);
    console.log(`  Highlights: ${result.highlights.length} * 10 = ${result.highlights.length * 10} XP`);
    console.log(`  TOTAL: ${10 + (result.readCount > 0 ? 250 + (Math.max(0, result.readCount - 1) * 150) : 0) + (result.highlights.length * 10)} XP`);

    process.exit(0);
}

checkPoehler();
