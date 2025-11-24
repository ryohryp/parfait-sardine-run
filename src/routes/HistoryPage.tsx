import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { runsApi } from '../api/runs';
import type { RunLogEntry } from '../api/runs';
import { useFingerprint } from '../hooks/useFingerprint';

export const HistoryPage: React.FC = () => {
    const { t } = useTranslation();
    const fingerprint = useFingerprint();
    const [runs, setRuns] = useState<RunLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadRuns = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await runsApi.getRuns(fingerprint);
            setRuns(data);
        } catch (err) {
            // Handle rate limit errors specifically
            if (err instanceof Error && err.message?.includes('429')) {
                setError(t('errorRateLimit'));
            } else {
                setError(t('errorHistory'));
            }
            setRuns([]);
        } finally {
            setLoading(false);
        }
    }, [fingerprint, t]);

    useEffect(() => {
        let isMounted = true;
        const timeoutId = setTimeout(() => {
            if (fingerprint && isMounted) {
                loadRuns();
            }
        }, 100);

        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
        };
    }, [fingerprint, loadRuns]);

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>{t('history')}</h1>
                <Link to="/" className="ghost">{t('backToGame')}</Link>
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
                        {runs.map((run) => (
                            <tr key={run.id}>
                                <td>{run.date}</td>
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
    );
};
