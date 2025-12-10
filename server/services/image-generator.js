import { createCanvas, loadImage, registerFont } from 'canvas';
import path from 'path';

export async function generateHighlightImage(text, title, author, coverUrl) {
    const width = 1200;
    const height = 630;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background - Dark Gradient
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#1e2028');
    grad.addColorStop(1, '#111318');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Decorative Elements (Glassmorphism circle)
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(1000, 100, 300, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Book Cover (if available) - Circular or Rounded Rect
    if (coverUrl) {
        // Placeholder logic for cover drawing - in real app would need to fetch URL
        // Since fetching external URLs might be slow or blocked, we'll skip complex fetching for V1
        // and just draw a placeholder colored box
        ctx.fillStyle = '#334155';
        ctx.fillRect(80, 80, 150, 230);
    } else {
        // Accent line
        ctx.fillStyle = '#22c55e'; // Accent Color
        ctx.fillRect(80, 80, 8, height - 160);
    }

    // Typography Settings
    ctx.fillStyle = '#ffffff';
    ctx.font = '48px serif'; // Use system serif

    // Text Wrapping Logic
    const words = text.split(' ');
    let line = '';
    let y = 140;
    const maxWidth = 900;
    const x = 140;
    const lineHeight = 60;

    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;

        if (testWidth > maxWidth && n > 0) {
            ctx.fillText(line, x, y);
            line = words[n] + ' ';
            y += lineHeight;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line, x, y);

    // Metadata (Title + Author)
    y += 100; // Spacing
    ctx.fillStyle = '#9ca3af'; // Text secondary
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText(title, x, y);

    y += 40;
    ctx.font = '28px sans-serif';
    ctx.fillText(author, x, y);

    // Branding
    ctx.fillStyle = '#22c55e';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('KindleWise', width - 60, height - 60);

    return canvas.toBuffer('image/png');
}
