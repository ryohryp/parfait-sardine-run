import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFingerprint } from '../hooks/useFingerprint';
import { useTranslation } from '../hooks/useTranslation';
import { PageTransition } from '../components/common/PageTransition';

export const SettingsPage: React.FC = () => {
    const { t } = useTranslation();
    const fingerprint = useFingerprint();
    const [showConfirm, setShowConfirm] = useState(false);

    const handleReset = () => {
        localStorage.removeItem('psrun_fingerprint_v1');
        window.location.reload();
    };

    return (
        <PageTransition transitionKey="settings">
            <div className="page-container">
                <div className="page-header">
                    <h1>{t('settings')}</h1>
                    <Link to="/" className="ghost">{t('backToGame')}</Link>
                </div>

                <div className="settings-section">
                    <h2>{t('userId')}</h2>
                    <p className="muted">
                        {t('userIdDesc')}
                    </p>
                    <div className="fingerprint-display">
                        <code>{fingerprint || t('loading')}</code>
                    </div>

                    <div className="danger-zone">
                        <h3>{t('resetData')}</h3>
                        <p>{t('resetDesc')}</p>

                        {!showConfirm ? (
                            <button className="warn" onClick={() => setShowConfirm(true)}>
                                {t('resetData')}
                            </button>
                        ) : (
                            <div className="confirm-actions">
                                <p className="warn-text">{t('resetConfirmTitle')} {t('resetConfirmDesc')}</p>
                                <button className="warn" onClick={handleReset}>{t('resetButton')}</button>
                                <button className="ghost" onClick={() => setShowConfirm(false)}>{t('cancel')}</button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="settings-section">
                    <h2>{t('version')}</h2>
                    <p>Parfait & Sardine Run! React Edition v1.0.0</p>
                </div>
            </div>
        </PageTransition>
    );
};
