import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { characters, rarClass } from '../../game-core/js/game-data/characters.js';
import { GachaSystem } from '../../game-core/js/game/GachaSystem.js';

interface CharacterSelectModalProps {
    visible: boolean;
    onStart: (characterKey: string) => void;
    onBack: () => void;
    gachaSystem: GachaSystem;
    initialChar?: string;
}

export const CharacterSelectModal: React.FC<CharacterSelectModalProps> = ({ visible, onStart, onBack, gachaSystem, initialChar = 'parfen' }) => {
    const { t } = useTranslation();
    const [selectedChar, setSelectedChar] = useState('parfen');
    const [collection, setCollection] = useState<any>(null);

    useEffect(() => {
        if (visible) {
            // Reload collection from the shared GachaSystem instance
            setCollection(gachaSystem.collection);

            // If we have an initial char and we own it, select it.
            // Otherwise check if we own the currently selected char (which defaults to 'parfen' or previous selection)
            // If not owned, fallback to current equipped or 'parfen'

            const charToSelect = initialChar;
            if (gachaSystem.collection.owned[charToSelect]) {
                setSelectedChar(charToSelect);
            } else if (!gachaSystem.collection.owned[selectedChar]) {
                setSelectedChar(gachaSystem.collection.current || 'parfen');
            }
        }
    }, [visible, initialChar]);

    if (!visible) return null;

    const charList = Object.values(characters);
    const currentChar = characters[selectedChar];

    return (
        <div className="overlay visible" style={{ zIndex: 50 }}>
            <div className="modal-content" style={{ maxWidth: '800px', width: '95%', height: '90vh', display: 'flex', flexDirection: 'column' }}>
                <div className="cardHeader">
                    <h2>{t('selectCharacter')}</h2>
                    <button className="ghost" onClick={onBack}>✕</button>
                </div>

                <div className="cardBody" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden' }}>

                    {/* Character List */}
                    <div style={{
                        display: 'flex',
                        gap: '12px',
                        overflowX: 'auto',
                        padding: '8px',
                        minHeight: '120px',
                        borderBottom: '1px solid #eee'
                    }}>
                        {charList.map((char: any) => {
                            const owned = collection?.owned[char.key]?.owned;
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
                                        position: 'relative'
                                    }}
                                >
                                    <div style={{ fontSize: '32px' }}>{char.emoji}</div>
                                    {!owned && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', background: 'rgba(0,0,0,0.1)', borderRadius: '12px' }}>🔒</div>}
                                </div>
                            );
                        })}
                    </div>

                    {/* Details View */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto', padding: '16px' }}>
                        <div style={{ fontSize: '64px', marginBottom: '16px' }}>{currentChar.emoji}</div>
                        <h3 style={{ fontSize: '24px', marginBottom: '8px' }}>{t(`char_${selectedChar}_name` as any)}</h3>
                        <div className={`badge ${rarClass(currentChar.rar)}`} style={{ marginBottom: '16px' }}>{currentChar.rar}</div>

                        <p style={{ textAlign: 'center', marginBottom: '24px', maxWidth: '400px', lineHeight: '1.6' }}>
                            {t(`char_${selectedChar}_desc` as any)}
                        </p>

                        <div style={{ width: '100%', maxWidth: '400px', background: '#f8fafc', padding: '16px', borderRadius: '12px' }}>
                            <h4 style={{ marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>Stats</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                <div>🏃 Speed: {currentChar.move}</div>
                                <div>🦘 Jump: {currentChar.jump}</div>
                                <div>🔫 Bullet: {currentChar.bullet}</div>
                                <div>🛡️ Invincibility: {currentChar.inv}s</div>
                            </div>
                            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                                <strong>⚡ Ultimate:</strong> {currentChar.ult ? t(`ult_${currentChar.ult}_name` as any) : 'None'}
                                {currentChar.ult && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{t(`ult_${currentChar.ult}_desc` as any)}</div>}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="footerBtns" style={{ padding: '16px', borderTop: '1px solid #eee' }}>
                    <button className="secondary" onClick={onBack} style={{ flex: 1 }}>
                        {t('menu')}
                    </button>
                    <button className="primary" onClick={() => onStart(selectedChar)} style={{ flex: 2 }}>
                        {t('start')}
                    </button>
                </div>
            </div>
        </div>
    );
};
