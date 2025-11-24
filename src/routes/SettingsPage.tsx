import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFingerprint } from '../hooks/useFingerprint';

export const SettingsPage: React.FC = () => {
    const fingerprint = useFingerprint();
    const [showConfirm, setShowConfirm] = useState(false);

    const handleReset = () => {
        localStorage.removeItem('psrun_fingerprint_v1');
        window.location.reload();
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>設定</h1>
                <Link to="/" className="ghost">ゲームに戻る</Link>
            </div>

            <div className="settings-section">
                <h2>ユーザーID (Fingerprint)</h2>
                <p className="muted">
                    あなたのプレイデータやコメントはこのIDに紐付いています。
                    別のブラウザやデバイスでは異なるIDになります。
                </p>
                <div className="fingerprint-display">
                    <code>{fingerprint || '生成中...'}</code>
                </div>

                <div className="danger-zone">
                    <h3>データのリセット</h3>
                    <p>IDを再生成します。これまでの履歴やランキングデータとの紐付けが失われます。</p>

                    {!showConfirm ? (
                        <button className="warn" onClick={() => setShowConfirm(true)}>
                            IDをリセットする
                        </button>
                    ) : (
                        <div className="confirm-actions">
                            <p className="warn-text">本当にリセットしますか？この操作は取り消せません。</p>
                            <button className="warn" onClick={handleReset}>はい、リセットします</button>
                            <button className="ghost" onClick={() => setShowConfirm(false)}>キャンセル</button>
                        </div>
                    )}
                </div>
            </div>

            <div className="settings-section">
                <h2>バージョン情報</h2>
                <p>Parfait & Sardine Run! React Edition v1.0.0</p>
            </div>
        </div>
    );
};
