import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { characters, rarClass } from '../../game-core/js/game-data/characters.js';
import { GachaSystem } from '../../game-core/js/game/GachaSystem.js';

import { CharacterDetailModal } from './CharacterDetailModal';

interface CharacterSelectModalProps {
    visible: boolean;
    onStart: (characterKey: string) => void;
    onBack: () => void;
    gachaSystem: GachaSystem;
    initialChar?: string;
    onOpenSkillTree?: (characterKey: string) => void;
    onOpenEquipment?: (characterKey: string) => void;
}

export const CharacterSelectModal: React.FC<CharacterSelectModalProps> = ({
    visible,
    onStart,
    onBack,
    gachaSystem,
    initialChar = 'parfen',
    onOpenSkillTree,
    onOpenEquipment,
}) => {
    const { t } = useTranslation();
    const [selectedChar, setSelectedChar] = useState<string>(initialChar);
    const [collection, setCollection] = useState<any>(null);
    const [charProgression, setCharProgression] = useState<any>(null);
    const [showDetail, setShowDetail] = useState(false);

    // Load collection and set initial selected character when modal becomes visible
    useEffect(() => {
        if (!visible) return;
        setCollection(gachaSystem.collection);
        const owned = gachaSystem.collection.owned;
        if (owned[initialChar]) {
            setSelectedChar(initialChar);
        } else if (gachaSystem.collection.current) {
            setSelectedChar(gachaSystem.collection.current);
        }
    }, [visible, initialChar, gachaSystem]);

    // Load progression data whenever selected character changes
    useEffect(() => {
        if (!visible || !gachaSystem.progression) return;
        const prog = gachaSystem.progression.getCharacterData(selectedChar);
        setCharProgression(prog);
    }, [selectedChar, visible, gachaSystem.progression]);

    // Poll for progression updates while modal is open (e.g., after enemy defeat)
    useEffect(() => {
        if (!visible || !gachaSystem.progression) return;
        const interval = setInterval(() => {
            const prog = gachaSystem.progression.getCharacterData(selectedChar);
            setCharProgression(prog);
        }, 500);
        return () => clearInterval(interval);
    }, [visible, selectedChar, gachaSystem.progression]);

    if (!visible) return null;

    const charList = Object.values(characters);
    const currentChar = characters[selectedChar];
    const levelCap = charProgression && gachaSystem.progression
        ? gachaSystem.progression.getLevelCap(charProgression.limitBreak)
        : 20;
    const expProgress = charProgression && charProgression.expToNext
        ? (charProgression.exp / charProgression.expToNext) * 100
        : 0;

    return (
        <div className="overlay visible" style={{ zIndex: 50 }}>
            <div className="modal-content" style={{ maxWidth: '800px', width: '95%', height: '90vh', display: 'flex', flexDirection: 'column' }}>
                <div className="cardHeader">
                    <h2>{t('selectCharacter')}</h2>
                    <button className="ghost" onClick={onBack}>✕</button>
                </div>
                <div className="cardBody" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden' }}>
                    {/* Character List */}
                    <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', padding: '8px', minHeight: '120px', borderBottom: '1px solid #eee' }}>
                        {charList.map((char: any) => {
                            const owned = collection?.owned[char.key]?.owned;
                            const progData = gachaSystem.progression?.getCharacterData(char.key);
                            return (
                                <div
                                    key={char.key}
                                    onClick={() => owned && setSelectedChar(char.key)}
                                    className={rarClass(char.rar)}
                                    style={{
                                        flex: '0 0 auto',
                                        width: '80px',
                                        height: '100px',
                                        border: selectedChar === char.key ? '3px solid var(--primary)' : '1px solid #e2e8f0',
                                        borderRadius: '12px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: owned ? 'pointer' : 'default',
                                        background: selectedChar === char.key ? '#f0f9ff' : '#fff',
                                        opacity: owned ? 1 : 0.5,
                                        filter: owned ? 'none' : 'grayscale(100%)',
                                        position: 'relative',
                                    }}
                                >
                                    {char.image ? (
                                        char.spriteConfig ? (
                                            <div style={{
                                                width: '64px',
                                                height: '64px',
                                                backgroundImage: `url(${import.meta.env.BASE_URL}${char.image})`,
                                                backgroundSize: `${char.spriteConfig.cols * 100}% ${char.spriteConfig.rows * 100}%`,
                                                backgroundPosition: '0 0',
                                                imageRendering: 'pixelated'
                                            }} />
                                        ) : (
                                            <img src={`${import.meta.env.BASE_URL}${char.image}`} alt={char.name} style={{ width: '64px', height: '64px', objectFit: 'contain', imageRendering: 'pixelated' }} />
                                        )
                                    ) : (
                                        <div style={{ fontSize: '32px' }}>{char.emoji}</div>
                                    )}
                                    {owned && progData && (
                                        <div style={{
                                            position: 'absolute',
                                            bottom: '4px',
                                            fontSize: '10px',
                                            background: 'rgba(0,0,0,0.7)',
                                            color: 'white',
                                            padding: '2px 6px',
                                            borderRadius: '8px',
                                            fontWeight: 'bold',
                                        }}>
                                            Lv.{progData.level}
                                        </div>
                                    )}
                                    {!owned && (
                                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', background: 'rgba(0,0,0,0.1)', borderRadius: '12px' }}>🔒</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    {/* Details View */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto', padding: '16px', position: 'relative' }}>

                        {/* Detail Button */}
                        <button
                            onClick={() => setShowDetail(true)}
                            style={{
                                position: 'absolute',
                                top: '16px',
                                right: '16px',
                                background: 'white',
                                border: '1px solid #cbd5e1',
                                borderRadius: '50%',
                                width: '40px',
                                height: '40px',
                                fontSize: '20px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}
                            title="View Details"
                        >
                            🔍
                        </button>

                        <div style={{ marginBottom: '16px' }}>
                            {currentChar?.image ? (
                                currentChar.spriteConfig ? (
                                    <div style={{
                                        width: '128px',
                                        height: '128px',
                                        backgroundImage: `url(${import.meta.env.BASE_URL}${currentChar.image})`,
                                        backgroundSize: `${currentChar.spriteConfig.cols * 100}% ${currentChar.spriteConfig.rows * 100}%`,
                                        backgroundPosition: '0 0',
                                        imageRendering: 'pixelated'
                                    }} />
                                ) : (
                                    <img src={`${import.meta.env.BASE_URL}${currentChar.image}`} alt={currentChar.name} style={{ width: '128px', height: '128px', objectFit: 'contain', imageRendering: 'pixelated' }} />
                                )
                            ) : (
                                <div style={{ fontSize: '64px' }}>{currentChar?.emoji}</div>
                            )}
                        </div>
                        <h3 style={{ fontSize: '24px', marginBottom: '8px' }}>{t(`char_${selectedChar}_name` as any)}</h3>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center' }}>
                            <div className={`badge ${rarClass(currentChar?.rar)}`}>{currentChar?.rar}</div>
                            {charProgression && (
                                <div style={{
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    color: 'white',
                                    padding: '4px 12px',
                                    borderRadius: '12px',
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                }}>
                                    Lv. {charProgression.level}/{levelCap}
                                </div>
                            )}
                        </div>
                        {/* EXP Progress Bar */}
                        {charProgression && charProgression.level < levelCap && (
                            <div style={{ width: '100%', maxWidth: '400px', marginBottom: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                                    <span>EXP</span>
                                    <span>{charProgression.exp} / {charProgression.expToNext}</span>
                                </div>
                                <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{ width: `${expProgress}%`, height: '100%', background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)', transition: 'width 0.3s ease' }} />
                                </div>
                            </div>
                        )}
                        {/* MAX LEVEL indicator */}
                        {charProgression && charProgression.level >= levelCap && (
                            <div style={{
                                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                                color: 'white',
                                padding: '8px 16px',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                marginBottom: '16px',
                            }}>
                                🌟 MAX LEVEL {charProgression.limitBreak < 5 ? '(限界突破可能)' : '(完全育成済み)'}
                            </div>
                        )}
                        {/* Skill Points */}
                        {charProgression && charProgression.skillPoints > 0 && (
                            <div style={{
                                background: '#fef3c7',
                                border: '2px solid #f59e0b',
                                padding: '8px 16px',
                                borderRadius: '12px',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                marginBottom: '16px',
                                color: '#92400e',
                            }}>
                                ⚡ スキルポイント: {charProgression.skillPoints}
                            </div>
                        )}
                        <p style={{ textAlign: 'center', marginBottom: '16px', maxWidth: '400px', lineHeight: '1.6' }}>
                            {t(`char_${selectedChar}_desc` as any)}
                        </p>
                        {/* Progression Buttons */}
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', width: '100%', maxWidth: '400px' }}>
                            <button className="secondary" onClick={() => onOpenSkillTree?.(selectedChar)} style={{ flex: 1, fontSize: '14px', padding: '8px' }}>
                                🌳 育成
                            </button>
                            <button className="secondary" onClick={() => onOpenEquipment?.(selectedChar)} style={{ flex: 1, fontSize: '14px', padding: '8px' }}>
                                🎒 装備
                            </button>
                        </div>
                        {/* Stats */}
                        <div style={{ width: '100%', maxWidth: '400px', background: '#f8fafc', padding: '16px', borderRadius: '12px' }}>
                            <h4 style={{ marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>Stats</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                <div>🏃 Speed: {currentChar?.move}</div>
                                <div>🦘 Jump: {currentChar?.jump}</div>
                                <div>🔫 Bullet: {currentChar?.bullet}</div>
                                <div>🛡️ Invincibility: {currentChar?.inv}s</div>
                            </div>
                            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                                <strong>⚡ Ultimate:</strong> {currentChar?.ult ? t(`ult_${currentChar?.ult}_name` as any) : 'None'}
                                {currentChar?.ult && (
                                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{t(`ult_${currentChar?.ult}_desc` as any)}</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="footerBtns" style={{ padding: '16px', borderTop: '1px solid #eee', display: 'flex', gap: '8px' }}>
                    <button className="secondary" onClick={onBack} style={{ flex: 1 }}>
                        {t('menu')}
                    </button>
                    <button className="primary" onClick={() => onStart(selectedChar)} style={{ flex: 2 }}>
                        {t('start')}
                    </button>
                </div>
            </div>

            {showDetail && currentChar && (
                <CharacterDetailModal
                    characterKey={selectedChar}
                    characterData={currentChar}
                    gachaSystem={gachaSystem}
                    onClose={() => setShowDetail(false)}
                />
            )}
        </div>
    );
};
