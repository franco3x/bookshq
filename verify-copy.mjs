import { chromium } from 'playwright';

const BASE = 'http://localhost:5006';

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
const page = await context.newPage();

page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text());
});
page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));

async function readClipboard() {
    return page.evaluate(() => navigator.clipboard.readText());
}

// --- Part 1: HighlightCard.jsx on the Highlights page ---
console.log('=== Navigating to /highlights ===');
await page.goto(`${BASE}/highlights`, { waitUntil: 'networkidle' });
await page.waitForSelector('.glass-panel', { timeout: 15000 });
await page.getByTitle('Grid View').click().catch(async () => {
    // fallback: click the LayoutGrid icon button (first of the two view-toggle buttons)
    await page.locator('button:has(svg.lucide-layout-grid)').click();
});
await page.waitForTimeout(300);

const firstCard = page.locator('.glass-panel.group').first();
await firstCard.hover();
await page.waitForTimeout(300);

const copyBtn = firstCard.getByTitle('Copy Quote');
await copyBtn.waitFor({ state: 'visible', timeout: 5000 });

const highlightRaw = await firstCard.locator('p.font-serif').innerText(); // already wrapped in "..." by the JSX
const bookTitle = await firstCard.locator('h4').innerText().catch(() => null);

// Get the highlight object straight from the API to compute the true expected author fallback chain
const hApiRes = await page.request.get(`${BASE}/api/highlights?page=1&limit=100`);
const hApiJson = await hApiRes.json();
const hMatch = (hApiJson.data || []).find(h => h.text && highlightRaw.includes(h.text));
const expectedAuthor = hMatch ? (hMatch.author?.name || hMatch.book?.author?.name || 'Unknown Author') : null;

const urlBefore = page.url();
await copyBtn.click();
await page.waitForTimeout(200);

const urlAfter = page.url();
console.log('URL unchanged (no navigation)?', urlBefore === urlAfter, urlBefore, '->', urlAfter);

const iconSwapped = await firstCard.locator('svg.lucide-check').count();
console.log('Checkmark icon visible after click?', iconSwapped > 0);

const clip1 = await readClipboard();
console.log('--- Clipboard from HighlightCard ---');
console.log(JSON.stringify(clip1));
const expected1 = `${highlightRaw}\n\n— ${bookTitle}, ${expectedAuthor}`;
console.log('Matches expected format?', clip1 === expected1);
if (clip1 !== expected1) {
    console.log('Expected:', JSON.stringify(expected1));
}
console.log('No literal "undefined" in clipboard?', !clip1.includes('undefined'));

await page.waitForTimeout(2200);
const iconRevertedCount = await firstCard.locator('svg.lucide-copy').count();
console.log('Icon reverted to Copy after 2s?', iconRevertedCount > 0);

await page.screenshot({ path: '/private/tmp/claude-501/-Users-frankcoleman-Desktop-bookshq/362bb43d-56ac-4734-8430-9edcc8d4beef/scratchpad/highlightcard-copy.png' });

// --- Part 2: BookDetail.jsx dead Copy button ---
console.log('\n=== Finding a book with highlights ===');
const booksRes = await page.request.get(`${BASE}/api/books`);
const books = await booksRes.json();
let targetBook = null;
for (const b of books.slice(0, 50)) {
    const hRes = await page.request.get(`${BASE}/api/books/${b.id}`);
    const full = await hRes.json();
    if (full.highlights && full.highlights.length > 0) {
        targetBook = full;
        break;
    }
}

if (!targetBook) {
    console.log('No book with highlights found via quick scan — widen scan');
    for (const b of books) {
        const hRes = await page.request.get(`${BASE}/api/books/${b.id}`);
        const full = await hRes.json();
        if (full.highlights && full.highlights.length > 0) {
            targetBook = full;
            break;
        }
    }
}

if (!targetBook) {
    console.log('FAIL: no book with highlights found at all');
} else {
    console.log(`Using book id=${targetBook.id} title="${targetBook.title}" authors=${JSON.stringify((targetBook.authors||[]).map(a=>a.name))}`);
    await page.goto(`${BASE}/books/${targetBook.id}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('#highlight-' + targetBook.highlights[0].id, { timeout: 15000 });

    const highlightBlock = page.locator(`#highlight-${targetBook.highlights[0].id}`);
    const hlRaw = await highlightBlock.locator('p.font-serif').innerText(); // already wrapped in "..." by the JSX
    const copyBtn2 = highlightBlock.getByRole('button', { name: /copy/i });
    await copyBtn2.click();
    await page.waitForTimeout(200);

    const labelAfter = await copyBtn2.innerText();
    console.log('Button label after click:', JSON.stringify(labelAfter));

    const clip2 = await readClipboard();
    console.log('--- Clipboard from BookDetail ---');
    console.log(JSON.stringify(clip2));
    const authorNames = (targetBook.authors || []).map(a => a.name).join(', ') || 'Unknown Author';
    const expected2 = `${hlRaw}\n\n— ${targetBook.title}, ${authorNames}`;
    console.log('Matches expected format?', clip2 === expected2);
    if (clip2 !== expected2) {
        console.log('Expected:', JSON.stringify(expected2));
    }

    await page.screenshot({ path: '/private/tmp/claude-501/-Users-frankcoleman-Desktop-bookshq/362bb43d-56ac-4734-8430-9edcc8d4beef/scratchpad/bookdetail-copy.png' });

    await page.waitForTimeout(2200);
    const labelReverted = await copyBtn2.innerText();
    console.log('Button label reverted after 2s?', labelReverted.trim() === 'Copy', JSON.stringify(labelReverted));
}

await browser.close();
console.log('\nDONE');
