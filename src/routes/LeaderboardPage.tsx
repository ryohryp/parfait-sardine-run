import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { leaderboardApi } from '../api/leaderboard';
import type { LeaderboardEntry } from '../api/leaderboard';
import { PageTransition } from '../components/common/PageTransition';

export const LeaderboardPage: React.FC = () => {
    const { t } = useTranslation();
    const [ranking, setRanking] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadRanking = useCallback(async () => {
        setLoading(true);
        try {
            const response = await leaderboardApi.getLeaderboard();
            // API returns { leaderboard: [...] } according to API spec
            const data = (response as { leaderboard?: LeaderboardEntry[] })?.leaderboard || response;
            // Ensure data is an array
            setRanking(Array.isArray(data) ? data : []);
        } catch {
            setError(t('errorRanking'));
            setRanking([]); // Ensure ranking is empty array on error
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        loadRanking();
    }, [loadRanking]);

    return (
        <PageTransition transitionKey="leaderboard">
            <div className="page-container">
                <div className="page-header">
                    <h1>{t('ranking')}</h1>
                    <Link to="/" className="ghost">{t('backToGame')}</Link>
                </div>

                <div className="data-table-section">
                    {loading && <p>{t('loading')}</p>}
                    {error && <p style={{ color: '#f44336' }}>{error}</p>}

                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>{t('rank')}</th>
                                <th>{t('name')}</th>
                                <th className="text-right">{t('score')}</th>
                                <th className="text-right">{t('level')}</th>
                                <th className="text-center">{t('char')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ranking.map((entry, index) => (
                                <tr key={index}>
                                    <td>{index + 1}</td>
                                    <td>{entry.name}</td>
                                    <td className="text-right">{entry.score.toLocaleString()}</td>
                                    <td className="text-right">{entry.level}</td>
                                    <td className="text-center">{entry.char}</td>
                                </tr>
                            ))}
                            {!loading && ranking.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center" style={{ padding: '20px' }}>{t('noData')}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </PageTransition>
    );
};
