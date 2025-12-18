
const BASE_URL = 'https://www.googleapis.com/books/v1/volumes';

export async function fetchBookCover(title, author) {
    try {
        const query = `intitle:${encodeURIComponent(title)}+inauthor:${encodeURIComponent(author)}`;
        // Fetch more results to find the best match
        const url = `${BASE_URL}?q=${query}&maxResults=5&langRestrict=en`;

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
    } catch (error) {
        console.error(`Failed to fetch cover for "${title}":`, error.message);
        return null;
    }
}
