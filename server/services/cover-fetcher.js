
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
            if (volumeInfo.imageLinks) {
                // Prefer extraLarge, large, medium, small, then thumbnail
                return volumeInfo.imageLinks.extraLarge ||
                    volumeInfo.imageLinks.large ||
                    volumeInfo.imageLinks.medium ||
                    volumeInfo.imageLinks.small ||
                    volumeInfo.imageLinks.thumbnail;
            }
        }

        return null;
    } catch (error) {
        console.error(`Failed to fetch cover for "${title}":`, error.message);
        return null;
    }
}
