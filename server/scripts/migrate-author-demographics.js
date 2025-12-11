import { db } from '../database/db.ts';
import { sql } from 'drizzle-orm';

async function migrate() {
    console.log('🔄 Starting Author Demographics Migration (Text -> JSONB)...');

    try {
        // 1. Migrate 'race' column
        console.log('Migrating race column...');
        await db.execute(sql`
            ALTER TABLE authors 
            ALTER COLUMN race TYPE jsonb 
            USING CASE 
                WHEN race IS NULL THEN '[]'::jsonb
                WHEN race = '' THEN '[]'::jsonb
                -- If it looks like a JSON array already, keep it, otherwise wrap in array
                WHEN race::text LIKE '[%]' THEN race::jsonb
                ELSE jsonb_build_array(race)
            END;
        `);

        // 2. Migrate 'nationality' column
        console.log('Migrating nationality column...');
        await db.execute(sql`
            ALTER TABLE authors 
            ALTER COLUMN nationality TYPE jsonb 
            USING CASE 
                WHEN nationality IS NULL THEN '[]'::jsonb
                WHEN nationality = '' THEN '[]'::jsonb
                WHEN nationality::text LIKE '[%]' THEN nationality::jsonb
                ELSE jsonb_build_array(nationality)
            END;
        `);

        console.log('✅ Migration Successful: Converted race and nationality to JSONB arrays.');
        process.exit(0);

    } catch (e) {
        console.error('❌ Migration Failed:', e);
        process.exit(1);
    }
}

migrate();
