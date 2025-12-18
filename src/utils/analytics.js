
/**
 * Analytics Utility Library
 * Helper functions for processing book data for charts.
 */

// Helper: Normalize string to Title Case (e.g. "male" -> "Male", "african american" -> "African American")
function toTitleCase(str) {
    if (!str || typeof str !== 'string') return str;
    return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

/**
 * Group specific objects by a key and return counts.
 * Useful for simple fields like 'readStatus' or 'yearPublished'.
 * 
 * @param {Array} items - List of items (books)
 * @param {Function|String} keyInfo - Key to group by, or function to extract key
 * @returns {Array} - Array of { name: 'Key', value: 10 } sorted by value desc
 */
export function groupBySimple(items, keyInfo) {
    const counts = {};

    items.forEach(item => {
        const key = typeof keyInfo === 'function' ? keyInfo(item) : item[keyInfo];
        if (key === null || key === undefined) return;

        counts[key] = (counts[key] || 0) + 1;
    });

    return Object.entries(counts)
        .map(([name, value]) => ({ name: String(name), value }))
        .sort((a, b) => b.value - a.value);
}

/**
 * Aggregate counts for array fields (e.g. genre, tags).
 * 
 * @param {Array} books - List of books
 * @param {String} field - Field name (must be an array)
 * @returns {Array} - Array of { name: 'Sci-Fi', value: 5 } sorted by value desc
 */
export function aggregateArrayField(books, field) {
    const counts = {};

    books.forEach(book => {
        const values = book[field];
        if (!values || !Array.isArray(values)) return;

        values.forEach(val => {
            if (!val) return;
            const normalized = toTitleCase(val);
            counts[normalized] = (counts[normalized] || 0) + 1;
        });
    });

    return Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
}

/**
 * Aggregate counts for nested author demographics (e.g. author.gender, author.race).
 * Handles books with multiple authors correctly.
 * 
 * @param {Array} books - List of books
 * @param {String} field - Demographic field (e.g. 'gender', 'race')
 * @returns {Array} - Array of { name: 'Female', value: 12 }
 */
export function aggregateAuthorDemographic(books, field) {
    const counts = {};

    books.forEach(book => {
        if (!book.authors || book.authors.length === 0) {
            // Option: Track 'Unknown' or skip
            // counts['Unknown'] = (counts['Unknown'] || 0) + 1;
            return;
        }

        // Use Set to avoid double counting same demographic for same book 
        // (unless we want to count author-books, but usually we want "books read by X")
        // Decision: Count "Books read" that match criterion.
        // If a book has 2 Female authors, it's 1 "Female authored book".
        // If a book has 1 Male, 1 Female, it counts for BOTH Male and Female categories.

        const uniqueValuesForBook = new Set();

        book.authors.forEach(author => {
            const val = author[field];
            if (!val) return;

            if (Array.isArray(val)) {
                val.forEach(v => uniqueValuesForBook.add(toTitleCase(v)));
            } else {
                uniqueValuesForBook.add(toTitleCase(val));
            }
        });

        uniqueValuesForBook.forEach(val => {
            counts[val] = (counts[val] || 0) + 1;
        });
    });

    return Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
}

/**
 * Cross-tabulate two dimensions for heatmap data.
 * Example: Genre (rows) x Gender (cols)
 * 
 * @param {Array} books 
 * @param {String} rowExtractor - Function or field for row (e.g. genre)
 * @param {String} colExtractor - Function or field for col (e.g. author.gender)
 */
export function crossTabulate(books, rowType, colType) {
    // Implementation for later...
    // For V1 we might stick to simple charts first.
    return [];
}
