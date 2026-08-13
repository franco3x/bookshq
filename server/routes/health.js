import express from 'express';
import { db } from '../database/db.js';
import { sql } from 'drizzle-orm';

const router = express.Router();

router.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.get('/db-check', async (req, res) => {
    try {
        const result = await db.execute(sql`SELECT NOW()`);
        res.json({ status: 'connected', result });
    } catch (error) {
        console.error('DB Connection Check Failed:', error);
        res.status(500).json({ status: 'error', error: error.message });
    }
});

export default router;
