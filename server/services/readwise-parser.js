import fs from 'fs';
import { parse } from 'csv-parse/sync';

/**
 * Parse Readwise CSV export file
 * Expected columns: Highlight, Book Title, Book Author, Amazon Book ID, Note, Color, Tags, Location Type, Location, Highlighted at, Document tags
 */
export function parseReadwiseCSV(fileContent) {
    try {
        const records = parse(fileContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            bom: true, // Handle UTF-8 BOM if present
            relax_quotes: true, // Handle quotes within fields
            relax_column_count: true, // Handle varying column counts
            relax_column_count_more: true, // Even more lenient
            skip_records_with_error: true, // Skip malformed rows instead of failing
            quote: '"',
            escape: '"', // Standard CSV escape (double quotes)
            on_record: (record) => {
                // Clean up any malformed fields
                return record;
            }
        });

        console.log(`Parsed ${records.length} records from Readwise CSV`);

        const clippings = [];
        let skipped = 0;

        for (const record of records) {
            // Only process if we have the essential fields
            if (!record['Highlight'] || !record['Book Title'] || !record['Book Author']) {
                skipped++;
                if (skipped < 10) { // Only log first 10
                    console.log('Skipping record missing essential fields:', {
                        hasHighlight: !!record['Highlight'],
                        hasTitle: !!record['Book Title'],
                        hasAuthor: !!record['Book Author']
                    });
                }
                continue;
            }

            const clipping = {
                title: record['Book Title'].trim(),
                author: record['Book Author'].trim(),
                text: record['Highlight'].trim(),
                location: record['Location'] || '',
                date: record['Highlighted at'] ? new Date(record['Highlighted at']) : new Date(),
                note: record['Note'] || '',
                tags: record['Tags'] ? record['Tags'].split(',').map(t => t.trim()) : [],
                color: record['Color'] || '',
                asin: record['Amazon Book ID'] || '',
                type: 'highlight'
            };

            clippings.push(clipping);
        }

        console.log(`Extracted ${clippings.length} valid clippings from Readwise CSV (skipped ${skipped} incomplete records)`);
        return clippings;
    } catch (error) {
        console.error('Failed to parse Readwise CSV:', error);
        throw new Error(`Failed to parse Readwise CSV: ${error.message}`);
    }
}
