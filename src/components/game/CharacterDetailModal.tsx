import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { rarClass, SPECIAL_LABELS } from '../../game-core/js/game-data/characters.js';
import { GachaSystem } from '../../game-core/js/game/GachaSystem.js';
import './CharacterDetailModal.css';

interface CharacterDetailModalProps {
    characterKey: string;
    characterData: any; // Character object from characters.js
    gachaSystem: GachaSystem;
    onClose: () => void;
}

export const CharacterDetailModal: React.FC<CharacterDetailModalProps> = ({
    characterKey,
    characterData,
    gachaSystem,
    onClose
}) => {
    const { t } = useTranslation();
    const progression = gachaSystem.progression?.getCharacterData(characterKey);
    const owned = !!progression;

    // Calculate max stats (for bar display)
    // These are arbitrary max values for visualization
    const MAX_STATS = {
        move: 1.5,
        jump: 1.5,
        bullet: 1.5,
        inv: 3.0,
        ultRate: 2.0
    };

    const renderStatBar = (label: string, value: number, max: number, icon: string) => {
        const percentage = Math.min((value / max) * 100, 100);
        return (
            <div className="stat-row">
                <div className="stat-label">
                    <span className="stat-icon">{icon}</span>
                    <span className="stat-name">{label}</span>
                </div>
                <div className="stat-bar-container">
                    <div
                        className="stat-bar-fill"
                        style={{ width: `${percentage}%` }}
                    ></div>
                    <span className="stat-value">{value.toFixed(2)}</span>
                </div>
            </div>
        );
    };

    return (
        <div className="character-detail-overlay" onClick={onClose}>
            <div className="character-detail-content" onClick={e => e.stopPropagation()}>
                <button className="close-button" onClick={onClose}>×</button>

                <div className="detail-header">
                    <div className={`detail-icon-container ${rarClass(characterData.rar)}`}>
                        <div className="detail-emoji">{characterData.emoji}</div>
                        <div className="detail-rarity">{characterData.rar}</div>
                    </div>
                    <div className="detail-title">
                        <h2>{t(`char_${characterKey}_name` as any)}</h2>
                        {owned && progression && (
                            <div className="detail-level">
                                Lv. {progression.level}
                            </div>
                        )}
                    </div>
                </div>

                <div className="detail-body">
                    <div className="detail-section">
                        <h3>{t('stats')}</h3>
                        <div className="stats-grid">
                            {renderStatBar('Speed', characterData.move, MAX_STATS.move, '🏃')}
                            {renderStatBar('Jump', characterData.jump, MAX_STATS.jump, '🦘')}
                            {renderStatBar('Bullet', characterData.bullet, MAX_STATS.bullet, '🔫')}
                            {renderStatBar('Invincibility', characterData.inv, MAX_STATS.inv, '🛡️')}
                            {renderStatBar('Ult Charge', characterData.ultRate, MAX_STATS.ultRate, '⚡')}
                        </div>
                    </div>

                    <div className="detail-section">
                        <h3>{t('specialAbilities')}</h3>
                        <div className="special-list">
                            {characterData.special && characterData.special.length > 0 ? (
                                characterData.special.map((spec: string) => (
                                    <div key={spec} className="special-tag">
                                        {t(`special_${spec}` as any) || SPECIAL_LABELS[spec] || spec}
                                    </div>
                                ))
                            ) : (
                                <div className="no-special">{t('none')}</div>
                            )}
                        </div>
                    </div>

                    <div className="detail-section">
                        <h3>{t('ultimate')}</h3>
                        {characterData.ult ? (
                            <div className="ult-info">
                                <div className="ult-name">{t(`ult_${characterData.ult}_name` as any)}</div>
                                <div className="ult-desc">{t(`ult_${characterData.ult}_desc` as any)}</div>
                            </div>
                        ) : (
                            <div className="no-special">{t('none')}</div>
                        )}
                    </div>

                    <div className="detail-description">
                        <p>{t(`char_${characterKey}_desc` as any)}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
