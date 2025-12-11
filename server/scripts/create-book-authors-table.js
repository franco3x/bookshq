import { db } from '../database/db.ts';
import { sql } from 'drizzle-orm';

async function createTable() {
    console.log('🔄 Creating book_authors table...');

    try {
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS book_authors (
                id SERIAL PRIMARY KEY,
                book_id INTEGER NOT NULL REFERENCES books(id),
                author_id INTEGER NOT NULL REFERENCES authors(id)
            );
            
            CREATE UNIQUE INDEX IF NOT EXISTS unique_book_author_idx ON book_authors (book_id, author_id);
        `);

        console.log('✅ Created book_authors table successfully.');
        process.exit(0);

    } catch (e) {
        console.error('❌ Failed to create table:', e);
        process.exit(1);
    }
}

createTable();
