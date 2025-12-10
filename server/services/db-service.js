import { db } from '../database/db';
import { authors, books, highlights } from '../database/schema';
import { eq, and } from 'drizzle-orm';

export async function findOrCreateAuthor(name) {
    // Normalize name
    const normalizedName = name.trim();

    const existing = await db.select().from(authors).where(eq(authors.name, normalizedName)).limit(1);

    if (existing.length > 0) {
        return existing[0];
    }

    const [newAuthor] = await db.insert(authors).values({
        name: normalizedName,
    }).returning();

    return newAuthor;
}

export async function findOrCreateBook(title, authorId) {
    const existing = await db.select().from(books)
        .where(and(eq(books.title, title), eq(books.authorId, authorId)))
        .limit(1);

    if (existing.length > 0) {
        return existing[0];
    }

    const [newBook] = await db.insert(books).values({
        title,
        authorId,
    }).returning();

    return newBook;
}

export async function saveHighlights(parsedClippings) {
    let createdCount = 0;
    let skippedCount = 0;

    for (const clipping of parsedClippings) {
        if (clipping.type !== 'highlight') continue;

        const author = await findOrCreateAuthor(clipping.author);
        const book = await findOrCreateBook(clipping.title, author.id);

        // Check if highlight exists (simple duplicate check)
        // In V1, we just check text + bookId.
        // V2 could be more sophisticated with locations.
        const existing = await db.select().from(highlights)
            .where(and(eq(highlights.text, clipping.text), eq(highlights.bookId, book.id)))
            .limit(1);

        if (existing.length > 0) {
            skippedCount++;
            continue;
        }

        await db.insert(highlights).values({
            text: clipping.text,
            bookId: book.id,
            authorId: author.id,
            location: clipping.location,
            originalDate: clipping.date,
            createdAt: new Date(),
        });
        createdCount++;
    }

    // Award XP
    if (createdCount > 0) {
        const { onHighlightAdded } = await import('./gamification.js');
        await onHighlightAdded(createdCount);
    }

    return { createdCount, skippedCount };
}
