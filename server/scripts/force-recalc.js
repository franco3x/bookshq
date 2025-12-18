
import { recalculateStats } from '../services/stats.js';

async function run() {
    console.log('🚀 Manually triggering stats recalculation...');
    const success = await recalculateStats();
    if (success) {
        console.log('✅ Stats updated successfully.');
        process.exit(0);
    } else {
        console.error('❌ Stats update failed.');
        process.exit(1);
    }
}

run();
