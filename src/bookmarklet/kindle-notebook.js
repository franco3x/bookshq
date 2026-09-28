// Runs on read.amazon.com/notebook as a bookmarklet. ImportModal.jsx fills in the placeholders.
// Every Amazon-specific selector lives in SEL; when Amazon changes the page, this is the only place to fix.
(async () => {
    const BOOKSHQ_URL = '__BOOKSHQ_URL__';
    const MODE = '__MODE__'; // 'sync' imports; 'preview' asks BooksHQ for a dry run and saves the data to Downloads

    const SEL = {
        book: '.kp-notebook-library-each-book', // id = ASIN
        bookTitle: 'h2',
        bookAuthor: 'p', // "By: Dawn Staley"
        libraryList: '#kp-notebook-library',
        location: '[id="kp-annotation-location"]', // ids repeat once per annotation, so match by attribute
        annotationRow: '.a-row.a-spacing-base',
        highlightText: '[id="highlight"]',
        note: '[id="note"]',
        highlightHeader: '[id="annotationHighlightHeader"]', // "Yellow highlight | Location: 33"
        nextPageToken: '.kp-notebook-annotations-next-page-start',
        contentLimitState: '.kp-notebook-content-limit-state',
    };
    const DELAY_MS = 250;

    if (window.__bookshqRunning) return;
    if (!/(^|\.)read\.amazon\./.test(location.hostname) || !location.pathname.startsWith('/notebook')) {
        alert('Open read.amazon.com/notebook first, then click "Send to BooksHQ" again.');
        return;
    }
    window.__bookshqRunning = true;

    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;top:16px;right:16px;z-index:2147483647;max-width:340px;padding:14px 16px;' +
        'background:#111;color:#eee;font:14px/1.4 -apple-system,system-ui,sans-serif;border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,.4);white-space:pre-line';
    document.body.appendChild(box);
    const show = (msg, done = false) => {
        box.textContent = 'BooksHQ\n' + msg;
        if (done) {
            const close = document.createElement('button');
            close.textContent = 'Close';
            close.style.cssText = 'display:block;margin-top:10px;padding:4px 12px;border-radius:6px;border:0;cursor:pointer';
            close.onclick = () => box.remove();
            box.appendChild(close);
            window.__bookshqRunning = false;
        }
    };

    const download = (name, data) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
        a.download = name;
        a.click();
    };

    // The library list may load more books as it scrolls; scroll until the count stops growing.
    async function loadAllBooks() {
        let scroller = document.querySelector(SEL.libraryList);
        while (scroller && scroller.scrollHeight <= scroller.clientHeight) scroller = scroller.parentElement;
        scroller = scroller || document.scrollingElement;
        let previous = -1;
        let stableRounds = 0;
        while (stableRounds < 3) {
            const count = document.querySelectorAll(SEL.book).length;
            show(`Loading your library… ${count} books`);
            if (count === previous) stableRounds++;
            else { stableRounds = 0; previous = count; }
            scroller.scrollTop = scroller.scrollHeight;
            await sleep(600);
        }
        return [...document.querySelectorAll(SEL.book)].map(el => ({
            asin: el.id,
            title: el.querySelector(SEL.bookTitle)?.textContent.trim() || '',
            author: el.querySelector(SEL.bookAuthor)?.textContent.trim() || '',
        }));
    }

    async function fetchHighlights(asin) {
        const highlights = [];
        let token = '';
        let limitState = '';
        for (let page = 0; page < 500; page++) {
            const url = `/notebook?asin=${encodeURIComponent(asin)}` +
                (token ? `&token=${encodeURIComponent(token)}` : '') +
                `&contentLimitState=${encodeURIComponent(limitState)}&`;
            const res = await fetch(url, { credentials: 'include' });
            if (!res.ok) throw new Error(`Amazon returned ${res.status}`);
            const doc = new DOMParser().parseFromString(await res.text(), 'text/html');

            for (const locationInput of doc.querySelectorAll(SEL.location)) {
                const row = locationInput.closest(SEL.annotationRow);
                const text = row?.querySelector(SEL.highlightText)?.textContent.trim();
                if (!text) continue; // freestanding note with no highlight
                const header = row.querySelector(SEL.highlightHeader)?.textContent || '';
                highlights.push({
                    text,
                    location: locationInput.value,
                    note: row.querySelector(SEL.note)?.textContent.trim() || null,
                    color: header.split(/highlight/i)[0].trim().toLowerCase() || null,
                });
            }

            token = doc.querySelector(SEL.nextPageToken)?.value || '';
            limitState = doc.querySelector(SEL.contentLimitState)?.value || '';
            if (!token) break;
            await sleep(DELAY_MS);
        }
        return highlights;
    }

    try {
        const books = await loadAllBooks();
        if (books.length === 0) throw new Error('No books found on this page. Is the notebook fully loaded?');

        const failed = [];
        let highlightCount = 0;
        for (let i = 0; i < books.length; i++) {
            show(`Reading book ${i + 1} of ${books.length}…\n${books[i].title}\n${highlightCount} highlights so far`);
            try {
                books[i].highlights = await fetchHighlights(books[i].asin);
                highlightCount += books[i].highlights.length;
            } catch (e) {
                books[i].highlights = [];
                failed.push(`${books[i].title} (${e.message})`);
            }
            await sleep(DELAY_MS);
        }

        show(`Sending ${highlightCount} highlights from ${books.length} books to BooksHQ…`);
        const payload = { books };
        if (MODE === 'preview') download(`kindle-notebook-${new Date().toISOString().slice(0, 10)}.json`, payload);

        let res;
        try {
            res = await fetch(`${BOOKSHQ_URL}/api/import/kindle-notebook${MODE === 'preview' ? '?dryRun=1' : ''}`, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' }, // avoids a CORS preflight
                body: JSON.stringify(payload),
            });
        } catch {
            throw new Error(`Couldn't reach BooksHQ at ${BOOKSHQ_URL}. Is it running (npm run dev)?`);
        }
        const result = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(result.error || `BooksHQ returned ${res.status}`);

        const failedNote = failed.length ? `\n\n${failed.length} book(s) couldn't be read:\n${failed.slice(0, 5).join('\n')}` : '';
        if (MODE === 'preview') {
            download('bookshq-preview.json', result);
            show(`Preview only, nothing saved.\n${result.newBooks.length} new books, ${result.newAuthors.length} new authors\n` +
                `${result.highlightsNewOrChanged} new/changed highlights, ${result.highlightsAlreadyInLibrary} already in library${failedNote}`, true);
        } else {
            show(`Done!\n${result.createdCount} new highlights\n${result.updatedCount} updated\n${result.skippedCount} already in BooksHQ${failedNote}`, true);
        }
    } catch (e) {
        show(`Sync failed: ${e.message}`, true);
    }
})();
