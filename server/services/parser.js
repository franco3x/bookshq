import { parse, isValid } from 'date-fns';

export function parseMyClippings(fileContent) {
    const SEPARATOR = '==========';
    const entries = fileContent.split(SEPARATOR).filter(e => e.trim().length > 0);

    const parsedData = [];

    for (const entry of entries) {
        const lines = entry.trim().split('\n');
        if (lines.length < 3) continue;

        // Line 1: Book Title (Author)
        // Sometimes has weird BOM or whitespace
        const line1 = lines[0].trim().replace(/^\uFEFF/, '');

        // Regex to separate Title and Author
        // format: "Book Title (Author Name)"
        // or "Book Title (Subtitle) (Author Name)"
        const authorMatch = line1.match(/\(([^)]+)\)$/);

        let title = line1;
        let author = 'Unknown Author';

        if (authorMatch) {
            author = authorMatch[1];
            title = line1.replace(authorMatch[0], '').trim();
        }

        // Line 2: Metadata (Location, Date)
        // "- Your Highlight on Location 123-456 | Added on Wednesday, January 1, 2020 12:00:00 AM"
        const line2 = lines[1].trim();

        // Extract Location
        let location = '';
        const locationMatch = line2.match(/Location\s+(\d+(?:-\d+)?)/i);
        if (locationMatch) {
            location = locationMatch[1];
        }

        // Extract Date
        // Date formats vary wildly by Kindle locale.
        // We try to find "Added on " and parse the rest.
        let addedDate = null;
        const datePart = line2.split('|').pop().trim();
        if (datePart.includes('Added on')) {
            const dateString = datePart.replace('Added on', '').trim();
            // Try parsing common formats
            // Example: "Wednesday, February 2, 2022 8:43:08 AM"
            const parsed = new Date(dateString);
            if (isValid(parsed)) {
                addedDate = parsed;
            }
        }

        // Line 3+: Content
        // Sometimes there are empty lines between metadata and content
        const content = lines.slice(2).join('\n').trim();

        if (content) {
            parsedData.push({
                title,
                author,
                location,
                date: addedDate,
                text: content,
                type: line2.includes('Highlight') ? 'highlight' : line2.includes('Note') ? 'note' : 'bookmark'
            });
        }
    }

    return parsedData;
}
