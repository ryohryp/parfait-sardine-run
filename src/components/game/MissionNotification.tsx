
import React, { useEffect, useState } from 'react';
import type { Mission } from '../../types/game';
import clsx from 'clsx';

interface MissionNotificationProps {
    mission: Mission | null;
    onClose: () => void;
}

export const MissionNotification: React.FC<MissionNotificationProps> = ({ mission, onClose }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (mission) {
            // Small delay to allow render before transition
            const t1 = setTimeout(() => setVisible(true), 10);
            const t2 = setTimeout(() => {
                setVisible(false);
                setTimeout(onClose, 300); // Wait for fade out
            }, 3000);
            return () => {
                clearTimeout(t1);
                clearTimeout(t2);
            };
        } else {
            setVisible(false);
        }
    }, [mission, onClose]);

    if (!mission) return null;

    return (
        <div className={clsx("mission-notification", { visible })}>
            <div className="mission-icon">🎯</div>
            <div className="mission-content">
                <div className="mission-title">MISSION COMPLETE!</div>
                <div className="mission-desc">{mission.description}</div>
                <div className="mission-reward">+{mission.reward} Coins</div>
            </div>
        </div>
    );
};
