import { db } from '../database/db.ts';
import { books, bookAuthors } from '../database/schema.ts';
import { isNotNull } from 'drizzle-orm';

async function migrate() {
    console.log('🔄 Starting Author Migration (One-to-Many -> Many-to-Many)...');

    try {
        // 1. Fetch all books that have an authorId
        const validBooks = await db.select().from(books).where(isNotNull(books.authorId));
        console.log(`📚 Found ${validBooks.length} books with authors to migrate.`);

        let count = 0;
        for (const book of validBooks) {
            if (book.authorId) {
                // Check if link already exists
                const existing = await db.query.bookAuthors.findFirst({
                    where: (jt, { and, eq }) => and(eq(jt.bookId, book.id), eq(jt.authorId, book.authorId))
                });

                if (!existing) {
                    await db.insert(bookAuthors).values({
                        bookId: book.id,
                        authorId: book.authorId
                    });
                    count++;
                }
            }
        }

        console.log(`✅ Migration Successful: Created ${count} new links in book_authors.`);
        process.exit(0);

    } catch (e) {
        console.error('❌ Migration Failed:', e);
        process.exit(1);
    }
}

migrate();
