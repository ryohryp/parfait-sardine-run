import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { leaderboardApi } from '../api/leaderboard';
import type { LeaderboardEntry } from '../api/leaderboard';

export const LeaderboardPage: React.FC = () => {
    const [ranking, setRanking] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadRanking();
    }, []);

    const loadRanking = async () => {
        setLoading(true);
        try {
            const data = await leaderboardApi.getLeaderboard();
            setRanking(data);
        } catch (err) {
            setError('ランキングの読み込みに失敗しました。');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>ランキング</h1>
                <Link to="/" className="ghost">ゲームに戻る</Link>
            </div>

            <div className="data-table-section">
                {loading && <p>読み込み中...</p>}
                {error && <p style={{ color: '#f44336' }}>{error}</p>}

                <table className="data-table">
                    <thead>
                        <tr>
                            <th>順位</th>
                            <th>名前</th>
                            <th className="text-right">スコア</th>
                            <th className="text-right">Lv</th>
                            <th className="text-center">キャラ</th>
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
                                <td colSpan={5} className="text-center" style={{ padding: '20px' }}>データがありません</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
