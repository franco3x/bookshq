import { db } from '../database/db.ts';
import { sql } from 'drizzle-orm';

async function migrate() {
    console.log('🔄 Starting Genre Column Migration (Text -> JSONB Array)...');

    try {
        // We use raw SQL because Drizzle doesn't handle type alteration with USING clause automatically/easily for this specific case
        await db.execute(sql`
            ALTER TABLE books 
            ALTER COLUMN genre TYPE jsonb 
            USING CASE 
                WHEN genre IS NULL THEN '[]'::jsonb
                ELSE jsonb_build_array(genre)
            END;
        `);

        console.log('✅ Migration Successful: genre column is now jsonb array.');
        process.exit(0);

    } catch (e) {
        console.error('❌ Migration Failed:', e);
        process.exit(1);
    }
}

migrate();
