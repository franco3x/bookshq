
import { db } from '../database/db.ts';
import { books } from '../database/schema.ts';
import { isNull, eq, sql } from 'drizzle-orm';

async function run() {
    console.log('🔍 Checking database state for covers...');

    // Count NULL covers
    const nullCovers = await db.select({ count: sql`count(*)` })
        .from(books)
        .where(isNull(books.coverImage));

    // Count Empty String covers
    const emptyCovers = await db.select({ count: sql`count(*)` })
        .from(books)
        .where(eq(books.coverImage, ''));

    console.log(`NULL covers: ${nullCovers[0].count}`);
    console.log(`Empty string covers: ${emptyCovers[0].count}`);
    process.exit(0);
}

run();
