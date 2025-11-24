import React, { useState } from 'react';
import { GachaSystem, type CharacterOwned, type Character } from '../../game-core/js/game/GachaSystem.js';
import { useTranslation } from '../../hooks/useTranslation';
import { rarClass } from '../../game-core/js/game-data/characters.js';

interface GachaModalProps {
    visible: boolean;
    onClose: () => void;
    gachaSystem: GachaSystem;
    onUpdate: () => void; // Callback to update parent state (coins, collection)
}

type AnimationState = 'idle' | 'rolling' | 'cutscene' | 'ultra-cutscene' | 'result';
type GachaResultItem = CharacterOwned & { char: Character; isLimitBreak: boolean; limitBreakPerformed: boolean; isNew: boolean };

export const GachaModal: React.FC<GachaModalProps> = ({ visible, onClose, gachaSystem, onUpdate }) => {
    const { t } = useTranslation();
    const [results, setResults] = useState<GachaResultItem[] | null>(null);
    const [animationState, setAnimationState] = useState<AnimationState>('idle');

    if (!visible) return null;

    const handleRoll = (n: number) => {
        if (gachaSystem.coins < (n === 10 ? 100 : 10)) {
            alert(t('notEnoughCoins'));
            return;
        }

        setAnimationState('rolling');

        // Rolling animation
        setTimeout(() => {
            const res = gachaSystem.doGacha(n);

            if (!res) {
                setAnimationState('idle');
                return;
            }

            // Check rarity levels
            const hasUltraRarity = res.some((item) => {
                const rar = item.char.rar;
                return rar === 'M' || rar === 'XL';
            });

            const hasHighRarity = res.some((item) => {
                const rar = item.char.rar;
                return rar === 'L';
            });

            if (hasUltraRarity) {
                // Show ultra cutscene for M/XL rarity
                setAnimationState('ultra-cutscene');
                setTimeout(() => {
                    setResults(res);
                    setAnimationState('result');
                    onUpdate();
                }, 3500);
            } else if (hasHighRarity) {
                // Show cutscene for L rarity
                setAnimationState('cutscene');
                setTimeout(() => {
                    setResults(res);
                    setAnimationState('result');
                    onUpdate();
                }, 2000);
            } else {
                // Show results directly
                setResults(res);
                setAnimationState('result');
                onUpdate();
            }
        }, 1500);
    };

    const closeResults = () => {
        setResults(null);
        setAnimationState('idle');
    };

    return (
        <div className="overlay visible" style={{ zIndex: 100 }}>
            <div className="modal-content" style={{ maxWidth: '500px', textAlign: 'center' }}>
                <div className="cardHeader">
                    <h2>{t('gacha')}</h2>
                    <button className="ghost" onClick={onClose}>✕</button>
                </div>

                <div className="cardBody" style={{ minHeight: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>

                    {animationState === 'idle' && (
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
                                >
                                    {t('roll1')}
                                </button>
                                <button
                                    className="secondary"
                                    onClick={() => handleRoll(10)}
                                >
                                    {t('roll10')}
                                </button>
                            </div>
                        </>
                    )}

                    {animationState === 'rolling' && (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            animation: 'shake 0.5s infinite'
                        }}>
                            <div style={{
                                fontSize: '64px',
                                animation: 'pulse 1s infinite',
                                marginBottom: '20px'
                            }}>🎁</div>
                            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                                ガチャを引いています...
                            </div>
                        </div>
                    )}

                    {animationState === 'cutscene' && (
                        <div style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            width: '100vw',
                            height: '100vh',
                            background: 'radial-gradient(circle, #ffd700 0%, #ff6347 100%)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 200,
                            animation: 'fadeIn 0.5s'
                        }}>
                            <div style={{
                                fontSize: '80px',
                                animation: 'bounce 1s infinite',
                                marginBottom: '30px'
                            }}>✨</div>
                            <div style={{
                                fontSize: '48px',
                                fontWeight: 'bold',
                                color: '#fff',
                                textShadow: '0 0 20px rgba(255,255,255,0.8)',
                                animation: 'glow 1s infinite'
                            }}>
                                HIGH RARITY!
                            </div>
                        </div>
                    )}

                    {animationState === 'ultra-cutscene' && (
                        <div style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            width: '100vw',
                            height: '100vh',
                            background: 'linear-gradient(45deg, #ff0080, #ff8c00, #40e0d0, #8a2be2, #ff0080)',
                            backgroundSize: '400% 400%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 200,
                            animation: 'rainbowMove 3s ease infinite, fadeIn 0.5s',
                            overflow: 'hidden'
                        }}>
                            {/* Particle effects */}
                            <div style={{
                                position: 'absolute',
                                top: '10%',
                                left: '20%',
                                fontSize: '60px',
                                animation: 'float 2s ease-in-out infinite'
                            }}>💎</div>
                            <div style={{
                                position: 'absolute',
                                top: '20%',
                                right: '15%',
                                fontSize: '50px',
                                animation: 'float 2.5s ease-in-out infinite 0.5s'
                            }}>⭐</div>
                            <div style={{
                                position: 'absolute',
                                bottom: '15%',
                                left: '10%',
                                fontSize: '55px',
                                animation: 'float 2.2s ease-in-out infinite 0.3s'
                            }}>🌟</div>
                            <div style={{
                                position: 'absolute',
                                bottom: '25%',
                                right: '20%',
                                fontSize: '65px',
                                animation: 'float 2.8s ease-in-out infinite 0.7s'
                            }}>✨</div>
                            <div style={{
                                position: 'absolute',
                                top: '50%',
                                left: '5%',
                                fontSize: '45px',
                                animation: 'float 2.3s ease-in-out infinite 0.2s'
                            }}>🎆</div>
                            <div style={{
                                position: 'absolute',
                                top: '40%',
                                right: '8%',
                                fontSize: '50px',
                                animation: 'float 2.6s ease-in-out infinite 0.9s'
                            }}>💫</div>

                            {/* Center content */}
                            <div style={{
                                fontSize: '120px',
                                animation: 'megaBounce 1s infinite, rotate 3s linear infinite',
                                marginBottom: '40px',
                                filter: 'drop-shadow(0 0 30px rgba(255,255,255,1))'
                            }}>👑</div>
                            <div style={{
                                fontSize: '64px',
                                fontWeight: 'bold',
                                color: '#fff',
                                textShadow: '0 0 30px rgba(255,215,0,1), 0 0 60px rgba(255,215,0,0.8)',
                                animation: 'megaGlow 1s infinite, pulse 2s infinite',
                                letterSpacing: '8px'
                            }}>
                                ULTRA RARE!!!
                            </div>
                            <div style={{
                                fontSize: '32px',
                                fontWeight: 'bold',
                                color: '#fff',
                                marginTop: '20px',
                                textShadow: '0 0 20px rgba(255,255,255,0.8)',
                                animation: 'glow 1.5s infinite'
                            }}>
                                🎊 LEGENDARY PULL! 🎊
                            </div>
                        </div>
                    )}

                    {animationState === 'result' && results && (
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
                                        position: 'relative',
                                        animation: `slideIn 0.3s ease-out ${idx * 0.1}s backwards`
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

            <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px) rotate(-5deg); }
                    75% { transform: translateX(5px) rotate(5deg); }
                }
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.2); }
                }
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-20px); }
                }
                @keyframes megaBounce {
                    0%, 100% { transform: translateY(0) scale(1); }
                    50% { transform: translateY(-30px) scale(1.3); }
                }
                @keyframes glow {
                    0%, 100% { text-shadow: 0 0 20px rgba(255,255,255,0.8); }
                    50% { text-shadow: 0 0 40px rgba(255,255,255,1); }
                }
                @keyframes megaGlow {
                    0%, 100% { 
                        text-shadow: 0 0 30px rgba(255,215,0,1), 0 0 60px rgba(255,215,0,0.8);
                    }
                    50% { 
                        text-shadow: 0 0 50px rgba(255,215,0,1), 0 0 100px rgba(255,215,0,1), 0 0 150px rgba(255,100,200,0.8);
                    }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                @keyframes rainbowMove {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                @keyframes float {
                    0%, 100% { 
                        transform: translateY(0) rotate(0deg);
                        opacity: 0.8;
                    }
                    50% { 
                        transform: translateY(-30px) rotate(180deg);
                        opacity: 1;
                    }
                }
                @keyframes rotate {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};
