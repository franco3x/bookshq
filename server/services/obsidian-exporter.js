import { db } from '../database/db';
import { books, authors, highlights } from '../database/schema';
import { eq, desc } from 'drizzle-orm';
import AdmZip from 'adm-zip';

export async function generateObsidianExport() {
    const allBooks = await db.query.books.findMany({
        with: {
            author: true,
            highlights: {
                orderBy: desc(highlights.location)
            }
        }
    });

    const zip = new AdmZip();

    for (const book of allBooks) {
        const authorName = book.author?.name || 'Unknown Author';
        const safeTitle = book.title.replace(/[^a-z0-9]/gi, '_').trim();
        const safeAuthor = authorName.replace(/[^a-z0-9]/gi, '_').trim();

        // Frontmatter
        let content = `---
title: "${book.title}"
author: "${authorName}"
tags: [kindle, highlights]
read_date: ${book.dateLastRead ? new Date(book.dateLastRead).toISOString().split('T')[0] : ''}
---\n\n`;

        content += `# ${book.title}\n`;
        content += `**Author**: ${authorName}\n\n`;
        content += `## Highlights\n\n`;

        for (const highlight of book.highlights) {
            content += `> ${highlight.text}\n`;
            if (highlight.location) {
                content += `^ref-${highlight.location}\n`;
            }
            content += `\n---\n\n`;
        }

        // Add to ZIP
        // Folder structure: Author / Book.md
        zip.addFile(`${safeAuthor}/${safeTitle}.md`, Buffer.from(content, 'utf8'));
    }

    return zip.toBuffer();
}
