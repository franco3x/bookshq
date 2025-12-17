
import { db } from '../database/db.js';
import { achievements } from '../database/schema.js';
import { eq } from 'drizzle-orm';

const achievementList = [
    // 📚 Reader (Books Read)
    { code: 'READER_1', title: 'Page Turner', description: 'Read your first book', icon: 'BookOpen', xpReward: 250, category: 'Reader', conditionType: 'COUNT', conditionValue: 1 },
    { code: 'READER_25', title: 'Bookworm', description: 'Read 25 books', icon: 'BookOpen', xpReward: 1000, category: 'Reader', conditionType: 'COUNT', conditionValue: 25 },
    { code: 'READER_100', title: 'Scholar', description: 'Read 100 books', icon: 'GraduationCap', xpReward: 5000, category: 'Reader', conditionType: 'COUNT', conditionValue: 100 },
    { code: 'READER_500', title: 'Sage', description: 'Read 500 books', icon: 'Scroll', xpReward: 25000, category: 'Reader', conditionType: 'COUNT', conditionValue: 500 },
    { code: 'READER_1000', title: 'Grand Magus', description: 'Read 1,000 books', icon: 'Globe', xpReward: 20000, category: 'Reader', conditionType: 'COUNT', conditionValue: 1000 },

    // 🖍️ Highlighter
    { code: 'HIGHLIGHTER_100', title: 'Notetaker', description: 'Create 100 highlights', icon: 'Highlighter', xpReward: 250, category: 'Highlighter', conditionType: 'COUNT', conditionValue: 100 },
    { code: 'HIGHLIGHTER_1000', title: 'Researcher', description: 'Create 1,000 highlights', icon: 'Search', xpReward: 1000, category: 'Highlighter', conditionType: 'COUNT', conditionValue: 1000 },
    { code: 'HIGHLIGHTER_10000', title: 'Marginalia Master', description: 'Create 10,000 highlights', icon: 'PenTool', xpReward: 5000, category: 'Highlighter', conditionType: 'COUNT', conditionValue: 10000 },
    { code: 'HIGHLIGHTER_25000', title: 'Keeper of Wisdom', description: 'Create 25,000 highlights', icon: 'Archive', xpReward: 25000, category: 'Highlighter', conditionType: 'COUNT', conditionValue: 25000 },
    { code: 'HIGHLIGHTER_50000', title: 'Oracle', description: 'Create 50,000 highlights', icon: 'Lightbulb', xpReward: 20000, category: 'Highlighter', conditionType: 'COUNT', conditionValue: 50000 },

    // 📦 Collector (Imports)
    { code: 'COLLECTOR_10', title: 'The Gatherer', description: 'Import 10 books', icon: 'Library', xpReward: 250, category: 'Collector', conditionType: 'COUNT', conditionValue: 10 },
    { code: 'COLLECTOR_50', title: 'The Librarian', description: 'Import 50 books', icon: 'Library', xpReward: 1000, category: 'Collector', conditionType: 'COUNT', conditionValue: 50 },
    { code: 'COLLECTOR_250', title: 'The Curator', description: 'Import 250 books', icon: 'Landmark', xpReward: 5000, category: 'Collector', conditionType: 'COUNT', conditionValue: 250 },
    { code: 'COLLECTOR_1000', title: 'Grand Archivist', description: 'Import 1,000 books', icon: 'Database', xpReward: 25000, category: 'Collector', conditionType: 'COUNT', conditionValue: 1000 },
    { code: 'COLLECTOR_2500', title: 'Keeper of the Alexandria', description: 'Import 2,500 books', icon: 'Castle', xpReward: 20000, category: 'Collector', conditionType: 'COUNT', conditionValue: 2500 },

    // 🔥 Streaks (Examples for now)
    { code: 'STREAK_7', title: 'Week Warrior', description: 'Read 7 days in a row', icon: 'Flame', xpReward: 1000, category: 'Streak', conditionType: 'STREAK', conditionValue: 7 },
    { code: 'STREAK_30', title: 'Habitual Reader', description: 'Read 30 days in a row', icon: 'Flame', xpReward: 5000, category: 'Streak', conditionType: 'STREAK', conditionValue: 30 },
];

async function seedAchievements() {
    console.log('🌱 Seeding achievements...');

    for (const achievement of achievementList) {
        try {
            await db.insert(achievements)
                .values(achievement)
                .onConflictDoUpdate({
                    target: achievements.code,
                    set: achievement
                });
            console.log(`✅ Upserted: ${achievement.title}`);
        } catch (error) {
            console.error(`❌ Failed to seed ${achievement.code}:`, error);
        }
    }

    console.log('✨ Seeding complete!');
    process.exit(0);
}

seedAchievements().catch(console.error);
