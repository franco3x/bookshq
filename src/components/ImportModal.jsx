import React, { useState } from 'react';
import { Upload, X, Check, FileText, AlertCircle } from 'lucide-react';
import { api } from '../utils/api';
import { motion, AnimatePresence } from 'framer-motion';

export default function ImportModal({ isOpen, onClose, onSuccess }) {
    const [file, setFile] = useState(null);
    const [status, setStatus] = useState('idle'); // idle, uploading, success, error
    const [result, setResult] = useState(null);

    if (!isOpen) return null;

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setStatus('idle');
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setStatus('uploading');
        try {
            const data = await api.importClippings(file);
            setResult(data);
            setStatus('success');
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error(error);
            setStatus('error');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md bg-[var(--bg-secondary)] border border-[var(--glass-border)] rounded-2xl shadow-2xl overflow-hidden"
            >
                <div className="flex items-center justify-between p-6 border-b border-[var(--glass-border)]">
                    <h2 className="text-xl font-bold">Import Highlights</h2>
                    <button onClick={onClose} className="p-2 hover:bg-[var(--bg-tertiary)] rounded-full transition-colors">
                        <X size={20} className="text-[var(--text-secondary)]" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {status === 'success' ? (
                        <div className="text-center py-6">
                            <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Check size={32} />
                            </div>
                            <h3 className="text-lg font-bold mb-2">Import Successful!</h3>
                            <p className="text-[var(--text-secondary)]">{result.message}</p>
                            <button
                                onClick={onClose}
                                className="mt-6 w-full py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--glass-highlight)] rounded-lg font-medium transition-colors"
                            >
                                Done
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="border-2 border-dashed border-[var(--glass-border)] rounded-xl p-8 text-center hover:border-[var(--accent-primary)] transition-colors cursor-pointer relative group">
                                <input
                                    type="file"
                                    accept=".txt"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <div className="flex flex-col items-center gap-3 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                                    {file ? (
                                        <>
                                            <FileText size={40} className="text-[var(--accent-primary)]" />
                                            <span className="font-medium text-[var(--text-primary)]">{file.name}</span>
                                            <span className="text-xs">{(file.size / 1024).toFixed(1)} KB</span>
                                        </>
                                    ) : (
                                        <>
                                            <Upload size={40} />
                                            <span className="font-medium">Drop "My Clippings.txt" here</span>
                                            <span className="text-xs">or click to browse</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {status === 'error' && (
                                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 p-3 rounded-lg">
                                    <AlertCircle size={16} />
                                    <span>Import failed. Please try again.</span>
                                </div>
                            )}

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUpload}
                                    disabled={!file || status === 'uploading'}
                                    className="px-6 py-2 bg-[var(--accent-primary)] hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                                >
                                    {status === 'uploading' ? 'Importing...' : 'Import'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
