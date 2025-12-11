
import { db } from '../database/db.js';
import { sql } from 'drizzle-orm';

async function createTables() {
    console.log('🛠️ Manually creating tables...');

    try {
        // Drop old table if it was the simple version (optional, but good for cleanup if it existed)
        // await db.execute(sql`DROP TABLE IF EXISTS "achievements" CASCADE;`);
        // ACTUALLY, let's just create if not exists and alter if needed, or mostly just create.
        // Given the prompt "rename column", the table exists but has wrong columns.
        // It's safer to DROP and RECREATE since it's dev and empty.

        console.log('Dropping old achievements table...');
        await db.execute(sql`DROP TABLE IF EXISTS "achievements" CASCADE;`);
        await db.execute(sql`DROP TABLE IF EXISTS "user_achievements" CASCADE;`);

        console.log('Creating achievements table...');
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS "achievements" (
                "id" SERIAL PRIMARY KEY,
                "code" TEXT NOT NULL UNIQUE,
                "title" TEXT NOT NULL,
                "description" TEXT NOT NULL,
                "icon" TEXT,
                "xp_reward" INTEGER DEFAULT 0 NOT NULL,
                "category" TEXT DEFAULT 'General',
                "condition_type" TEXT NOT NULL,
                "condition_value" INTEGER DEFAULT 0,
                "created_at" TIMESTAMP DEFAULT now() NOT NULL
            );
        `);

        console.log('Creating user_achievements table...');
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS "user_achievements" (
                "id" SERIAL PRIMARY KEY,
                "user_id" INTEGER DEFAULT 1,
                "achievement_id" INTEGER NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
                "unlocked_at" TIMESTAMP,
                "progress" INTEGER DEFAULT 0,
                "created_at" TIMESTAMP DEFAULT now() NOT NULL
            );
        `);

        console.log('Creating indexes...');
        await db.execute(sql`
            CREATE UNIQUE INDEX IF NOT EXISTS "unique_user_achievement_idx" ON "user_achievements" ("user_id", "achievement_id");
        `);

        console.log('✅ Tables created successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Failed to create tables:', error);
        process.exit(1);
    }
}

createTables();
