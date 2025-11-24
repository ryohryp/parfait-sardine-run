import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { runsApi } from '../api/runs';
import type { StatsSummary } from '../api/runs';
import { useFingerprint } from '../hooks/useFingerprint';

export const StatsPage: React.FC = () => {
    const fingerprint = useFingerprint();
    const [stats, setStats] = useState<StatsSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (fingerprint) {
            loadStats();
        }
    }, [fingerprint]);

    const loadStats = async () => {
        setLoading(true);
        try {
            const data = await runsApi.getStats(fingerprint);
            setStats(data);
        } catch (err) {
            setError('統計の読み込みに失敗しました。');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>統計データ</h1>
                <Link to="/" className="ghost">ゲームに戻る</Link>
            </div>

            <div className="settings-section">
                {loading && <p>読み込み中...</p>}
                {error && <p style={{ color: '#f44336' }}>{error}</p>}

                {stats && (
                    <div className="stats-grid">
                        {stats.total_users !== undefined && (
                            <div className="stat-card">
                                <h3>総ユーザー数</h3>
                                <div className="stat-value">{stats.total_users.toLocaleString()}</div>
                            </div>
                        )}
                        {stats.played_users !== undefined && (
                            <div className="stat-card">
                                <h3>プレイ済みユーザー</h3>
                                <div className="stat-value">{stats.played_users.toLocaleString()}</div>
                            </div>
                        )}
                        <div className="stat-card">
                            <h3>総プレイ回数</h3>
                            <div className="stat-value">{(stats.total_runs || 0).toLocaleString()}</div>
                        </div>
                        <div className="stat-card">
                            <h3>最高スコア</h3>
                            <div className="stat-value">{(stats.max_score || 0).toLocaleString()}</div>
                        </div>
                        <div className="stat-card">
                            <h3>平均スコア</h3>
                            <div className="stat-value">{(stats.avg_score || 0).toLocaleString()}</div>
                        </div>
                        {stats.today_users !== undefined && (
                            <div className="stat-card">
                                <h3>今日のユーザー</h3>
                                <div className="stat-value">{stats.today_users.toLocaleString()}</div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
