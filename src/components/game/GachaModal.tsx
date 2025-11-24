import React, { useState } from 'react';
import { GachaSystem } from "../../game-core/js/game/GachaSystem";
import { rarClass } from "../../game-core/js/game-data/characters";
import type { Character } from "../../game-core/js/game-data/characters";

interface GachaModalProps {
    visible: boolean;
    onClose: () => void;
    gachaSystem: GachaSystem;
    onUpdate: () => void;
}

export const GachaModal: React.FC<GachaModalProps> = ({ visible, onClose, gachaSystem, onUpdate }) => {
    const [results, setResults] = useState<Character[] | null>(null);
    const [isAnimating, setIsAnimating] = useState(false);

    if (!visible) return null;

    const handleGacha = (count: 1 | 10) => {
        const gachaResults = gachaSystem.doGacha(count) as Character[];
        if (!gachaResults) {
            alert('コインが不足しています！');
            return;
        }

        setIsAnimating(true);
        setResults(gachaResults);
        onUpdate();

        // Hide animation after delay
        setTimeout(() => {
            setIsAnimating(false);
        }, 3000);
    };

    const handleClose = () => {
        setResults(null);
        setIsAnimating(false);
        onClose();
    };

    const coins = gachaSystem.coins;
    const pity = gachaSystem.pity;

    return (
        <div className="overlay show" onClick={handleClose}>
            <div className="cardWrap" onClick={(e) => e.stopPropagation()}>
                <div className="cardHeader">
                    <h2>🎰 ガチャ</h2>
                    <button className="ghost" onClick={handleClose}>✕</button>
                </div>

                <div className="cardBody" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Coin Balance */}
                    <div style={{
                        background: 'rgba(255,255,255,0.08)',
                        padding: '12px',
                        borderRadius: '10px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <span style={{ fontWeight: 600 }}>所持コイン:</span>
                        <span style={{ fontSize: '18px', fontWeight: 700, color: '#facc15' }}>
                            🪙 {coins.toLocaleString('ja-JP')}
                        </span>
                    </div>

                    {/* Pity Counter */}
                    <div style={{
                        background: 'rgba(59,130,246,0.12)',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        fontSize: '13px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span>L以上まで: {pity.sinceL} 回</span>
                            <span style={{ opacity: 0.7 }}>（30回で確定）</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>M まで: {pity.sinceM} 回</span>
                            <span style={{ opacity: 0.7 }}>（100回で確定）</span>
                        </div>
                    </div>

                    {/* Gacha Buttons */}
                    {!results && (
                        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                            <button
                                className="cta secondary"
                                style={{ flex: 1 }}
                                onClick={() => handleGacha(1)}
                                disabled={coins < 10}
                            >
                                単発ガチャ<br />🪙 10
                            </button>
                            <button
                                className="cta"
                                style={{ flex: 1 }}
                                onClick={() => handleGacha(10)}
                                disabled={coins < 100}
                            >
                                10連ガチャ<br />🪙 100
                            </button>
                        </div>
                    )}

                    {/* Results Display */}
                    {results && (
                        <div style={{ marginTop: '16px' }}>
                            <h3 style={{ margin: '0 0 12px', fontSize: '18px', textAlign: 'center' }}>
                                🎉 ガチャ結果
                            </h3>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))',
                                gap: '10px',
                                maxHeight: '300px',
                                overflowY: 'auto',
                                padding: '8px'
                            }}>
                                {results.map((char, index) => {
                                    const owned = gachaSystem.collection.owned[char.key];
                                    const isNew = owned?.dup === 0;

                                    return (
                                        <div
                                            key={`${char.key}-${index}`}
                                            className={`miniCard ${rarClass(char.rar)}`}
                                            style={{
                                                animation: isAnimating ? `psr_fadeIn 0.5s ease ${index * 0.1}s both` : 'none',
                                                border: isNew ? '2px solid #facc15' : undefined,
                                                position: 'relative'
                                            }}
                                        >
                                            {isNew && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '-8px',
                                                    right: '-8px',
                                                    background: '#facc15',
                                                    color: '#000',
                                                    borderRadius: '50%',
                                                    width: '28px',
                                                    height: '28px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontWeight: 700,
                                                    fontSize: '12px'
                                                }}>
                                                    NEW
                                                </div>
                                            )}
                                            <div style={{ fontSize: '32px' }}>{char.emoji}</div>
                                            <div style={{ fontSize: '12px', fontWeight: 600, marginTop: '4px', textAlign: 'center' }}>
                                                {char.name}
                                            </div>
                                            <div style={{ fontSize: '10px', opacity: 0.8 }}>[{char.rar}]</div>
                                            {!isNew && owned && (
                                                <div style={{ fontSize: '11px', color: '#60a5fa', marginTop: '2px' }}>
                                                    +{owned.dup > 1 ? '複数' : '1'}凸
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                <button className="cta" onClick={() => setResults(null)}>
                                    もう一度引く
                                </button>
                                <button className="ghost" onClick={handleClose}>
                                    閉じる
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
