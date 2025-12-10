import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';

import BookDetail from './pages/BookDetail';
import AuthorDetail from './pages/AuthorDetail';
import Books from './pages/Books';
import Authors from './pages/Authors';
import Home from './pages/Home';
import Highlights from './pages/Highlights';
import Stats from './pages/Stats';
import Settings from './pages/Settings';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="books" element={<Books />} />
        <Route path="books/:id" element={<BookDetail />} />
        <Route path="authors" element={<Authors />} />
        <Route path="authors/:id" element={<AuthorDetail />} />
        <Route path="highlights" element={<Highlights />} />
        <Route path="stats" element={<Stats />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default App;
