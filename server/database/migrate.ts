import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db } from './db';
import { client } from './db'; // Need to export client to close it

// Assuming db is exported from ./db
// We need to modify ./db.ts to export the raw client if we want to close it gracefully
// Or just let the process exit.

async function runMigrate() {
    console.log('Running migrations...');
    try {
        await migrate(db, { migrationsFolder: 'drizzle' });
        console.log('Migrations complete!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigrate();
