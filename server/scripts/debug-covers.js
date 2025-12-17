
import { fetchBookCover } from '../services/cover-fetcher.js';

async function run() {
    console.log('🔍 Testing Cover Fetcher...');

    // Test Case 1: Known popular book
    await testBook('Steve Jobs', 'Walter Isaacson');

    // Test Case 2: Older book
    await testBook('The Great Gatsby', 'F. Scott Fitzgerald');

    // Test Case 3: Book likely to have limited preview
    await testBook('Advanced Physics', 'Keith Gibbs');
}

async function testBook(title, author) {
    console.log(`\n📘 Fetching: "${title}" by ${author}`);
    const result = await fetchBookCover(title, author);

    if (result && result.coverUrl) {
        console.log(`✅ Result URL: ${result.coverUrl}`);
        // Check if accessible
        try {
            const res = await fetch(result.coverUrl);
            console.log(`   Status: ${res.status} ${res.statusText}`);
            console.log(`   Content-Type: ${res.headers.get('content-type')}`);
            console.log(`   Content-Length: ${res.headers.get('content-length')}`);
        } catch (e) {
            console.log(`   ❌ Failed to reach URL: ${e.message}`);
        }
    } else {
        console.log('   ❌ No cover found.');
    }
}

run();
