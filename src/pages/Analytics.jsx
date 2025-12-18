
import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../utils/api';
import { useLocation } from 'react-router-dom';
import { groupBySimple, aggregateArrayField, aggregateAuthorDemographic } from '../utils/analytics';
import SimpleBarChart from '../components/charts/SimpleBarChart';
import DemographicPieChart from '../components/charts/DemographicPieChart';
import { RefreshCw, Filter, Calendar } from 'lucide-react';

export default function Analytics() {
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);

    // Filters State
    const [yearFilter, setYearFilter] = useState('All');
    const [selectedGenre, setSelectedGenre] = useState('All');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Using the new specialized endpoint
            const res = await fetch('/api/analytics/books');
            const data = await res.json();
            setBooks(data.books || []);
            setStats(data.meta);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // --- Data Processing ---
    const filteredBooks = useMemo(() => {
        return books.filter(book => {
            // Filter: Year Read (using dateLastRead)
            if (yearFilter !== 'All') {
                if (!book.dateLastRead) return false;
                const y = new Date(book.dateLastRead).getFullYear().toString();
                if (y !== yearFilter) return false;
            }

            // Filter: Genre
            if (selectedGenre !== 'All') {
                if (!book.genre || !book.genre.includes(selectedGenre)) return false;
            }

            // Only count "Read" books for analytics generally
            // Logic: Count > 0 OR Status=read OR Date exists
            const isRead = (book.readCount > 0) || (book.readStatus === 'read') || !!book.dateLastRead;
            return isRead;
        });
    }, [books, yearFilter, selectedGenre]);

    // --- Chart Data Preparation ---
    const genreData = useMemo(() => {
        return aggregateArrayField(filteredBooks, 'genre').slice(0, 10); // Top 10
    }, [filteredBooks]);

    const genderData = useMemo(() => {
        return aggregateAuthorDemographic(filteredBooks, 'gender');
    }, [filteredBooks]);

    const raceData = useMemo(() => {
        return aggregateAuthorDemographic(filteredBooks, 'race');
    }, [filteredBooks]);

    const vocationData = useMemo(() => {
        return aggregateAuthorDemographic(filteredBooks, 'vocation').slice(0, 8);
    }, [filteredBooks]);

    // Available Years for Filter
    const availableYears = useMemo(() => {
        const years = new Set(books
            .filter(b => b.dateLastRead)
            .map(b => new Date(b.dateLastRead).getFullYear())
        );
        return Array.from(years).sort((a, b) => b - a);
    }, [books]);

    const availableGenres = useMemo(() => {
        const genres = new Set();
        books.forEach(b => {
            if (Array.isArray(b.genre)) b.genre.forEach(g => genres.add(g));
        });
        return Array.from(genres).sort();
    }, [books]);


    if (loading) return (
        <div className="flex items-center justify-center h-screen text-[var(--text-muted)]">
            <RefreshCw className="animate-spin mr-2" /> Loading Analytics...
        </div>
    );

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-bold font-display">Reading Analytics</h1>
                    <p className="text-[var(--text-secondary)] mt-1">
                        Analyzing <span className="text-[var(--accent-primary)] font-bold">{filteredBooks.length}</span> read books
                        {yearFilter !== 'All' && ` in ${yearFilter}`}
                    </p>
                </div>

                {/* Filters Toolbar */}
                <div className="flex flex-wrap gap-2 items-center bg-[var(--bg-secondary)] p-2 rounded-xl border border-[var(--glass-border)]">
                    <div className="flex items-center gap-2 px-3 border-r border-[var(--glass-border)]">
                        <Filter size={14} className="text-[var(--text-muted)]" />
                        <span className="text-xs font-bold uppercase text-[var(--text-muted)]">Filters</span>
                    </div>

                    {/* Year Filter */}
                    <select
                        value={yearFilter}
                        onChange={(e) => setYearFilter(e.target.value)}
                        className="bg-transparent text-sm px-3 py-1 outline-none cursor-pointer hover:text-[var(--accent-primary)] transition-colors"
                    >
                        <option value="All">All Time</option>
                        {availableYears.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>

                    <span className="text-[var(--glass-border)]">|</span>

                    {/* Genre Filter */}
                    <select
                        value={selectedGenre}
                        onChange={(e) => setSelectedGenre(e.target.value)}
                        className="bg-transparent text-sm px-3 py-1 outline-none cursor-pointer hover:text-[var(--accent-primary)] transition-colors max-w-[150px]"
                    >
                        <option value="All">All Genres</option>
                        {availableGenres.map(g => (
                            <option key={g} value={g}>{g}</option>
                        ))}
                    </select>

                    {/* Reset Button */}
                    {(yearFilter !== 'All' || selectedGenre !== 'All') && (
                        <button
                            onClick={() => { setYearFilter('All'); setSelectedGenre('All'); }}
                            className="ml-2 px-2 py-1 text-xs bg-[var(--bg-tertiary)] rounded hover:bg-[var(--accent-primary)] hover:text-white transition-colors"
                        >
                            Reset
                        </button>
                    )}
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* 1. Top Genres (Bar) */}
                <div className="glass-panel p-6 rounded-2xl md:col-span-2 lg:col-span-1 h-[350px]">
                    <SimpleBarChart title="Top Genres" data={genreData} onBarClick={(entry) => setSelectedGenre(entry.name)} />
                </div>

                {/* 2. Gender Distribution (Pie) */}
                <div className="glass-panel p-6 rounded-2xl h-[350px]">
                    <DemographicPieChart title="Author Gender" data={genderData} />
                </div>

                {/* 3. Race/Identity (Pie) */}
                <div className="glass-panel p-6 rounded-2xl h-[350px]">
                    <DemographicPieChart title="Author Identity" data={raceData} />
                </div>

                {/* 4. Vocations (Bar) */}
                <div className="glass-panel p-6 rounded-2xl md:col-span-2 h-[350px]">
                    <SimpleBarChart title="Author Vocations" data={vocationData} />
                </div>

                {/* 5. Placeholder for Timeline (Coming Soon) */}
                <div className="glass-panel p-6 rounded-2xl flex items-center justify-center border-dashed border-2 border-[var(--glass-border)] h-[350px] opacity-60">
                    <div className="text-center">
                        <Calendar size={32} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Reading Timeline (Coming Soon)</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
