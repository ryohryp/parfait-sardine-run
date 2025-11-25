import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { runsApi } from '../api/runs';
import type { StatsSummary } from '../api/runs';
import { useFingerprint } from '../hooks/useFingerprint';
import { PageTransition } from '../components/common/PageTransition';

export const StatsPage: React.FC = () => {
    const { t } = useTranslation();
    const fingerprint = useFingerprint();
    const [stats, setStats] = useState<StatsSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadStats = useCallback(async () => {
        setLoading(true);
        try {
            const data = await runsApi.getStats(fingerprint);
            setStats(data);
        } catch {
            setError(t('errorStats'));
        } finally {
            setLoading(false);
        }
    }, [fingerprint, t]);

    useEffect(() => {
        if (fingerprint) {
            loadStats();
        }
    }, [fingerprint, loadStats]);

    return (
        <PageTransition transitionKey="stats">
            <div className="page-container">
                <div className="page-header">
                    <h1>{t('stats')}</h1>
                    <Link to="/" className="ghost">{t('backToGame')}</Link>
                </div>

                <div className="settings-section">
                    {loading && <p>{t('loading')}</p>}
                    {error && <p style={{ color: '#f44336' }}>{error}</p>}

                    {stats && (
                        <div className="page-stats-grid">
                            {stats.total_users !== undefined && (
                                <div className="page-stat-card">
                                    <h3>{t('totalUsers')}</h3>
                                    <div className="page-stat-value">{stats.total_users.toLocaleString()}</div>
                                </div>
                            )}
                            {stats.played_users !== undefined && (
                                <div className="page-stat-card">
                                    <h3>{t('playedUsers')}</h3>
                                    <div className="page-stat-value">{stats.played_users.toLocaleString()}</div>
                                </div>
                            )}
                            <div className="page-stat-card">
                                <h3>{t('totalRuns')}</h3>
                                <div className="page-stat-value">{(stats.total_runs || 0).toLocaleString()}</div>
                            </div>
                            <div className="page-stat-card">
                                <h3>{t('maxScore')}</h3>
                                <div className="page-stat-value">{(stats.max_score || 0).toLocaleString()}</div>
                            </div>
                            <div className="page-stat-card">
                                <h3>{t('avgScore')}</h3>
                                <div className="page-stat-value">{(stats.avg_score || 0).toLocaleString()}</div>
                            </div>
                            {stats.today_users !== undefined && (
                                <div className="page-stat-card">
                                    <h3>{t('todayUsers')}</h3>
                                    <div className="page-stat-value">{stats.today_users.toLocaleString()}</div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </PageTransition>
    );
};
