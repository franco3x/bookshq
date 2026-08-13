import express from 'express';
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
