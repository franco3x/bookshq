import express from 'express';
import { mergeBooks, mergeAuthors } from '../services/merge-service.js';

const router = express.Router();

router.post('/books', async (req, res) => {
    const { targetId, sourceId } = req.body;
    if (!targetId || !sourceId) {
        return res.status(400).json({ error: 'Target ID and Source ID are required' });
    }

    try {
        const result = await mergeBooks(parseInt(targetId), parseInt(sourceId));
        res.json(result);
    } catch (e) {
        console.error('Book merge error:', e);
        res.status(500).json({ error: e.message });
    }
});

router.post('/authors', async (req, res) => {
    const { targetId, sourceId } = req.body;
    if (!targetId || !sourceId) {
        return res.status(400).json({ error: 'Target ID and Source ID are required' });
    }

    try {
        const result = await mergeAuthors(parseInt(targetId), parseInt(sourceId));
        res.json(result);
    } catch (e) {
        console.error('Author merge error:', e);
        res.status(500).json({ error: e.message });
    }
});

export default router;
