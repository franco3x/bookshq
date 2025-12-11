import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function addIndexes() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });

    try {
        await client.connect();
        console.log('Connected to database...\n');

        console.log('Adding performance indexes...\n');

        // Highlights indexes (most critical - 8,350 rows)
        console.log('📊 Adding highlights indexes...');
        await client.query('CREATE INDEX IF NOT EXISTS idx_highlights_book_id ON highlights(book_id)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_highlights_author_id ON highlights(author_id)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_highlights_created_at ON highlights(created_at DESC)');
        console.log('✅ Highlights indexes added\n');

        // Books indexes
        console.log('📚 Adding books indexes...');
        await client.query('CREATE INDEX IF NOT EXISTS idx_books_author_id ON books(author_id)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_books_date_last_read ON books(date_last_read DESC)');
        console.log('✅ Books indexes added\n');

        // Category levels indexes (for fast lookups)
        console.log('🏷️  Adding category levels indexes...');
        await client.query('CREATE INDEX IF NOT EXISTS idx_category_levels_type ON category_levels(category_type)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_category_levels_type_value ON category_levels(category_type, category_value)');
        console.log('✅ Category levels indexes added\n');

        // Author levels indexes (skip if table doesn't exist yet)
        console.log('👤 Checking for author levels table...');
        const tableCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'author_levels'
            )
        `);

        if (tableCheck.rows[0].exists) {
            console.log('📊 Adding author levels indexes...');
            await client.query('CREATE INDEX IF NOT EXISTS idx_author_levels_author_id ON author_levels(author_id)');
            await client.query('CREATE INDEX IF NOT EXISTS idx_author_levels_level_xp ON author_levels(level DESC, xp DESC)');
            console.log('✅ Author levels indexes added\n');
        } else {
            console.log('⚠️  Author levels table not found, skipping indexes (will add after migration)\n');
        }

        await client.end();
        console.log('🚀 All indexes created successfully!');
        console.log('\nYour queries should now be MUCH faster! 🎉');
        process.exit(0);
    } catch (e) {
        console.error('Error:', e);
        await client.end();
        process.exit(1);
    }
}

addIndexes();
