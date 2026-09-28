const API_BASE = '/api';

export const api = {
    // Upload Kindle Clippings
    importClippings: async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_BASE}/import`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error('Import failed');
        }

        return response.json();
    },

    importFromKindleDevice: async () => {
        const response = await fetch(`${API_BASE}/import/kindle-device`, { method: 'POST' });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data.error || 'Import failed');
        }
        return data;
    },

    // Upload Goodreads Export
    importGoodreadsCSV: async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_BASE}/import/goodreads`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error('Import failed');
        }

        return response.json();
    },

    mergeBooks: async (targetId, sourceId) => {
        const response = await fetch(`${API_BASE}/merge/books`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetId, sourceId }),
        });
        if (!response.ok) throw new Error('Merge failed');
        return response.json();
    },

    mergeAuthors: async (targetId, sourceId) => {
        const response = await fetch(`${API_BASE}/merge/authors`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetId, sourceId }),
        });
        if (!response.ok) throw new Error('Merge failed');
        return response.json();
    },

    // Books
    getBooks: async () => {
        const response = await fetch(`${API_BASE}/books`);
        if (!response.ok) throw new Error('Failed to fetch books');
        return response.json();
    },

    getBook: async (id) => {
        const response = await fetch(`${API_BASE}/books/${id}`);
        if (!response.ok) throw new Error('Failed to fetch book');
        return response.json();
    },

    updateBook: async (id, data) => {
        const response = await fetch(`${API_BASE}/books/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to update book');
        return response.json();
    },

    fetchBookCover: async (id) => {
        const response = await fetch(`${API_BASE}/books/${id}/cover/fetch`, {
            method: 'POST'
        });
        if (!response.ok) throw new Error('Failed to fetch cover');
        return response.json();
    },

    // Authors
    getAuthors: async () => {
        const response = await fetch(`${API_BASE}/authors`);
        if (!response.ok) throw new Error('Failed to fetch authors');
        return response.json();
    },

    createAuthor: async (name) => {
        const response = await fetch(`${API_BASE}/authors`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        if (!response.ok) throw new Error('Failed to create author');
        return response.json();
    },

    getAuthor: async (id) => {
        const response = await fetch(`${API_BASE}/authors/${id}`);
        if (!response.ok) throw new Error('Failed to fetch author');
        return response.json();
    },

    // Author Demographics
    fetchAuthorDemographics: async (id) => {
        const response = await fetch(`${API_BASE}/authors/${id}/enrich`, {
            method: 'POST'
        });
        if (!response.ok) throw new Error('Failed to enrich author data');
        return response.json();
    },

    updateAuthorDemographics: async (id, data) => {
        const response = await fetch(`${API_BASE}/authors/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to update author');
        return response.json();
    },

    // Bulk mark as read
    bulkMarkAsRead: async (bookIds) => {
        const response = await fetch(`${API_BASE}/books/bulk/read`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookIds })
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to mark books as read');
        }
        return response.json();
    },

    // Bulk update tags for books
    bulkUpdateTags: async (bookIds, tags) => {
        const response = await fetch(`${API_BASE}/books/bulk/tags`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookIds, tags })
        });
        if (!response.ok) throw new Error('Failed to update tags');
        return response.json();
    },

    // Highlights
    getRandomHighlight: async () => {
        const response = await fetch(`${API_BASE}/highlights/random`);
        if (!response.ok) throw new Error('Failed to fetch random highlight');
        return response.json();
    },

    getHighlights: async (page = 1, limit = 50) => {
        const response = await fetch(`${API_BASE}/highlights?page=${page}&limit=${limit}`);
        if (!response.ok) throw new Error('Failed to fetch highlights');
        return response.json();
    },

    // Stats
    getStats: async () => {
        const response = await fetch(`${API_BASE}/stats`);
        if (!response.ok) throw new Error('Failed to fetch stats');
        return response.json();
    },

    getCategoryLevels: async () => {
        const response = await fetch(`${API_BASE}/stats/categories`);
        if (!response.ok) throw new Error('Failed to fetch category stats');
        return response.json();
    },

    getAuthorRankings: async () => {
        const response = await fetch(`${API_BASE}/stats/authors/rankings`);
        if (!response.ok) throw new Error('Failed to fetch author rankings');
        return response.json();
    },

    getAchievements: async () => {
        const response = await fetch(`${API_BASE}/achievements`);
        if (!response.ok) throw new Error('Failed to fetch achievements');
        return response.json();
    }
};
