import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { AchievementSystem } from '../../game-core/js/game/AchievementSystem';
import type { Achievement } from '../../game-core/js/game/AchievementSystem';
import './AchievementModal.css';

interface AchievementModalProps {
    achievementSystem: AchievementSystem;
    onClose: () => void;
}

export const AchievementModal: React.FC<AchievementModalProps> = ({ achievementSystem, onClose }) => {
    const { t } = useTranslation();
    const progress = achievementSystem.getProgress();

    return (
        <div className="achievement-modal-overlay" onClick={onClose}>
            <div className="achievement-modal-content" onClick={e => e.stopPropagation()}>
                <div className="achievement-modal-header">
                    <h2>{t('achievements')}</h2>
                    <button className="close-button" onClick={onClose}>&times;</button>
                </div>

                <div className="achievement-progress-summary">
                    <div className="progress-bar-container">
                        <div
                            className="progress-bar-fill"
                            style={{ width: `${(progress.unlockedCount / progress.totalCount) * 100}%` }}
                        />
                    </div>
                    <div className="progress-text">
                        {progress.unlockedCount} / {progress.totalCount}
                    </div>
                </div>

                <div className="achievement-list">
                    {achievementSystem.achievements.map((ach: Achievement) => {
                        const isUnlocked = achievementSystem.isUnlocked(ach.id);
                        return (
                            <div key={ach.id} className={`achievement-item ${isUnlocked ? 'unlocked' : 'locked'}`}>
                                <div className="achievement-item-icon">
                                    {isUnlocked ? ach.icon : '🔒'}
                                </div>
                                <div className="achievement-item-content">
                                    <div className="achievement-item-header">
                                        <h3>{t(ach.titleKey as any)}</h3>
                                        {isUnlocked && <span className="achievement-check">✓</span>}
                                    </div>
                                    <p>{t(ach.descKey as any)}</p>
                                    <div className="achievement-item-reward">
                                        Reward: {ach.reward} 🪙
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
