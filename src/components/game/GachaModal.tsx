import React, { useState } from 'react';
import { GachaSystem } from '../../game-core/js/game/GachaSystem.js';
import { useTranslation } from '../../hooks/useTranslation';
import { rarClass } from '../../game-core/js/game-data/characters.js';

interface GachaModalProps {
    visible: boolean;
    onClose: () => void;
    gachaSystem: GachaSystem;
    onUpdate: () => void; // Callback to update parent state (coins, collection)
}

export const GachaModal: React.FC<GachaModalProps> = ({ visible, onClose, gachaSystem, onUpdate }) => {
    const { t } = useTranslation();
    const [results, setResults] = useState<any[] | null>(null);
    const [isRolling, setIsRolling] = useState(false);

    if (!visible) return null;

    const handleRoll = (n: number) => {
        if (gachaSystem.coins < (n === 10 ? 100 : 10)) {
            alert(t('notEnoughCoins'));
            return;
        }

        setIsRolling(true);
        // Simulate animation delay
        setTimeout(() => {
            const res = gachaSystem.doGacha(n);
            setResults(res);
            setIsRolling(false);
            onUpdate();
        }, 800);
    };

    const closeResults = () => {
        setResults(null);
    };

    return (
        <div className="overlay visible" style={{ zIndex: 100 }}>
            <div className="modal-content" style={{ maxWidth: '500px', textAlign: 'center' }}>
                <div className="cardHeader">
                    <h2>{t('gacha')}</h2>
                    <button className="ghost" onClick={onClose}>✕</button>
                </div>

                <div className="cardBody" style={{ minHeight: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>

                    {!results ? (
                        <>
                            <div style={{ fontSize: '48px', marginBottom: '20px' }}>🎁</div>
                            <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>
                                {t('coins')}: {gachaSystem.coins}
                            </div>
                            <p style={{ opacity: 0.7, marginBottom: '32px' }}>
                                Collect characters to power up!
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                                <button
                                    className="primary"
                                    onClick={() => handleRoll(1)}
                                    disabled={isRolling}
                                >
                                    {t('roll1')}
                                </button>
                                <button
                                    className="secondary"
                                    onClick={() => handleRoll(10)}
                                    disabled={isRolling}
                                >
                                    {t('roll10')}
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <h3 style={{ marginBottom: '16px' }}>{t('get')}</h3>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
                                gap: '12px',
                                width: '100%',
                                maxHeight: '400px',
                                overflowY: 'auto',
                                padding: '8px'
                            }}>
                                {results.map((item, idx) => (
                                    <div key={idx} className={`gacha-result-item ${rarClass(item.char.rar)}`} style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        padding: '8px',
                                        borderRadius: '8px',
                                        border: '1px solid #ccc',
                                        background: '#fff',
                                        position: 'relative'
                                    }}>
                                        {item.isNew && <div style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#facc15', color: '#000', fontSize: '10px', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold' }}>NEW!</div>}
                                        {item.isLimitBreak && <div style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#60a5fa', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold' }}>UP!</div>}

                                        <div style={{ fontSize: '32px' }}>{item.char.emoji}</div>
                                        <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{item.char.name}</div>
                                        <div style={{ fontSize: '10px', color: '#666' }}>{item.char.rar}</div>
                                    </div>
                                ))}
                            </div>
                            <button className="primary" onClick={closeResults} style={{ marginTop: '20px', width: '100%' }}>
                                {t('close')}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
