
import { fetchBookCover } from '../services/cover-fetcher.js';

async function run() {
    console.log('🔍 Testing Cover Fetcher...');

    // Test case: Atomic Habits (reported issue)
    const title = "Atomic Habits";
    const author = "James Clear";

    console.log(`Querying for: "${title}" by "${author}"`);

    try {
        const result = await fetchBookCover(title, author);
        console.log('✅ Result:', JSON.stringify(result, null, 2));
    } catch (e) {
        console.error('❌ Error:', e);
    }
}

run();
