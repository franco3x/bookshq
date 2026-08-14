
const GOOGLE_BASE_URL = 'https://www.googleapis.com/books/v1/volumes';
const OPEN_LIBRARY_BASE_URL = 'https://openlibrary.org/search.json';
const GOOGLE_BOOKS_API_KEY = process.env.GOOGLE_BOOKS_API_KEY;

export async function fetchFromGoogleBooks(title, author) {
    const query = `intitle:${encodeURIComponent(title)}+inauthor:${encodeURIComponent(author)}`;
    // Fetch more results to find the best match
    let url = `${GOOGLE_BASE_URL}?q=${query}&maxResults=5&langRestrict=en`;
    if (GOOGLE_BOOKS_API_KEY) {
        url += `&key=${GOOGLE_BOOKS_API_KEY}`;
    }

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Google Books API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.items && data.items.length > 0) {
        // Smart selection logic:
        // 1. Avoid "Summary", "Analysis" in title
        // 2. Prioritize Language = 'en'

        // First, filter out junk
        const validCandidates = data.items.filter(item => {
            const v = item.volumeInfo;
            if (!v.imageLinks) return false;

            const titleLower = v.title.toLowerCase();
            const isSummary = titleLower.includes('summary') ||
                titleLower.includes('analysis of') ||
                titleLower.includes('study guide');
            return !isSummary;
        });

        // Second, find best match
        let bestItem = null;

        // Try to find English one first
        const englishMatch = validCandidates.find(item => item.volumeInfo.language === 'en');

        if (englishMatch) {
            bestItem = englishMatch;
        } else if (validCandidates.length > 0) {
            // Fallback to first valid (e.g. if only Spanish is available)
            bestItem = validCandidates[0];
        } else {
            // Fallback to raw first item if everything was filtered (unlikely but possible)
            bestItem = data.items[0];
        }

        const volumeInfo = bestItem.volumeInfo;
        const genre = volumeInfo.categories ? volumeInfo.categories[0] : null;

        let coverUrl = null;
        if (volumeInfo.imageLinks) {
            // Prefer largest available
            const bestUrl = volumeInfo.imageLinks.extraLarge ||
                volumeInfo.imageLinks.large ||
                volumeInfo.imageLinks.medium ||
                volumeInfo.imageLinks.small ||
                volumeInfo.imageLinks.thumbnail;

            if (bestUrl) {
                // Magically improve quality by removing zoom and edge curl
                coverUrl = bestUrl.replace('http:', 'https:')
                    .replace('&edge=curl', '');
            }
        }

        return { coverUrl, genre };
    }

    return { coverUrl: null, genre: null };
}

async function queryOpenLibrary(params) {
    const url = `${OPEN_LIBRARY_BASE_URL}?${params.toString()}`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Open Library API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.docs?.find(doc => doc.cover_i) || null;
}

export async function fetchFromOpenLibrary(title, author) {
    // Open Library's title field search is picky about long subtitles and
    // punctuation ("Title: A Subtitle" often isn't indexed verbatim), unlike
    // Google's fuzzier `intitle:` operator. Try progressively looser queries
    // until one turns up a result with a cover image.
    const shortTitle = title.split(':')[0].trim();

    const attempts = [
        new URLSearchParams({ title, author, limit: '5' }),
        // Retry with just the portion before a colon, if there was a subtitle
        ...(shortTitle !== title
            ? [new URLSearchParams({ title: shortTitle, author, limit: '5' })]
            : []),
        // Last resort: free-text combined query instead of separate fields
        new URLSearchParams({ q: `${shortTitle} ${author}`, limit: '5' })
    ];

    for (const params of attempts) {
        const match = await queryOpenLibrary(params);
        if (match) {
            return {
                coverUrl: `https://covers.openlibrary.org/b/id/${match.cover_i}-L.jpg`,
                // Open Library's subject data is too noisy to trust as a genre source
                genre: null
            };
        }
    }

    return { coverUrl: null, genre: null };
}

export async function fetchBookCover(title, author) {
    try {
        const result = await fetchFromGoogleBooks(title, author);
        if (result.coverUrl || result.genre) {
            return result;
        }
    } catch (error) {
        console.error(`Google Books fetch failed for "${title}":`, error.message);
    }

    try {
        const result = await fetchFromOpenLibrary(title, author);
        if (result.coverUrl || result.genre) {
            return result;
        }
    } catch (error) {
        console.error(`Open Library fetch failed for "${title}":`, error.message);
    }

    console.warn(`No cover found for "${title}" by "${author}" in either source.`);
    return { coverUrl: null, genre: null };
}
