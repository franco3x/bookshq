
const BASE_URL = 'https://www.googleapis.com/books/v1/volumes';

export async function fetchBookCover(title, author) {
    try {
        const query = `intitle:${encodeURIComponent(title)}+inauthor:${encodeURIComponent(author)}`;
        const url = `${BASE_URL}?q=${query}&maxResults=1`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Google Books API error: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.items && data.items.length > 0) {
            const volumeInfo = data.items[0].volumeInfo;
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
