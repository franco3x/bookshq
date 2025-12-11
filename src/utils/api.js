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

    // Authors
    getAuthors: async () => {
        const response = await fetch(`${API_BASE}/authors`);
        if (!response.ok) throw new Error('Failed to fetch authors');
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

    // Highlights
    getRandomHighlight: async () => {
        const response = await fetch(`${API_BASE}/highlights/random`);
        if (!response.ok) throw new Error('Failed to fetch random highlight');
        return response.json();
    },

    getHighlights: async () => {
        const response = await fetch(`${API_BASE}/highlights`);
        if (!response.ok) throw new Error('Failed to fetch highlights');
        return response.json();
    },

    // Stats
    getStats: async () => {
        const response = await fetch(`${API_BASE}/stats`);
        if (!response.ok) throw new Error('Failed to fetch stats');
        return response.json();
    }
};
