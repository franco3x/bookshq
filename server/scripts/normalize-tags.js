
import { db } from '../database/db.js';
import { books } from '../database/schema.js';
import { eq } from 'drizzle-orm';

// Helper: Title Case
function toTitleCase(str) {
    if (!str || typeof str !== 'string') return str;
    return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

async function run() {
    console.log('🧹 Normalizing Tags and Genres to Title Case...');

    // Fetch all books
    const allBooks = await db.select().from(books);
    let count = 0;

    for (const book of allBooks) {
        let needsUpdate = false;
        const updates = {};

        // 1. Normalize Tags
        if (book.tags && Array.isArray(book.tags)) {
            const newTags = book.tags.map(t => toTitleCase(t));
            // Check if changed
            if (JSON.stringify(newTags) !== JSON.stringify(book.tags)) {
                updates.tags = newTags;
                needsUpdate = true;
            }
        }

        // 2. Normalize Genre
        if (book.genre && Array.isArray(book.genre)) {
            const newGenre = book.genre.map(g => toTitleCase(g));
            if (JSON.stringify(newGenre) !== JSON.stringify(book.genre)) {
                updates.genre = newGenre;
                needsUpdate = true;
            }
        }

        if (needsUpdate) {
            await db.update(books)
                .set(updates)
                .where(eq(books.id, book.id));
            count++;
            console.log(`Updated "${book.title}":`, updates);
        }
    }

    console.log(`✅ Completed! Updated ${count} books.`);
    process.exit(0);
}

run();
