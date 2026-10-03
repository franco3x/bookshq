import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchBookCover } from './cover-fetcher.js';

// ---------------------------------------------------------------------------
// Helpers: build fake HTTP responses so tests never touch the real internet.
// ---------------------------------------------------------------------------

// A successful response whose body is `body`.
function okResponse(body) {
    return { ok: true, statusText: 'OK', json: async () => body };
}

// A failed response, e.g. Google's rate-limit error.
function errorResponse(statusText) {
    return { ok: false, statusText, json: async () => ({}) };
}

// What Google Books returns when it finds a usable book.
const googleHit = {
    items: [{
        volumeInfo: {
            title: 'The Subtle Art of Not Giving a F*ck',
            language: 'en',
            categories: ['Self-Help'],
            imageLinks: { thumbnail: 'http://books.google.com/cover.jpg&edge=curl' }
        }
    }]
};

// What Open Library returns when it finds a book with a cover.
const openLibraryHit = { docs: [{ cover_i: 12345 }] };

// ---------------------------------------------------------------------------

describe('fetchBookCover (Google Books first, Open Library fallback — ADR 0006)', () => {
    let fetchMock;

    beforeEach(() => {
        // Replace the real `fetch` with a fake we control.
        fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
        // Silence the expected error/warn logs so test output stays readable.
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        // Put the real `fetch` and console back after every test.
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('uses Google Books when Google finds a cover', async () => {
        fetchMock.mockResolvedValueOnce(okResponse(googleHit));

        const result = await fetchBookCover('The Subtle Art', 'Mark Manson');

        expect(result).toEqual({
            coverUrl: 'https://books.google.com/cover.jpg', // upgraded to https, curl removed
            genre: 'Self-Help'
        });
        expect(fetchMock).toHaveBeenCalledTimes(1); // never needed Open Library
    });

    it('falls back to Open Library when Google is rate-limited', async () => {
        fetchMock
            .mockResolvedValueOnce(errorResponse('Too Many Requests')) // Google fails
            .mockResolvedValueOnce(okResponse(openLibraryHit));        // Open Library works

        const result = await fetchBookCover('The Subtle Art', 'Mark Manson');

        expect(result).toEqual({
            coverUrl: 'https://covers.openlibrary.org/b/id/12345-L.jpg',
            genre: null // Open Library genre is intentionally never trusted
        });
        expect(fetchMock.mock.calls[1][0]).toContain('openlibrary.org');
    });

    it('falls back to Open Library when Google responds but finds nothing', async () => {
        fetchMock
            .mockResolvedValueOnce(okResponse({ items: [] }))   // Google: no results
            .mockResolvedValueOnce(okResponse(openLibraryHit)); // Open Library works

        const result = await fetchBookCover('Obscure Book', 'Some Author');

        expect(result.coverUrl).toBe('https://covers.openlibrary.org/b/id/12345-L.jpg');
    });

    it('returns empty values instead of crashing when both sources fail', async () => {
        // Regression test: this used to return bare `null`, which crashed the
        // route handler when it tried `const { coverUrl, genre } = ...`.
        fetchMock.mockResolvedValue(errorResponse('Service Unavailable'));

        const result = await fetchBookCover('Any Book', 'Any Author');

        expect(result).toEqual({ coverUrl: null, genre: null });
    });
});
