import { pgTable, serial, text, integer, timestamp, boolean, jsonb, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Authors Table (Defined first as it has no dependencies)
export const authors = pgTable('authors', {
    id: serial('id').primaryKey(),
    name: text('name').notNull().unique(),
    birthYear: integer('birth_year'),
    deathYear: integer('death_year'),
    gender: text('gender'),
    race: jsonb('race').default([]), // Changed from text to jsonb array
    nationality: jsonb('nationality').default([]), // Changed from text to jsonb array
    vocation: jsonb('vocation').default([]), // Array of occupations/professions
    bio: text('bio'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Books Table (References authors)
export const books = pgTable('books', {
    id: serial('id').primaryKey(),
    title: text('title').notNull(),
    authorId: integer('author_id').references(() => authors.id),
    coverImage: text('cover_image'), // URL or base64
    genre: jsonb('genre').default([]), // Changed from text to jsonb array
    tags: jsonb('tags').default([]), // Array of tag strings for custom categorization
    asin: text('asin'),
    readCount: integer('read_count').default(0),
    dateLastRead: timestamp('date_last_read'),
    dateFirstRead: timestamp('date_first_read'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Highlights Table (References books and authors)
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

// Book-Authors Junction Table (References books and authors)
export const bookAuthors = pgTable('book_authors', {
    id: serial('id').primaryKey(),
    bookId: integer('book_id').references(() => books.id).notNull(),
    authorId: integer('author_id').references(() => authors.id).notNull(),
}, (t) => ({
    uniqueLink: uniqueIndex('unique_book_author_idx').on(t.bookId, t.authorId),
}));

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

// Achievements Definition
export const achievements = pgTable('achievements', {
    id: serial('id').primaryKey(),
    code: text('code').notNull().unique(), // e.g. 'READ_10'
    title: text('title').notNull(),
    description: text('description').notNull(),
    icon: text('icon'), // Lucide icon name or emoji
    xpReward: integer('xp_reward').default(0).notNull(),
    category: text('category').default('General'), // 'General', 'Streak', 'Genre'
    conditionType: text('condition_type').notNull(), // 'COUNT', 'STREAK', 'LEVEL', 'SPECIFIC'
    conditionValue: integer('condition_value').default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// User Achievements (Unlock Status)
export const userAchievements = pgTable('user_achievements', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').default(1), // Single user app, default to 1
    achievementId: integer('achievement_id').references(() => achievements.id).notNull(),
    unlockedAt: timestamp('unlocked_at'),
    progress: integer('progress').default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
    uniqueUserAchievement: uniqueIndex('unique_user_achievement_idx').on(t.userId, t.achievementId),
}));

// Relations
export const authorsRelations = relations(authors, ({ many }) => ({
    books: many(books), // Legacy
    bookAuthors: many(bookAuthors),
    highlights: many(highlights),
}));

export const booksRelations = relations(books, ({ one, many }) => ({
    author: one(authors, { // Legacy
        fields: [books.authorId],
        references: [authors.id],
    }),
    bookAuthors: many(bookAuthors), // Many-to-many via junction
    highlights: many(highlights),
}));

export const bookAuthorsRelations = relations(bookAuthors, ({ one }) => ({
    book: one(books, {
        fields: [bookAuthors.bookId],
        references: [books.id],
    }),
    author: one(authors, {
        fields: [bookAuthors.authorId],
        references: [authors.id],
    }),
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

export const authorLevelsRelations = relations(authorLevels, ({ one }) => ({
    author: one(authors, {
        fields: [authorLevels.authorId],
        references: [authors.id],
    }),
}));

export const userAchievementsRelations = relations(userAchievements, ({ one }) => ({
    achievement: one(achievements, {
        fields: [userAchievements.achievementId],
        references: [achievements.id],
    }),
}));
