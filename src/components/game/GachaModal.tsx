import React, { useState } from 'react';
import { GachaSystem } from '../../game-core/js/game/GachaSystem.js';
import type { Character } from '../../game-core/js/game/GachaSystem.js';
import { useTranslation } from '../../hooks/useTranslation';
import { useSound } from '../../hooks/useSound';
import { rarClass } from '../../game-core/js/game-data/characters.js';

interface GachaModalProps {
    visible: boolean;
    onClose: () => void;
    gachaSystem: GachaSystem;
    onUpdate: () => void; // Callback to update parent state (coins, collection)
}

type AnimationState = 'idle' | 'rolling' | 'cutscene' | 'ultra-cutscene' | 'result';

// Updated Result Type
type GachaResultItem =
    | { type: 'char'; char: Character; isNew: boolean; isLimitBreak: boolean; limitBreakPerformed: boolean }
    | { type: 'equip'; item: { id: string; name: string; rarity: string; icon: string }; isNew: boolean; rar: string };

export const GachaModal: React.FC<GachaModalProps> = ({ visible, onClose, gachaSystem, onUpdate }) => {
    const { t } = useTranslation();
    const { playUltraRare, playSuccess } = useSound();
    const [results, setResults] = useState<GachaResultItem[] | null>(null);
    const [animationState, setAnimationState] = useState<AnimationState>('idle');
    const [rollRarity, setRollRarity] = useState<'C' | 'L' | 'M'>('C'); // Highest rarity in current roll
    const [ultraChar, setUltraChar] = useState<Character | null>(null); // For M rarity reveal
    const [ultraEquip, setUltraEquip] = useState<{ name: string; icon: string } | null>(null); // For M rarity equipment reveal

    const [showRates, setShowRates] = useState(false);

    if (!visible) return null;

    const handleRoll = (n: number) => {
        const cost = n * 100;
        if (gachaSystem.coins < cost) {
            alert(t('notEnoughCoins'));
            return;
        }

        // 1. Pre-calculate results
        const res = gachaSystem.doGacha(n) as GachaResultItem[];
        if (!res) return;

        // 2. Determine highest rarity
        let highestRarity: 'C' | 'L' | 'M' = 'C';
        let foundUltraChar: Character | null = null;
        let foundUltraEquip: { name: string; icon: string } | null = null;

        res.forEach(item => {
            const rarity = item.type === 'char' ? item.char.rar : item.rar;

            if (rarity === 'M' || rarity === 'XL') {
                highestRarity = 'M';
                if (item.type === 'char') foundUltraChar = item.char;
                else foundUltraEquip = item.item;
            } else if (rarity === 'L' && highestRarity !== 'M') {
                highestRarity = 'L';
            }
        });

        setRollRarity(highestRarity);
        setUltraChar(foundUltraChar);
        setUltraEquip(foundUltraEquip);
        setResults(res);
        setAnimationState('rolling');

        // 3. Animation Sequence
        setTimeout(() => {
            if (highestRarity === 'M') {
                setAnimationState('ultra-cutscene');
                playUltraRare();
                setTimeout(() => {
                    setAnimationState('result');
                    onUpdate();
                }, 4000); // Longer for ultra
            } else if (highestRarity === 'L') {
                setAnimationState('cutscene');
                playSuccess();
                setTimeout(() => {
                    setAnimationState('result');
                    onUpdate();
                }, 2000);
            } else {
                setAnimationState('result');
                onUpdate();
            }
        }, 2000); // Rolling duration
    };

    const closeResults = () => {
        setResults(null);
        setAnimationState('idle');
        setRollRarity('C');
        setUltraChar(null);
        setUltraEquip(null);
    };

    return (
        <div className="overlay visible" style={{ zIndex: 100 }}>
            <div className="modal-content" style={{ maxWidth: '500px', textAlign: 'center', position: 'relative' }}>
                <div className="cardHeader">
                    <h2>{t('gacha')}</h2>
                    <button className="ghost" onClick={onClose}>✕</button>
                </div>

                <div className="cardBody" style={{ minHeight: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>

                    {animationState === 'idle' && !showRates && (
                        <>
                            <div style={{ fontSize: '48px', marginBottom: '20px' }}>🎁</div>
                            <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>
                                {t('coins')}: {gachaSystem.coins}
                            </div>

                            {/* Pity Counters */}
                            <div style={{
                                background: 'rgba(0,0,0,0.05)',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                marginBottom: '20px',
                                fontSize: '12px',
                                width: '100%'
                            }}>
                                <div style={{ color: '#d97706', fontWeight: 'bold' }}>
                                    {t('pityL', { count: 30 - gachaSystem.pity.sinceL })}
                                </div>
                                <div style={{ color: '#db2777', fontWeight: 'bold' }}>
                                    {t('pityM', { count: 100 - gachaSystem.pity.sinceM })}
                                </div>
                            </div>

                            <p style={{ opacity: 0.7, marginBottom: '24px' }}>
                                Collect characters and equipment!
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                                <button
                                    className="primary"
                                    onClick={() => handleRoll(1)}
                                >
                                    {t('roll1')} (100G)
                                </button>
                                <button
                                    className="secondary"
                                    onClick={() => handleRoll(10)}
                                >
                                    {t('roll10')} (1000G)
                                </button>
                            </div>

                            <button
                                className="text-button"
                                onClick={() => setShowRates(true)}
                                style={{ marginTop: '16px', fontSize: '12px', textDecoration: 'underline', background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}
                            >
                                {t('viewRates')}
                            </button>
                        </>
                    )}

                    {showRates && (
                        <div style={{ textAlign: 'left', width: '100%', fontSize: '14px' }}>
                            <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '8px', marginBottom: '12px' }}>{t('ratesTitle')}</h3>
                            <p style={{ marginBottom: '8px' }}>{t('ratesDesc')}</p>
                            <ul style={{ listStyle: 'none', padding: 0, marginBottom: '20px' }}>
                                <li style={{ color: '#ff0080', fontWeight: 'bold' }}>{t('rateM')}</li>
                                <li style={{ color: '#ff8c00', fontWeight: 'bold' }}>{t('rateL')}</li>
                                <li style={{ color: '#a855f7' }}>{t('rateE')}</li>
                                <li style={{ color: '#3b82f6' }}>{t('rateR')}</li>
                                <li style={{ color: '#666' }}>{t('rateC')}</li>
                            </ul>

                            <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '8px', marginBottom: '12px' }}>{t('pityTitle')}</h3>
                            <ul style={{ listStyle: 'none', padding: 0, marginBottom: '20px' }}>
                                <li style={{ marginBottom: '4px' }}>• {t('pityDescL')}</li>
                                <li>• {t('pityDescM')}</li>
                            </ul>

                            <button className="secondary" onClick={() => setShowRates(false)} style={{ width: '100%' }}>
                                {t('close')}
                            </button>
                        </div>
                    )}

                    {animationState === 'rolling' && (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            animation: rollRarity === 'M' ? 'shakeHard 0.5s infinite' : 'shake 0.5s infinite'
                        }}>
                            <div style={{
                                fontSize: '64px',
                                animation: 'pulse 1s infinite',
                                marginBottom: '20px',
                                filter: rollRarity === 'M' ? 'drop-shadow(0 0 20px rgba(255,0,128,0.8))' : rollRarity === 'L' ? 'drop-shadow(0 0 15px rgba(255,215,0,0.8))' : 'none'
                            }}>🎁</div>
                            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                                {rollRarity === 'M' ? '!!!!' : 'ガチャを引いています...'}
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
                            <div style={{ position: 'absolute', top: '10%', left: '20%', fontSize: '60px', animation: 'float 2s ease-in-out infinite' }}>💎</div>
                            <div style={{ position: 'absolute', top: '20%', right: '15%', fontSize: '50px', animation: 'float 2.5s ease-in-out infinite 0.5s' }}>⭐</div>
                            <div style={{ position: 'absolute', bottom: '15%', left: '10%', fontSize: '55px', animation: 'float 2.2s ease-in-out infinite 0.3s' }}>🌟</div>
                            <div style={{ position: 'absolute', bottom: '25%', right: '20%', fontSize: '65px', animation: 'float 2.8s ease-in-out infinite 0.7s' }}>✨</div>
                            <div style={{ position: 'absolute', top: '50%', left: '5%', fontSize: '45px', animation: 'float 2.3s ease-in-out infinite 0.2s' }}>🎆</div>
                            <div style={{ position: 'absolute', top: '40%', right: '8%', fontSize: '50px', animation: 'float 2.6s ease-in-out infinite 0.9s' }}>💫</div>

                            {/* Center content - Reveal Character or Equipment */}
                            <div style={{
                                fontSize: '120px',
                                animation: 'megaBounce 1s infinite, rotate 3s linear infinite',
                                marginBottom: '40px',
                                filter: 'drop-shadow(0 0 30px rgba(255,255,255,1))'
                            }}>
                                {ultraChar ? ultraChar.emoji : (ultraEquip ? ultraEquip.icon : '👑')}
                            </div>
                            <div style={{
                                fontSize: '48px',
                                fontWeight: 'bold',
                                color: '#fff',
                                textShadow: '0 0 30px rgba(255,215,0,1), 0 0 60px rgba(255,215,0,0.8)',
                                animation: 'megaGlow 1s infinite, pulse 2s infinite',
                                letterSpacing: '4px',
                                textAlign: 'center'
                            }}>
                                {ultraChar ? ultraChar.name : (ultraEquip ? ultraEquip.name : 'ULTRA RARE!!!')}
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
                                {results.map((item, idx) => {
                                    const isChar = item.type === 'char';
                                    const rarity = isChar ? item.char.rar : item.rar;
                                    const icon = isChar ? item.char.emoji : item.item.icon;
                                    const name = isChar ? item.char.name : item.item.name;

                                    return (
                                        <div key={idx} className={`gacha-result-item ${rarClass(rarity)}`} style={{
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
                                            {!isChar && <div style={{ position: 'absolute', top: '-8px', left: '-8px', background: '#a855f7', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold' }}>EQP</div>}

                                            <div style={{ fontSize: '32px' }}>{icon}</div>
                                            <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{name}</div>
                                            <div style={{ fontSize: '10px', color: '#666' }}>{rarity}</div>
                                        </div>
                                    );
                                })}
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
                @keyframes shakeHard {
                    0%, 100% { transform: translateX(0) scale(1); }
                    25% { transform: translateX(-10px) rotate(-10deg) scale(1.1); }
                    75% { transform: translateX(10px) rotate(10deg) scale(1.1); }
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
