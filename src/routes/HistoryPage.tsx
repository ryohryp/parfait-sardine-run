import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { runsApi } from '../api/runs';
import type { RunLogEntry } from '../api/runs';
import { useFingerprint } from '../hooks/useFingerprint';

export const HistoryPage: React.FC = () => {
    const fingerprint = useFingerprint();
    const [runs, setRuns] = useState<RunLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (fingerprint) {
            loadRuns();
        }
    }, [fingerprint]);

    const loadRuns = async () => {
        setLoading(true);
        try {
            const data = await runsApi.getRuns(fingerprint);
            setRuns(data);
        } catch (err) {
            setError('履歴の読み込みに失敗しました。');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>プレイ履歴</h1>
                <Link to="/" className="ghost">ゲームに戻る</Link>
            </div>

            <div className="data-table-section">
                {loading && <p>読み込み中...</p>}
                {error && <p style={{ color: '#f44336' }}>{error}</p>}

                <table className="data-table">
                    <thead>
                        <tr>
                            <th>日付</th>
                            <th>ステージ</th>
                            <th className="text-right">スコア</th>
                            <th className="text-right">コイン</th>
                            <th className="text-right">時間</th>
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
                                <td colSpan={5} className="text-center" style={{ padding: '20px' }}>履歴がありません</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
