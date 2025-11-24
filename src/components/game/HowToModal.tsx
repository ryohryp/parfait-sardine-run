import React from 'react';

interface HowToModalProps {
    visible: boolean;
    onClose: () => void;
}

export const HowToModal: React.FC<HowToModalProps> = ({ visible, onClose }) => {
    if (!visible) return null;

    return (
        <div className="overlay show" onClick={onClose}>
            <div className="cardWrap preGameCard" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                <div className="cardHeader">
                    <h2>🎮 遊び方</h2>
                    <button className="ghost" onClick={onClose}>✕</button>
                </div>

                <div className="cardBody" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                    <div style={{ padding: '16px' }}>
                        <p style={{ marginBottom: '20px', fontSize: '15px', lineHeight: '1.6' }}>
                            まずは操作をチェック！60秒ランでベストスコアを狙い、コインでキャラを集めましょう。
                        </p>

                        <div style={{ marginBottom: '24px' }}>
                            <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#60a5fa' }}>基本操作</h3>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                <li style={{ marginBottom: '12px', paddingLeft: '8px', borderLeft: '3px solid #60a5fa' }}>
                                    <strong>ジャンプ:</strong> 画面左タップ/クリック。二段ジャンプ可能なキャラもいます。
                                </li>
                                <li style={{ marginBottom: '12px', paddingLeft: '8px', borderLeft: '3px solid #60a5fa' }}>
                                    <strong>攻撃:</strong> 画面右タップで攻撃、長押し or 右下の<strong>必殺</strong>ボタンでゲージ100%時の必殺技を発動。
                                </li>
                                <li style={{ marginBottom: '12px', paddingLeft: '8px', borderLeft: '3px solid #60a5fa' }}>
                                    <strong>アイテム:</strong> 🍨や🐟アイテムでスコア＆コイン、⭐で無敵とゲージUP。敵を倒すとさらにボーナス。
                                </li>
                                <li style={{ marginBottom: '12px', paddingLeft: '8px', borderLeft: '3px solid #60a5fa' }}>
                                    <strong>ガチャ:</strong> 集めたコインでガチャを回し、キャラを装備して能力を入れ替えましょう。
                                </li>
                            </ul>
                        </div>

                        <div style={{ padding: '12px', backgroundColor: 'rgba(96, 165, 250, 0.1)', borderRadius: '8px', border: '1px solid rgba(96, 165, 250, 0.3)' }}>
                            <p style={{ margin: 0, fontSize: '13px', color: '#93c5fd' }}>
                                💡 <strong>ヒント:</strong> ベストスコアは自動保存。連続プレイで令和チャンプを目指そう！
                            </p>
                        </div>
                    </div>
                </div>

                <div className="footerBtns">
                    <button className="cta" onClick={onClose}>
                        閉じる
                    </button>
                </div>
            </div>
        </div>
    );
};
