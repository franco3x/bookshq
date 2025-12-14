
# 🎓 12-Week Coding Curriculum: "Deconstructing BookshQ"

**Welcome to your PhD-level crash course in Software Engineering.**

This curriculum is designed to take you from **absolute zero** to a **full-stack software engineer** by reverse-engineering the very application you are looking at: **BookshQ**.

Instead of boring "Hello World" tutorials, we will analyze, break, and rebuild parts of a real, production-grade application that manages books, tracks reading stats, and gamifies learning.

---

## 📅 Curriculum Overview

| Phase | Weeks | Focus | Goal |
| :--- | :--- | :--- | :--- |
| **I. The Foundation** | 1-2 | HTML, CSS, & Vanilla JS | Understand how the web works naked. |
| **II. The Modern Web** | 3-4 | Modern Javascript & TypeScript | Master the language of the web. |
| **III. The Frontend** | 5-6 | React & Components | Build interactive UIs like `BookDetail`. |
| **IV. The Backend** | 7-8 | Node, Express, & Databases | Understand servers and saving data. |
| **V. The Professional**| 9-10 | Advanced Patterns & State | Handle complexity like a pro. |
| **VI. The Architect** | 11-12| Capstone Feature | Build a new feature from scratch. |

---

## Phase I: The Foundation

### Week 1: The Skeleton & The Skin (HTML & CSS)
**Objective**: Understand how content is structured and styled before frameworks hide the magic.

#### Lesson 1.1: HTML Structure
**Start Here**: [`index.html`](file:///Users/frankcoleman/Desktop/bookshq/index.html)
**Concepts to Learn**:
- DOM Structure (`<html>`, `<head>`, `<body>`)
- meta tags and viewports
- Linking resources (CSS, Scripts)

**Exercise**:
1. Creates a file `learning/week1_layout.html`.
2. Copy the structure of `index.html` but remove all the scripts and links.
3. Add a simple `<h1>Hello World</h1>` inside the body.
4. **Challenge**: Add a `<div>` with an IDs matching `root` (like line 12 in `index.html`) and inspect it in the browser dev tools.

**Project Connection**: `index.html` is the **single entry point** for this entire massive application. Even huge apps start with one simple HTML file.

#### Lesson 1.2: Styling with CSS (and Tailwind)
**Start Here**: [`src/index.css`](file:///Users/frankcoleman/Desktop/bookshq/src/index.css)
**Concepts to Learn**:
- CSS Variables (`:root`, `--colors`)
- Tailwind Directives (`@tailwind`)
- Typography and `@layer base`

**Exercise**:
1. In `learning/week1_layout.html`, add a `<style>` tag.
2. create a CSS variable `--bg-primary: #000000;`.
3. Apply it to the body background.
4. **Challenge**: Look at `src/index.css` lines 6-15. Copy the font-family definition to your file and see how the text changes.

**Project Connection**: BookshQ uses **Tailwind CSS**, which generates styles for us, but it all compiles down to raw CSS rules like the ones in `src/index.css`.

---

### Week 2: The Nervous System (JavaScript Fundamentals)
**Objective**: Learn how to make pages "do things" using basic JavaScript logic.

#### Lesson 2.1: Variables & Data Types
**Start Here**: [`server/services/achievements.js`](file:///Users/frankcoleman/Desktop/bookshq/server/services/achievements.js) (lines 10-25)
**Concepts to Learn**:
- `const` vs `let`
- Arrays (`[]`)
- Objects (`{}`)
- Strings and Numbers

**Exercise**:
1. Create `learning/week2_basics.js`.
2. Define an array called `myTiers` similar to `DYNAMIC_TIERS` (line 11).
3. Write a `console.log` that prints the name of the second tier.
4. **Challenge**: Create a loop that prints every tier's name.

**Project Connection**: Achievements are just **Arrays of Objects**. If you understand arrays, you understand how we list trophies on the screen.

#### Lesson 2.2: Functions & Logic
**Start Here**: [`server/services/stats.js`](file:///Users/frankcoleman/Desktop/bookshq/server/services/stats.js) (lines 63-69 `toTitleCase`)
**Concepts to Learn**:
- Function declaration
- Parameters and Return values
- String manipulation methods (`split`, `map`, `join`)

**Exercise**:
1. Copy the `toTitleCase` function to your practice file.
2. Call it with "harry potter" and log the result.
3. **Challenge**: Modify it to also handle hyphens (e.g., "spider-man" -> "Spider-Man").

**Project Connection**: This exact function cleans up messy author names in our database. Small functions solve big dirty data problems.

---

## Phase II: The Modern Web

### Week 3: Modern JavaScript (ES6+)
**Objective**: Learn the "shorthand" syntax used in modern React apps.

#### Lesson 3.1: Arrow Functions & Destructuring
**Start Here**: [`src/utils/api.js`](file:///Users/frankcoleman/Desktop/bookshq/src/utils/api.js) (lines 14-20)
**Concepts to Learn**:
- Arrow Syntax `() => {}`
- Object Destructuring `const { data } = response`
- Template Literals `` `${var}` ``

**Exercise**:
1. Rewrite a standard `function add(a, b) { return a + b }` as an arrow function.
2. Create an object `book = { title: "Dune", author: "Herbert" }`.
3. Use destructuring to extract `title` into a variable.

**Project Connection**: `api.js` is full of arrow functions that talk to our backend. This syntax makes code concise and readable.

#### Lesson 3.2: Async/Await & Promises
**Start Here**: [`src/pages/BookDetail.jsx`](file:///Users/frankcoleman/Desktop/bookshq/src/pages/BookDetail.jsx) (lines 32-41 `loadBook`)
**Concepts to Learn**:
- Asynchronous code (waiting for things)
- `async` / `await` keywords
- Try/Catch error handling

**Exercise**:
1. Write a function `fakeFetch()` that returns a Promise resolving after 2 seconds.
2. Write an `async` function that awaits it and logs "Done!".
3. Wrap it in a `try/catch` block.

**Project Connection**: We can't pause the entire browser while downloading book data. `async/await` lets the UI stay responsive while the data loads.

### Week 4: TypeScript (Safety First)
**Objective**: Learn why adding Types prevents bugs.

#### Lesson 4.1: Types & Interfaces
**Start Here**: [`server/database/schema.ts`](file:///Users/frankcoleman/Desktop/bookshq/server/database/schema.ts)
**Concepts to Learn**:
- Strong typing (String, Integer, Boolean)
- Schema definition
- Nullability

**Exercise**:
1. Create `learning/week4_types.ts`.
2. Define a TypeScript `interface` for an `Author` with `name` (string) and `age` (number).
3. Try to create an author with a string for `age` and see the error.

**Project Connection**: Our database schema defines exactly what a "Book" looks like. This prevents us from accidentally saving a book without a title.

---

## Phase III: The Frontend (React)

### Week 5: Components & Props
**Objective**: Think in building blocks.

#### Lesson 5.1: The Component Model
**Start Here**: [`src/components/BookCard.jsx`](file:///Users/frankcoleman/Desktop/bookshq/src/components/BookCard.jsx)
**Concepts to Learn**:
- Functional Components
- Props (passing data down)
- JSX (HTML-in-JS)

**Exercise**:
1. Create a `SimpleCard` component that accepts a `title` prop.
2. Render it inside a parent component.
3. **Challenge**: Add a `isRead` boolean prop that changes the background color.

**Project Connection**: The `BookCard` is used everywhere. It's a reusable stamp we use to display 1000 different books with the same design.

### Week 6: State & Hooks
**Objective**: Make the UI "remember" things.

#### Lesson 6.1: useState & useEffect
**Start Here**: [`src/pages/BookDetail.jsx`](file:///Users/frankcoleman/Desktop/bookshq/src/pages/BookDetail.jsx) (lines 9-14)
**Concepts to Learn**:
- `useState`: Storing data (loading, book details)
- `useEffect`: Running code on mount (fetching data)

**Exercise**:
1. Create a counter component.
2. Use `useState` to track the count.
3. Use `useEffect` to change the document title whenever the count changes.

**Project Connection**: `BookDetail` needs to remember "Are we creating an author right now?" (`creatingAuthor` state). React state makes the UI interactive.

---

## Phase IV: The Backend

### Week 7: Node & Express Servers
**Objective**: Build the engine that powers the app.

#### Lesson 7.1: REST API Endpoints
**Start Here**: [`server/server.js`](file:///Users/frankcoleman/Desktop/bookshq/server/server.js) (lines 90-119 `GET /api/books/:id`)
**Concepts to Learn**:
- HTTP Methods (GET, POST, PATCH)
- Routes and Parameters (`:id`)
- Request and Response objects (`req`, `res`)

**Exercise**:
1. Create a simple `server.js`.
2. Set up Express.
3. Create a route `GET /hello` that responds with JSON `{ message: "World" }`.

**Project Connection**: When the frontend asks for "Book #42", this endpoint wakes up, finds the book, and sends it back.

### Week 8: Databases & ORMs
**Objective**: Save data permanently.

#### Lesson 8.1: Querying Data
**Start Here**: [`server/server.js`](file:///Users/frankcoleman/Desktop/bookshq/server/server.js) (line 92 `db.query.books.findFirst`)
**Concepts to Learn**:
- SQL basics (SELECT, WHERE)
- Drizzle ORM syntax
- Relationships (Books have Authors)

**Exercise**:
1. Write a pseudo-query to "Find all books where Read Count > 0".
2. **Challenge**: Look at `server/services/achievements.js` line 37 to see how we actually do that in code.

**Project Connection**: Drizzle lets us write JavaScript code that translates into powerful SQL queries to fetch our data.

---

## Phase V: The Professional

### Week 9: Advanced React Patterns
**Objective**: Handle chaos gracefully.

#### Lesson 9.1: Optimization & Architecture
**Start Here**: [`src/pages/Stats.jsx`](file:///Users/frankcoleman/Desktop/bookshq/src/pages/Stats.jsx)
**Concepts to Learn**:
- Lazy Loading Components (`React.lazy`)
- Error Boundaries (handling crashes)
- Complex computations (memos)

**Project Connection**: The Stats page does heavy math. We use advanced patterns to make sure it doesn't freeze the browser.

### Week 10: Real-world Data flow
**Objective**: Managing complex forms and race conditions.

#### Lesson 10.1: Dynamic Forms
**Start Here**: [`src/pages/BookDetail.jsx`](file:///Users/frankcoleman/Desktop/bookshq/src/pages/BookDetail.jsx) (The Author Input Logic)
**Concepts to Learn**:
- Controlled Inputs (`value={state}`)
- Debouncing/Throttling
- Optimistic UI updates

**Project Connection**: We just fixed a race condition here! You'll learn why handling user input is the hardest part of frontend dev.

---

## Phase VI: The Architect (Capstone)

### Week 11 & 12: Build Your Own Feature
**Objective**: Prove you can do it all.

Pick one of the following features and build it end-to-end (Database -> API -> UI).

#### Capstone Idea 1: "Reading Goals"
- **Database**: Add `goals` table (target books per year).
- **API**: Create endpoints to set and fetch goals.
- **UI**: Add a progress bar on the Home page.
- **Skills**: CRUD operations, Math logic, UI Components.

#### Capstone Idea 2: "Book Reviews"
- **Database**: Add `reviews` table linked to books.
- **API**: POST /reviews.
- **UI**: Add a star rating and text area to `BookDetail`.
- **Skills**: Forms, Relations, User Input.

#### Capstone Idea 3: "Dark/Light Mode Toggle"
- **Store**: Use `localStorage`.
- **UI**: Create a toggle switch in `Layout.jsx`.
- **CSS**: Use Tailwind's `dark:` modifier.
- **Skills**: State Management, CSS Architecture.

---

## 📚 Study Resources

### How to use this project to learn:
1. **Break it**: Delete a line of code in `server.js`. Run the app. explicit see what error appears. This teaches you how to debug.
2. **Trace it**: Follow a click. When you click "Save" in `BookDetail`, follow the code to `api.js`, then to `server.js`, then to the Database.
3. **Log it**: Add `console.log('I am here')` everywhere. Watch the terminal to see the order events happen.

### Debugging 101
- **Frontend**: Right Click -> Inspect -> Console. Red text = Bad.
- **Backend**: Check the terminal where `npm run server` is running.
- **Network**: Inspect -> Network Tab. Click a request to see what data was actually sent.

**"The only way to learn to code is to write code."** - Start with Week 1, and don't stop until you've built a Capstone.
