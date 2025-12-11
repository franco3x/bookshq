import { pgTable, serial, text, integer, timestamp, boolean, jsonb, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Books Table
export const books = pgTable('books', {
    id: serial('id').primaryKey(),
    title: text('title').notNull(),
    authorId: integer('author_id').references(() => authors.id),
    coverImage: text('cover_image'), // URL or base64
    genre: text('genre'), // Simple string for V1
    tags: jsonb('tags').default([]), // Array of tag strings for custom categorization
    asin: text('asin'),
    readCount: integer('read_count').default(0),
    dateLastRead: timestamp('date_last_read'),
    dateFirstRead: timestamp('date_first_read'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Authors Table
export const authors = pgTable('authors', {
    id: serial('id').primaryKey(),
    name: text('name').notNull().unique(),
    birthYear: integer('birth_year'),
    deathYear: integer('death_year'),
    gender: text('gender'),
    race: text('race'),
    nationality: text('nationality'),
    bio: text('bio'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Highlights Table
export const highlights = pgTable('highlights', {
    id: serial('id').primaryKey(),
    text: text('text').notNull(),
    bookId: integer('book_id').references(() => books.id).notNull(),
    authorId: integer('author_id').references(() => authors.id), // Denormalized for query speed
    location: text('location'),
    isFavorite: boolean('is_favorite').default(false),
    tags: jsonb('tags').default([]), // Array of strings
    createdAt: timestamp('created_at').defaultNow().notNull(),
    originalDate: timestamp('original_date'), // Date from Kindle clipping
});

// User Settings
export const userSettings = pgTable('user_settings', {
    id: serial('id').primaryKey(),
    theme: text('theme').default('dark'),
    obsidianExportPath: text('obsidian_export_path'),
    exportTemplate: text('export_template'),
    updatedAt: timestamp('updated_at').defaultNow(),
});

// User Stats / Gamification
export const userStats = pgTable('user_stats', {
    id: serial('id').primaryKey(),
    totalXp: integer('total_xp').default(0).notNull(),
    readerLevel: integer('reader_level').default(1).notNull(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

// Author Levels (Individual author progression)
export const authorLevels = pgTable('author_levels', {
    id: serial('id').primaryKey(),
    authorId: integer('author_id').references(() => authors.id).notNull(),
    xp: integer('xp').default(0).notNull(),
    level: integer('level').default(1).notNull(),
    updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => ({
    uniqueAuthor: uniqueIndex('unique_author_level_idx').on(t.authorId),
}));

// Category Levels (Multi-dimensional levels)
export const categoryLevels = pgTable('category_levels', {
    id: serial('id').primaryKey(),
    categoryType: text('category_type').notNull(), // 'genre', 'gender', 'race', 'nationality'
    categoryValue: text('category_value').notNull(), // e.g., 'History', 'Female', 'Black'
    xp: integer('xp').default(0).notNull(),
    level: integer('level').default(1).notNull(),
    updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => ({
    uniqueCategory: uniqueIndex('unique_category_idx').on(t.categoryType, t.categoryValue),
}));

// Achievements
export const achievements = pgTable('achievements', {
    id: serial('id').primaryKey(),
    achievementType: text('achievement_type').notNull().unique(), // e.g., 'first_100', 'read_5_history'
    earnedAt: timestamp('earned_at').defaultNow().notNull(),
});

// Relations
export const booksRelations = relations(books, ({ one, many }) => ({
    author: one(authors, {
        fields: [books.authorId],
        references: [authors.id],
    }),
    highlights: many(highlights),
}));

export const authorsRelations = relations(authors, ({ many }) => ({
    books: many(books),
    highlights: many(highlights),
}));

export const highlightsRelations = relations(highlights, ({ one }) => ({
    book: one(books, {
        fields: [highlights.bookId],
        references: [books.id],
    }),
    author: one(authors, {
        fields: [highlights.authorId],
        references: [authors.id],
    }),
}));
