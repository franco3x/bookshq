import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';

dotenv.config();

import importRouter from './routes/import.js';
import booksRouter from './routes/books.js';
import authorsRouter from './routes/authors.js';
import highlightsRouter from './routes/highlights.js';
import mergeRouter from './routes/merge.js';
import analyticsRouter from './routes/analytics.js';
import achievementsRouter from './routes/achievements.js';
import statsRouter from './routes/stats.js';
import searchRouter from './routes/search.js';
import exportRouter from './routes/export.js';
import adminRouter from './routes/admin.js';
import healthRouter from './routes/health.js';

const app = express();
// Default to 3001 to avoid conflict with Vite on 5005
const PORT = process.env.SERVER_PORT || 3001;

// The Kindle bookmarklet posts from https://read.amazon.com. Chrome's Private Network Access
// preflight must be answered before cors() ends the OPTIONS request.
app.use('/api/import/kindle-notebook', (req, res, next) => {
    if (req.headers['access-control-request-private-network']) {
        res.setHeader('Access-Control-Allow-Private-Network', 'true');
    }
    next();
});
app.use(cors());
// A whole library exceeds the default 100kb limit. text/plain lets the bookmarklet skip the CORS preflight.
// Must be mounted before the global parser, which would otherwise reject the body first.
app.use('/api/import/kindle-notebook', express.json({ limit: '25mb', type: ['application/json', 'text/plain'] }));
app.use(express.json());

app.use('/api/import', importRouter);
app.use('/api/books', booksRouter);
app.use('/api/authors', authorsRouter);
app.use('/api/highlights', highlightsRouter);
app.use('/api/merge', mergeRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/achievements', achievementsRouter);
app.use('/api/stats', statsRouter);
app.use('/api/search', searchRouter);
app.use('/api/export', exportRouter);
app.use('/api/admin', adminRouter);
app.use('/api', healthRouter);

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
