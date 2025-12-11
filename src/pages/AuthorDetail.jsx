import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../utils/api';
import BookCard from '../components/BookCard';
import { ArrowLeft, Book, Trophy } from 'lucide-react';

export default function AuthorDetail() {
    const { id } = useParams();
    const [author, setAuthor] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAuthor();
    }, [id]);

    const loadAuthor = async () => {
        try {
            const data = await api.getAuthor(id);
            setAuthor(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const [updating, setUpdating] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editForm, setEditForm] = useState({ gender: '', race: '', nationality: '' });

    if (loading) return <div>Loading...</div>;
    if (!author) return <div>Author not found</div>;

    const totalHighlights = author.highlights?.length || 0;
    const totalXP = totalHighlights * 10;
    // Level = sqrt(XP / 100)
    const level = Math.floor(Math.sqrt(totalXP / 100));

    const handleAutoFetch = async () => {
        setUpdating(true);
        try {
            const result = await api.fetchAuthorDemographics(id);
            if (result.success) {
                // Refresh author data
                loadAuthor();
            } else {
                alert('No data found');
            }
        } catch (e) {
            console.error(e);
            alert('Failed to fetch data');
        } finally {
            setUpdating(false);
        }
    };

    const handleEditSave = async () => {
        try {
            await api.updateAuthorDemographics(id, editForm);
            setEditing(false);
            loadAuthor();
        } catch (e) {
            console.error(e);
            alert('Failed to save');
        }
    };

    return (
        <div className="space-y-8">
            <Link to="/authors" className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                <ArrowLeft size={16} />
                Back to Authors
            </Link>

            <div className="glass-panel p-8 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-32 bg-[var(--accent-primary)]/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />

                <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg">
                        {author.name.substring(0, 2)}
                    </div>
                    <div className="text-center md:text-left flex-1">
                        <h1 className="text-3xl font-bold mb-2">{author.name}</h1>
                        <div className="flex flex-wrap items-center gap-4 justify-center md:justify-start text-sm text-[var(--text-secondary)] mb-4">
                            <span className="flex items-center gap-2 bg-[var(--bg-secondary)] px-3 py-1 rounded-full border border-[var(--glass-border)]">
                                <Book size={14} />
                                {author.books?.length} Books
                            </span>
                            <span className="flex items-center gap-2 bg-[var(--bg-secondary)] px-3 py-1 rounded-full border border-[var(--glass-border)] text-[var(--accent-gold)] font-bold">
                                <Trophy size={14} />
                                Lvl {level || 1}
                            </span>
                        </div>

                        {/* Demographics Badges */}
                        <div className="flex flex-wrap items-center gap-2 justify-center md:justify-start">
                            {author.nationality && Array.isArray(author.nationality) && author.nationality.map((nat, i) => (
                                <span key={i} className="text-xs px-2 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                    📍 {nat}
                                </span>
                            ))}
                            {author.gender && (
                                <span className="text-xs px-2 py-1 rounded bg-pink-500/10 text-pink-400 border border-pink-500/20">
                                    👤 {author.gender}
                                </span>
                            )}
                            {author.race && Array.isArray(author.race) && author.race.map((race, i) => (
                                <span key={i} className="text-xs px-2 py-1 rounded bg-green-500/10 text-green-400 border border-green-500/20">
                                    🌍 {race}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <button
                            onClick={handleAutoFetch}
                            disabled={updating}
                            className="px-4 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            {updating ? 'Fetching...' : '✨ Auto-Fetch Data'}
                        </button>
                        <button
                            onClick={() => {
                                setEditForm({
                                    gender: author.gender || '',
                                    race: Array.isArray(author.race) ? author.race.join(', ') : (author.race || ''),
                                    nationality: Array.isArray(author.nationality) ? author.nationality.join(', ') : (author.nationality || '')
                                });
                                setEditing(true);
                            }}
                            className="px-4 py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-lg text-sm font-medium transition-colors border border-[var(--glass-border)]"
                        >
                            ✏️ Edit Details
                        </button>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {editing && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-panel p-6 rounded-xl w-full max-w-md space-y-4">
                        <h3 className="text-xl font-bold">Edit Demographics</h3>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs text-[var(--text-secondary)] mb-1">Nationality (comma separated)</label>
                                <input
                                    type="text"
                                    className="w-full bg-[var(--bg-secondary)] border border-[var(--glass-border)] rounded-lg p-2 text-sm outline-none focus:border-[var(--accent-primary)]"
                                    value={editForm.nationality}
                                    onChange={e => setEditForm({ ...editForm, nationality: e.target.value })}
                                    placeholder="e.g. American, British"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-[var(--text-secondary)] mb-1">Gender</label>
                                <input
                                    type="text"
                                    className="w-full bg-[var(--bg-secondary)] border border-[var(--glass-border)] rounded-lg p-2 text-sm outline-none focus:border-[var(--accent-primary)]"
                                    value={editForm.gender}
                                    onChange={e => setEditForm({ ...editForm, gender: e.target.value })}
                                    placeholder="e.g. Female"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-[var(--text-secondary)] mb-1">Race/Ethnicity (comma separated)</label>
                                <input
                                    type="text"
                                    className="w-full bg-[var(--bg-secondary)] border border-[var(--glass-border)] rounded-lg p-2 text-sm outline-none focus:border-[var(--accent-primary)]"
                                    value={editForm.race}
                                    onChange={e => setEditForm({ ...editForm, race: e.target.value })}
                                    placeholder="e.g. African American, Black"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={() => setEditing(false)}
                                className="flex-1 px-4 py-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    try {
                                        // Split commas into arrays
                                        const payload = {
                                            gender: editForm.gender,
                                            race: editForm.race.split(',').map(s => s.trim()).filter(Boolean),
                                            nationality: editForm.nationality.split(',').map(s => s.trim()).filter(Boolean)
                                        };
                                        await api.updateAuthorDemographics(id, payload);
                                        setEditing(false);
                                        loadAuthor();
                                    } catch (e) {
                                        console.error(e);
                                        alert('Failed to save');
                                    }
                                }}
                                className="flex-1 px-4 py-2 bg-[var(--accent-primary)] text-white rounded-lg hover:bg-[var(--accent-secondary)] transition-colors"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div>
                <h2 className="text-xl font-bold mb-6">Bibliography</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {author.books?.map(book => (
                        <BookCard key={book.id} book={{ ...book, author: author }} />
                    ))}
                </div>
            </div>
        </div>
    );
}
