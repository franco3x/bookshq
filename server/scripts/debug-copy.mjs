import { chromium } from 'playwright';

const browser = await chromium.launch();
const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
const page = await context.newPage();
page.on('console', (msg) => console.log('CONSOLE:', msg.type(), msg.text()));
page.on('pageerror', (err) => console.log('PAGEERROR:', err.message));
page.on('crash', () => console.log('CRASHED'));

await page.goto('http://localhost:5006/books/2439', { waitUntil: 'networkidle' });
await page.waitForSelector('.glass-panel', { timeout: 15000 });
await page.bringToFront();
await page.click('body'); // ensure focus

const btn = page.locator('button:has-text("Copy")').first();
await btn.click();
await page.waitForTimeout(300);

const clip = await page.evaluate(() => navigator.clipboard.readText()).catch(e => 'CLIPBOARD READ ERROR: ' + e.message);
console.log('Clipboard after click:', JSON.stringify(clip));
console.log('Button HTML after click:', await btn.evaluate(el => el.outerHTML));

await browser.close();
