import React, { useEffect, useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { useSound } from '../../hooks/useSound';
import './AchievementNotification.css';

interface AchievementNotificationProps {
    title: string;
    description: string;
    icon: string;
    reward: number;
    onClose: () => void;
}

export const AchievementNotification: React.FC<AchievementNotificationProps> = ({
    title,
    description,
    icon,
    reward,
    onClose
}) => {
    const { t } = useTranslation();
    const { playAchievement } = useSound();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // Play sound
        playAchievement();

        // Show notification
        const showTimer = setTimeout(() => setVisible(true), 100);

        // Hide notification
        const hideTimer = setTimeout(() => {
            setVisible(false);
            setTimeout(onClose, 500); // Wait for animation
        }, 4000);

        return () => {
            clearTimeout(showTimer);
            clearTimeout(hideTimer);
        };
    }, [onClose]);

    return (
        <div className={`achievement-notification ${visible ? 'visible' : ''}`}>
            <div className="achievement-icon">{icon}</div>
            <div className="achievement-content">
                <div className="achievement-header">
                    <span className="achievement-label">{t('ach_unlocked')}</span>
                    <span className="achievement-reward">+{reward} 🪙</span>
                </div>
                <h3 className="achievement-title">{title}</h3>
                <p className="achievement-desc">{description}</p>
            </div>
        </div>
    );
};
