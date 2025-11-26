import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import './TutorialOverlay.css';

export type TutorialStep = 'jump' | 'attack' | 'dash' | 'guard' | 'complete';

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
            case 'dash':
                return {
                    title: t('tutorial_dash_title'),
                    desc: t('tutorial_dash_desc'),
                    action: t('tutorial_swipe_right')
                };
            case 'guard':
                return {
                    title: t('tutorial_guard_title'),
                    desc: t('tutorial_guard_desc'),
                    action: t('tutorial_swipe_left')
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
                    {step === 'jump' && '1/4'}
                    {step === 'attack' && '2/4'}
                    {step === 'dash' && '3/4'}
                    {step === 'guard' && '4/4'}
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

            {/* Visual Hints */}
            {step === 'attack' && <div className="tutorial-arrow attack-arrow">⬇️</div>}
            {step === 'dash' && <div className="tutorial-arrow dash-arrow">➡️</div>}
            {step === 'guard' && <div className="tutorial-arrow guard-arrow">⬅️</div>}
        </div>
    );
};
