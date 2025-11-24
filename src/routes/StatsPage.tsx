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
                        <div className="stat-card">
                            <h3>総プレイ回数</h3>
                            <div className="stat-value">{stats.total_runs}</div>
                        </div>
                        <div className="stat-card">
                            <h3>最高スコア</h3>
                            <div className="stat-value">{stats.max_score.toLocaleString()}</div>
                        </div>
                        <div className="stat-card">
                            <h3>総獲得コイン</h3>
                            <div className="stat-value">{stats.total_coins.toLocaleString()}</div>
                        </div>
                        <div className="stat-card">
                            <h3>総スコア</h3>
                            <div className="stat-value">{stats.total_score.toLocaleString()}</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
