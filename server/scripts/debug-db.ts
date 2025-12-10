import * as dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const url = process.env.DATABASE_URL;

if (!url) {
    console.error('❌ DATABASE_URL is undefined');
    process.exit(1);
}

// Mask password for safety
const maskedUrl = url.replace(/:([^:@]+)@/, ':****@');
console.log('Original URL (Masked):', maskedUrl);

try {
    const config = new pg.Client({ connectionString: url });
    console.log('Parsed Config:');
    console.log('  User:', config.user);
    console.log('  Host:', config.host);
    console.log('  Database:', config.database);
    console.log('  Port:', config.port);
    console.log('  SSL:', config.ssl);

} catch (e) {
    console.error('Error parsing config:', e);
}
