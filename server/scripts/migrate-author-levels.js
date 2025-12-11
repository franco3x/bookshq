import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function migrate() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });

    try {
        await client.connect();
        console.log('Connected to database...\n');

        console.log('Creating author_levels table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS author_levels (
                id serial PRIMARY KEY,
                author_id integer NOT NULL REFERENCES authors(id),
                xp integer DEFAULT 0 NOT NULL,
                level integer DEFAULT 1 NOT NULL,
                updated_at timestamp DEFAULT now()
            );
        `);

        // Add unique index
        await client.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS unique_author_level_idx ON author_levels(author_id);
        `);

        // Add performance indexes
        await client.query('CREATE INDEX IF NOT EXISTS idx_author_levels_author_id ON author_levels(author_id)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_author_levels_level_xp ON author_levels(level DESC, xp DESC)');

        console.log('✅ Author levels table created!\n');

        await client.end();
        console.log('Migration successful!');
        process.exit(0);
    } catch (e) {
        console.error('Error:', e);
        await client.end();
        process.exit(1);
    }
}

migrate();
