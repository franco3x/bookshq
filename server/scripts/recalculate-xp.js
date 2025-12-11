import { recalculateStats } from '../services/stats.js';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
    await recalculateStats();
    process.exit(0);
}

run();
