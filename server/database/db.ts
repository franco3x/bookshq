import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';
import * as dotenv from 'dotenv';

dotenv.config();

// Cache the client to prevent exhaustion in dev (though mainly for serverless, good practice)
export const client = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(client, { schema });
