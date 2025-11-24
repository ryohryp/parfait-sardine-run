import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';

interface HowToModalProps {
    visible: boolean;
    onClose: () => void;
}

export const HowToModal: React.FC<HowToModalProps> = ({ visible, onClose }) => {
    const { t } = useTranslation();

    if (!visible) return null;

    return (
        <div className="overlay visible" onClick={onClose} style={{ zIndex: 1000, pointerEvents: 'auto' }}>
            <div className="cardWrap preGameCard" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                <div className="cardHeader">
                    <h2>{t('howToTitle')}</h2>
                    <button className="ghost" onClick={onClose}>✕</button>
                </div>

                <div className="cardBody" style={{ maxHeight: '70vh', overflowY: 'auto', background: '#fff' }}>
                    <div style={{ padding: '16px' }}>
                        <p style={{ marginBottom: '20px', fontSize: '15px', lineHeight: '1.6' }}>
                            {t('howToDesc')}
                        </p>

                        <div style={{ marginBottom: '24px' }}>
                            <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#60a5fa' }}>{t('howToControlsTitle')}</h3>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                <li style={{ marginBottom: '12px', paddingLeft: '8px', borderLeft: '3px solid #60a5fa' }}>
                                    <strong>{t('howToJumpTitle')}:</strong> {t('howToJump')}
                                </li>
                                <li style={{ marginBottom: '12px', paddingLeft: '8px', borderLeft: '3px solid #60a5fa' }}>
                                    <strong>{t('howToAttackTitle')}:</strong> {t('howToAttack')}
                                </li>
                                <li style={{ marginBottom: '12px', paddingLeft: '8px', borderLeft: '3px solid #60a5fa' }}>
                                    <strong>{t('howToItemsTitle')}:</strong> {t('howToItems')}
                                </li>
                                <li style={{ marginBottom: '12px', paddingLeft: '8px', borderLeft: '3px solid #60a5fa' }}>
                                    <strong>{t('howToGachaTitle')}:</strong> {t('howToGacha')}
                                </li>
                            </ul>
                        </div>

                        <div style={{ padding: '12px', backgroundColor: 'rgba(96, 165, 250, 0.1)', borderRadius: '8px', border: '1px solid rgba(96, 165, 250, 0.3)' }}>
                            <p style={{ margin: 0, fontSize: '13px', color: '#93c5fd' }}>
                                {t('howToHint')}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="footerBtns">
                    <button className="cta" onClick={onClose}>
                        {t('close')}
                    </button>
                </div>
            </div>
        </div>
    );
};
