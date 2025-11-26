import React, { useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { DailyBonusSystem } from '../../game-core/js/game/DailyBonusSystem';
import { GachaSystem } from '../../game-core/js/game/GachaSystem';
import { useSound } from '../../hooks/useSound';
import './DailyBonusModal.css';

interface DailyBonusModalProps {
    dailyBonusSystem: DailyBonusSystem;
    gachaSystem: GachaSystem;
    onClose: () => void;
    onClaim: () => void;
}

export const DailyBonusModal: React.FC<DailyBonusModalProps> = ({
    dailyBonusSystem,
    gachaSystem,
    onClose,
    onClaim
}) => {
    const { t } = useTranslation();
    const { playCoin } = useSound();
    const [claimed, setClaimed] = useState(false);

    const availability = dailyBonusSystem.checkAvailability();
    const currentDay = availability.day;
    const rewards = [50, 100, 150, 200, 300, 400, 1000];

    const handleClaim = () => {
        if (claimed) return;

        try {
            playCoin();
            dailyBonusSystem.claim(gachaSystem);
            setClaimed(true);
            onClaim();

            // Close after delay
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="daily-bonus-overlay">
            <div className="daily-bonus-content">
                <button className="close-button" onClick={onClose}>×</button>

                <div className="daily-bonus-header">
                    <h2>{t('dailyBonus')}</h2>
                    <p>{t('dailyBonusDesc')}</p>
                </div>

                <div className="daily-bonus-grid">
                    {rewards.map((reward, index) => {
                        const day = index + 1;
                        const isToday = (currentDay - 1) % 7 === index;
                        const isPast = (currentDay - 1) % 7 > index;
                        const isBig = index === 6;

                        // Determine status class
                        let statusClass = '';
                        if (isToday) statusClass = 'today';
                        else if (isPast) statusClass = 'claimed';
                        else statusClass = 'future';

                        return (
                            <div
                                key={index}
                                className={`daily-bonus-item ${statusClass} ${isBig ? 'big' : ''}`}
                            >
                                <div className="day-label">{t('day', { count: day })}</div>
                                <div className="reward-icon">{isBig ? '💰' : '🪙'}</div>
                                <div className="reward-amount">{reward}</div>
                                {isPast && <div className="check-mark">✓</div>}
                                {isToday && !claimed && <div className="today-badge">TODAY</div>}
                            </div>
                        );
                    })}
                </div>

                <div className="daily-bonus-actions">
                    {!claimed ? (
                        <button className="claim-button" onClick={handleClaim}>
                            {t('claim')}
                        </button>
                    ) : (
                        <div className="claimed-message">
                            {t('comeBackTomorrow')}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
