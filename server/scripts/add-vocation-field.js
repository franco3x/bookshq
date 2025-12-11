import { db } from '../database/db.ts';
import { sql } from 'drizzle-orm';

async function migrate() {
    console.log('🔄 Adding vocation field to authors table...');

    try {
        await db.execute(sql`
            ALTER TABLE authors 
            ADD COLUMN IF NOT EXISTS vocation jsonb DEFAULT '[]'::jsonb;
        `);

        console.log('✅ Migration Successful: Added vocation field.');
        process.exit(0);

    } catch (e) {
        console.error('❌ Migration Failed:', e);
        process.exit(1);
    }
}

migrate();
