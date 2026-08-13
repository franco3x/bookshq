import express from 'express';
import { generateObsidianExport } from '../services/obsidian-exporter.js';
import { generateHighlightImage } from '../services/image-generator.js';

const router = express.Router();

router.get('/obsidian', async (req, res) => {
    try {
        const zipBuffer = await generateObsidianExport();

        res.set('Content-Type', 'application/zip');
        res.set('Content-Disposition', 'attachment; filename=kindlewise_export.zip');
        res.set('Content-Length', zipBuffer.length);

        res.send(zipBuffer);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Export failed' });
    }
});

router.post('/image', async (req, res) => {
    const { text, title, author, coverUrl } = req.body;

    if (!text) return res.status(400).json({ error: 'Text required' });

    try {
        const imgBuffer = await generateHighlightImage(text, title || 'Unknown Book', author || 'Unknown Author', coverUrl);

        res.set('Content-Type', 'image/png');
        res.send(imgBuffer);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Image generation failed' });
    }
});

export default router;
