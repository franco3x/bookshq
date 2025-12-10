// Image generation disabled for V1 to resolve installation issues with node-canvas.
// Feature deferred to future update.

export async function generateHighlightImage(text, title, author, coverUrl) {
    console.warn('Image generation is currently disabled.');
    // Return empty buffer or placeholder
    return Buffer.from('');
}
