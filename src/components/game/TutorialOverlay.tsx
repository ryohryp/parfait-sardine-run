import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import './TutorialOverlay.css';

export type TutorialStep = 'jump' | 'attack' | 'complete';

interface TutorialOverlayProps {
    step: TutorialStep;
    onNext: () => void;
    onSkip: () => void;
    visible: boolean;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ step, onNext, onSkip, visible }) => {
    const { t } = useTranslation();

    if (!visible) return null;

    const getContent = () => {
        switch (step) {
            case 'jump':
                return {
                    title: t('tutorial_jump_title'),
                    desc: t('tutorial_jump_desc'),
                    action: t('tutorial_tap_screen')
                };
            case 'attack':
                return {
                    title: t('tutorial_attack_title'),
                    desc: t('tutorial_attack_desc'),
                    action: t('tutorial_tap_attack')
                };
            case 'complete':
                return {
                    title: t('tutorial_complete_title'),
                    desc: t('tutorial_complete_desc'),
                    action: t('tutorial_lets_go')
                };
            default:
                return { title: '', desc: '', action: '' };
        }
    };

    const content = getContent();

    return (
        <div className="tutorial-overlay" onClick={onNext}>
            <div className="tutorial-content">
                <div className="tutorial-step-indicator">
                    {step === 'jump' && '1/2'}
                    {step === 'attack' && '2/2'}
                    {step === 'complete' && '🎉'}
                </div>
                <h2>{content.title}</h2>
                <p>{content.desc}</p>
                <div className="tutorial-action">
                    <span className="blink">▼ {content.action}</span>
                </div>
            </div>

            {step !== 'complete' && (
                <button
                    className="ghost"
                    onClick={(e) => { e.stopPropagation(); onSkip(); }}
                    style={{
                        position: 'absolute',
                        top: '20px',
                        right: '20px',
                        color: '#fff',
                        borderColor: '#fff',
                        zIndex: 1001
                    }}
                >
                    {t('skip')}
                </button>
            )}

            {/* Visual Hints (Optional: could add arrows pointing to buttons) */}
            {step === 'attack' && <div className="tutorial-arrow attack-arrow">⬇️</div>}
        </div>
    );
};
