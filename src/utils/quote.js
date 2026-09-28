// Formats a highlight as plain text for the clipboard, e.g.:
// "<highlight text>"
//
// — <book title>, <author name>
export function formatQuote(text, bookTitle, authorName) {
    return `"${text}"\n\n— ${bookTitle}, ${authorName || 'Unknown Author'}`;
}

// A book's author name: the `authors` junction-table array (multi-author books) if it has
// entries, else the legacy single `author` field. Books imported before the junction table
// was backfilled may have an empty `authors` array despite a real legacy author.
export function bookAuthorName(book) {
    if (book?.authors?.length) return book.authors.map(a => a.name).join(', ');
    return book?.author?.name || 'Unknown Author';
}

// A highlight's author name: the denormalized field the /highlights endpoints return,
// falling back to the book's author for endpoints/highlights that only include that.
export function highlightAuthorName(highlight) {
    return highlight.author?.name || bookAuthorName(highlight.book);
}
