import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFingerprint } from '../hooks/useFingerprint';
import { useTranslation } from '../hooks/useTranslation';
import { PageTransition } from '../components/common/PageTransition';

import { getBgmVolume, getSfxVolume, setBgmVolume, setSfxVolume } from '../game-core/js/audio.js';

interface SettingsPageProps {
    onClose?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onClose }) => {
    const { t } = useTranslation();
    const fingerprint = useFingerprint();
    const [showConfirm, setShowConfirm] = useState(false);

    const [bgmVol, setBgmVol] = useState(getBgmVolume() * 100);
    const [sfxVol, setSfxVol] = useState(getSfxVolume() * 100);

    const handleReset = () => {
        // Clear all game data
        const keysToRemove = [
            'psrun_fingerprint_v1',
            'psrun_coin_balance_v1',
            'psrun_char_collection_v1',
            'psrun_pity_v1',
            'psrun_character_progression_v1',
            'psrun_equipment_inventory_v1',
            'psrun_best_score_v1',
            'psrun_missions_v1',
            'psrun_achievements_v1',
            'psrun_daily_bonus_v1',
            'psrun_tutorial_completed',
            'psrun_history_v1',
            'psrun_language'
        ];

        keysToRemove.forEach(key => localStorage.removeItem(key));

        // Reload page
        window.location.reload();
    };

    const handleBgmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value, 10);
        setBgmVol(val);
        setBgmVolume(val / 100);
    };

    const handleSfxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value, 10);
        setSfxVol(val);
        setSfxVolume(val / 100);
    };

    return (
        <PageTransition transitionKey="settings">
            <div className="page-container">
                <div className="page-header">
                    <h1>{t('settings')}</h1>
                    {!onClose ? (
                        <Link to="/" className="ghost">{t('backToGame')}</Link>
                    ) : (
                        <button className="ghost" onClick={onClose}>{t('close')}</button>
                    )}
                </div>

                <div className="settings-section">
                    <h2>{t('volume')}</h2>
                    <div className="volume-control" style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '8px' }}>
                            {t('bgm')}: {bgmVol}%
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={bgmVol}
                            onChange={handleBgmChange}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="volume-control">
                        <label style={{ display: 'block', marginBottom: '8px' }}>
                            {t('sfx')}: {sfxVol}%
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={sfxVol}
                            onChange={handleSfxChange}
                            style={{ width: '100%' }}
                        />
                    </div>
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
