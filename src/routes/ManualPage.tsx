import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { useSound } from '../hooks/useSound';
import '../index.css';
import './ManualPage.css';

interface ManualPageProps {
    onClose?: () => void;
}

export const ManualPage: React.FC<ManualPageProps> = ({ onClose }) => {
    const { t } = useTranslation();
    const { playClick } = useSound();

    const scrollToSection = (id: string) => {
        playClick();
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div className="page-container page-transition-enter">
            <div className="page-header">
                <h1>{t('manual_title')}</h1>
                {!onClose && (
                    <Link to="/">
                        <button className="secondary" onClick={playClick}>
                            {t('backToGame')}
                        </button>
                    </Link>
                )}
                {onClose && (
                    <button className="secondary" onClick={() => { playClick(); onClose(); }}>
                        {t('close')}
                    </button>
                )}
            </div>

            <div className="manual-content">
                {/* Table of Contents */}
                <div className="manual-toc">
                    <h3>{t('menu')}</h3>
                    <ul>
                        <li onClick={() => scrollToSection('controls')}>{t('howToControlsTitle')}</li>
                        <li onClick={() => scrollToSection('system')}>{t('manual_combo_title')}</li>
                        <li onClick={() => scrollToSection('progression')}>{t('manual_progression_title')}</li>
                        <li onClick={() => scrollToSection('gacha')}>{t('howToGachaTitle')}</li>
                    </ul>
                </div>

                {/* Controls Section */}
                <section id="controls" className="manual-section">
                    <h2>{t('howToControlsTitle')}</h2>
                    <div className="manual-card">
                        <div className="manual-item">
                            <span className="manual-icon">🏃</span>
                            <div className="manual-text">
                                <h3>{t('howToJumpTitle')}</h3>
                                <p>{t('howToJump')}</p>
                            </div>
                        </div>
                        <div className="manual-item">
                            <span className="manual-icon">⚔️</span>
                            <div className="manual-text">
                                <h3>{t('howToAttackTitle')}</h3>
                                <p>{t('howToAttack')}</p>
                            </div>
                        </div>
                        <div className="manual-item">
                            <span className="manual-icon">💨</span>
                            <div className="manual-text">
                                <h3>{t('howToDashTitle')}</h3>
                                <p>{t('howToDash')}</p>
                            </div>
                        </div>
                        <div className="manual-item">
                            <span className="manual-icon">🛡️</span>
                            <div className="manual-text">
                                <h3>{t('howToGuardTitle')}</h3>
                                <p>{t('howToGuard')}</p>
                            </div>
                        </div>
                        <div className="manual-item">
                            <span className="manual-icon">🎁</span>
                            <div className="manual-text">
                                <h3>{t('howToItemsTitle')}</h3>
                                <p>{t('howToItems')}</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* System Section */}
                <section id="system" className="manual-section">
                    <h2>{t('manual_combo_title')} & {t('manual_boss_title')}</h2>
                    <div className="manual-card">
                        <div className="manual-item">
                            <span className="manual-icon">🔥</span>
                            <div className="manual-text">
                                <h3>{t('manual_combo_title')}</h3>
                                <p>{t('manual_combo_desc')}</p>
                            </div>
                        </div>
                        <div className="manual-item">
                            <span className="manual-icon">👹</span>
                            <div className="manual-text">
                                <h3>{t('manual_boss_title')}</h3>
                                <p>{t('manual_boss_desc')}</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Progression Section */}
                <section id="progression" className="manual-section">
                    <h2>{t('manual_progression_title')}</h2>
                    <div className="manual-card">
                        <div className="manual-item">
                            <span className="manual-icon">🆙</span>
                            <div className="manual-text">
                                <h3>{t('manual_level_title')}</h3>
                                <p>{t('manual_level_desc')}</p>
                            </div>
                        </div>
                        <div className="manual-item">
                            <span className="manual-icon">🌳</span>
                            <div className="manual-text">
                                <h3>{t('manual_skill_title')}</h3>
                                <p>{t('manual_skill_desc')}</p>
                            </div>
                        </div>
                        <div className="manual-item">
                            <span className="manual-icon">🛡️</span>
                            <div className="manual-text">
                                <h3>{t('manual_equip_title')}</h3>
                                <p>{t('manual_equip_desc')}</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Gacha Section */}
                <section id="gacha" className="manual-section">
                    <h2>{t('howToGachaTitle')}</h2>
                    <div className="manual-card">
                        <p>{t('howToGacha')}</p>
                        <div className="manual-rates">
                            <h4>{t('ratesTitle')}</h4>
                            <ul>
                                <li><span className="rarity-m">M</span> {t('rateM')}</li>
                                <li><span className="rarity-l">L</span> {t('rateL')}</li>
                                <li><span className="rarity-e">E</span> {t('rateE')}</li>
                                <li><span className="rarity-r">R</span> {t('rateR')}</li>
                                <li><span className="rarity-c">C</span> {t('rateC')}</li>
                            </ul>
                        </div>
                        <div className="manual-pity">
                            <h4>{t('pityTitle')}</h4>
                            <p>{t('pityDescL')}</p>
                            <p>{t('pityDescM')}</p>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};
