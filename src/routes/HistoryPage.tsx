import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import type { RunLogEntry } from '../api/runs';
import { PageTransition } from '../components/common/PageTransition';

interface HistoryPageProps {
    onClose?: () => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ onClose }) => {
    const { t } = useTranslation();
    const [runs, setRuns] = useState<RunLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadRuns = useCallback(() => {
        setLoading(true);
        setError(null);
        try {
            // Load from localStorage
            const localRuns = localStorage.getItem('psrun_history_v1');
            if (localRuns) {
                const parsed = JSON.parse(localRuns);
                setRuns(parsed);
            } else {
                setRuns([]);
            }
        } catch (err) {
            console.error('[HistoryPage] Failed to load local history:', err);
            setRuns([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadRuns();
    }, [loadRuns]);

    return (
        <PageTransition transitionKey="history">
            <div className="page-container">
                <div className="page-header">
                    <h1>{t('history')}</h1>
                    {!onClose ? (
                        <Link to="/" className="ghost">{t('backToGame')}</Link>
                    ) : (
                        <button className="ghost" onClick={onClose}>{t('close')}</button>
                    )}
                </div>

                <div className="data-table-section">
                    {loading && <p>{t('loading')}</p>}
                    {error && <p style={{ color: '#f44336' }}>{error}</p>}

                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>{t('date')}</th>
                                <th>{t('stage')}</th>
                                <th className="text-right">{t('score')}</th>
                                <th className="text-right">{t('coins')}</th>
                                <th className="text-right">{t('time')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {runs.slice(0, 10).map((run) => (
                                <tr key={run.id}>
                                    <td>{new Date(run.date).toLocaleString('ja-JP', {
                                        year: 'numeric',
                                        month: '2-digit',
                                        day: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        second: '2-digit',
                                        hour12: false
                                    })}</td>
                                    <td>{run.stage}</td>
                                    <td className="text-right">{run.score.toLocaleString()}</td>
                                    <td className="text-right">{run.coins}</td>
                                    <td className="text-right">{(run.duration / 1000).toFixed(1)}s</td>
                                </tr>
                            ))}
                            {!loading && runs.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center" style={{ padding: '20px' }}>{t('noHistory')}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </PageTransition>
    );
};
