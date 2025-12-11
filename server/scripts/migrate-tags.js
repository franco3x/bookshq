import { sql } from 'drizzle-orm';
import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function addTagsColumn() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });

    try {
        await client.connect();
        console.log('Connected to database...\n');

        // Add tags column to books table if it doesn't exist
        console.log('Adding tags column to books table...');
        await client.query(
            `ALTER TABLE books 
             ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]'::jsonb`
        );
        console.log('✅ Tags column added!\n');

        // Check that data still exists
        const result = await client.query('SELECT COUNT(*) as count FROM books');
        console.log(`📚 Books in database: ${result.rows[0].count}`);

        const highlights = await client.query('SELECT COUNT(*) as count FROM highlights');
        console.log(`💡 Highlights in database: ${highlights.rows[0].count}`);

        await client.end();
        console.log('\n✅ Migration complete! Your data is safe.');
        process.exit(0);
    } catch (e) {
        console.error('Error:', e);
        await client.end();
        process.exit(1);
    }
}

addTagsColumn();
