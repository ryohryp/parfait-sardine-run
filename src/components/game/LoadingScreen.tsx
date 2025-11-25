import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import './LoadingScreen.css';

interface LoadingScreenProps {
    onComplete: () => void;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ onComplete }) => {
    const { t } = useTranslation();
    const [progress, setProgress] = useState(0);
    const [tipIndex, setTipIndex] = useState(0);
    const [isComplete, setIsComplete] = useState(false);

    const tips = [
        t('tipJump'),
        t('tipAttack'),
        t('tipCoins'),
        t('tipGacha'),
        t('tipCombo'),
        t('tipBoss'),
    ];

    useEffect(() => {
        // Simulate loading progress
        const interval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) {
                    clearInterval(interval);
                    setIsComplete(true);
                    setTimeout(() => {
                        onComplete();
                    }, 800); // Wait for fade out animation
                    return 100;
                }
                return prev + Math.random() * 15 + 5; // Random increment for realistic feel
            });
        }, 150);

        // Change tips every 2.5 seconds
        const tipInterval = setInterval(() => {
            setTipIndex((prev) => (prev + 1) % tips.length);
        }, 2500);

        return () => {
            clearInterval(interval);
            clearInterval(tipInterval);
        };
    }, [onComplete, tips.length]);

    return (
        <div className={`loading-screen ${isComplete ? 'fade-out' : ''}`}>
            {/* Background */}
            <div className="loading-background"></div>
            <div className="loading-overlay"></div>

            <div className="loading-content">
                {/* Logo */}
                <div className="loading-logo">
                    <h1 className="game-title-loading">
                        <span className="title-parfait">Parfait</span>
                        <span className="title-sardine">Sardine</span>
                        <span className="title-run">Run</span>
                    </h1>
                </div>

                {/* Character Animation */}
                <div className="loading-character-container">
                    <div className="loading-character-img"></div>
                    <div className="loading-shadow"></div>
                </div>

                {/* Progress Bar */}
                <div className="loading-progress-container">
                    <div className="loading-progress-bar">
                        <div
                            className="loading-progress-fill"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                        <div className="loading-progress-glare"></div>
                    </div>
                    <div className="loading-percentage">
                        {Math.floor(Math.min(progress, 100))}%
                    </div>
                </div>

                {/* Tips */}
                <div className="loading-tips">
                    <div className="tip-card">
                        <div className="tip-label">💡 {t('tip')}</div>
                        <div className="tip-text" key={tipIndex}>
                            {tips[tipIndex]}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="loading-footer">
                    <div className="loading-spinner"></div>
                    <span>NOW LOADING...</span>
                </div>
            </div>
        </div>
    );
};

export default LoadingScreen;
