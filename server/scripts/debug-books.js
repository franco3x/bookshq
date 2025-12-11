import { db } from '../database/db.ts';
import { books } from '../database/schema.ts';
import { desc } from 'drizzle-orm';

async function checkBookData() {
    console.log('Checking books with female authors...\n');

    const result = await db.query.books.findMany({
        with: {
            author: true,
            bookAuthors: {
                with: {
                    author: true
                }
            }
        },
        orderBy: desc(books.dateLastRead),
        limit: 10
    });

    const formatted = result.map(book => ({
        ...book,
        authors: book.bookAuthors.map(ba => ba.author),
        author: book.author || (book.bookAuthors[0] ? book.bookAuthors[0].author : null),
    }));

    const femaleBooks = formatted.filter(b => b.author?.gender === 'female');

    console.log('Total books sampled:', formatted.length);
    console.log('Books with female authors:', femaleBooks.length);

    if (femaleBooks.length > 0) {
        console.log('\nSample female author books:');
        femaleBooks.slice(0, 3).forEach(b => {
            console.log(`- "${b.title}" by ${b.author.name} (gender: ${b.author.gender})`);
        });
    } else {
        console.log('\n❌ No books with female authors found in sample!');
        console.log('\nSample author data from first 3 books:');
        formatted.slice(0, 3).forEach(b => {
            console.log(`- "${b.title}" by ${b.author?.name || 'Unknown'} (gender: ${b.author?.gender || 'null'})`);
        });
    }

    process.exit(0);
}

checkBookData();
