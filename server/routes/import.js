import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { parseMyClippings } from '../services/parser.js';
import { parseReadwiseCSV } from '../services/readwise-parser.js';
import { saveHighlights } from '../services/db-service.js';
import { importGoodreadsCSV } from '../services/goodreads-import.js';

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

router.post('/', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        const fileContent = req.file.buffer.toString('utf-8');
        const clippings = parseMyClippings(fileContent);
        const result = await saveHighlights(clippings);
        res.json(result);
    } catch (error) {
        console.error('Import error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Import Readwise CSV
router.post('/readwise', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        const fileContent = req.file.buffer.toString('utf-8');
        const clippings = parseReadwiseCSV(fileContent);
        const result = await saveHighlights(clippings);
        res.json(result);
    } catch (error) {
        console.error('Readwise import error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Import highlights scraped from read.amazon.com/notebook by the bookmarklet (or its JSON download)
// Body: { books: [{ asin, title, author, highlights: [{ text, location, note, color }] }] }
router.post('/kindle-notebook', async (req, res) => {
    const notebookBooks = req.body?.books;
    if (!Array.isArray(notebookBooks)) {
        return res.status(400).json({ error: 'Expected { books: [...] }' });
    }

    try {
        const clippings = [];
        for (const book of notebookBooks) {
            const title = typeof book?.title === 'string' ? book.title.trim() : '';
            if (!title || !Array.isArray(book.highlights)) continue;

            // Kept verbatim ("Robert Greene, Joost Elffers") to match the author names Readwise imported.
            const author = String(book.author ?? '').replace(/^\s*by:?\s*/i, '').trim() || 'Unknown Author';

            for (const h of book.highlights) {
                const text = typeof h?.text === 'string' ? h.text.trim() : '';
                if (!text) continue;
                clippings.push({
                    title,
                    author,
                    text,
                    location: h.location != null ? String(h.location).trim() : '',
                    date: null,
                    note: h.note || null,
                    asin: book.asin || null,
                    type: 'highlight'
                });
            }
        }

        const dryRun = req.query.dryRun === '1';
        const result = await saveHighlights(clippings, { updateByLocation: true, dryRun });
        res.json({ ...result, bookCount: notebookBooks.length });
    } catch (error) {
        console.error('Kindle notebook import error:', error);
        res.status(500).json({ error: error.message });
    }
});

function findKindleClippings() {
    let volumes = [];
    try {
        volumes = fs.readdirSync('/Volumes');
    } catch {
        return null;
    }
    for (const volume of volumes) {
        const file = path.join('/Volumes', volume, 'documents', 'My Clippings.txt');
        if (fs.existsSync(file)) return file;
    }
    return null;
}

// Import My Clippings.txt straight from a Kindle mounted over USB.
// No updateByLocation here: the file keeps every old version of an edited highlight.
router.post('/kindle-device', async (req, res) => {
    const file = findKindleClippings();
    if (!file) {
        return res.status(404).json({ error: 'No Kindle detected. Plug it in over USB, wait for it to show up in Finder, then try again.' });
    }

    try {
        const clippings = parseMyClippings(fs.readFileSync(file, 'utf-8'));
        const result = await saveHighlights(clippings);
        res.json(result);
    } catch (error) {
        console.error('Kindle device import error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Import Goodreads CSV
router.post('/goodreads', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        const fileContent = req.file.buffer.toString('utf-8');
        const results = await importGoodreadsCSV(fileContent);
        res.json(results);
    } catch (error) {
        console.error('Goodreads import error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
