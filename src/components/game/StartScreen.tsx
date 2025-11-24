import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HowToModal } from './HowToModal';
import { GachaModal } from './GachaModal';
import { CharacterSelectModal } from './CharacterSelectModal';
import { useTranslation } from '../../hooks/useTranslation';
import { GachaSystem } from '../../game-core/js/game/GachaSystem.js';

interface StartScreenProps {
    onStart: (characterKey: string, playerName: string) => void;
    visible: boolean;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStart, visible }) => {
    const { t, language, setLanguage } = useTranslation();
    const [showHowTo, setShowHowTo] = useState(false);
    const [showGacha, setShowGacha] = useState(false);
    const [showCharSelect, setShowCharSelect] = useState(false);
    const [playerName, setPlayerName] = useState('');
    const [gachaSystem] = useState(() => new GachaSystem());
    const [coins, setCoins] = useState(0);

    useEffect(() => {
        if (visible) {
            const savedName = localStorage.getItem('psrun_player_name_v1');
            if (savedName) setPlayerName(savedName);
            updateGachaState();
        }
    }, [visible]);

    const updateGachaState = () => {
        const currentCoins = gachaSystem.loadCoinBalance();
        gachaSystem.coins = currentCoins;
        setCoins(currentCoins);
    };

    const handleStartClick = () => {
        if (!playerName.trim()) {
            alert(t('enterName'));
            return;
        }
        localStorage.setItem('psrun_player_name_v1', playerName);
        setShowCharSelect(true);
    };

    const handleGameStart = (characterKey: string) => {
        setShowCharSelect(false);
        onStart(characterKey, playerName);
    };

    const toggleLanguage = () => {
        setLanguage(language === 'en' ? 'ja' : 'en');
    };

    if (!visible) return null;

    return (
        <>
            <div className="start-screen-container">
                <div className="start-screen-content">
                    {/* Language Toggle */}
                    <button
                        onClick={toggleLanguage}
                        style={{
                            position: 'absolute',
                            top: '16px',
                            right: '16px',
                            background: 'transparent',
                            border: '1px solid #cbd5e1',
                            borderRadius: '20px',
                            padding: '4px 12px',
                            fontSize: '12px',
                            cursor: 'pointer'
                        }}
                    >
                        {language === 'en' ? '🇯🇵 日本語' : '🇺🇸 English'}
                    </button>

                    <h1 style={{ marginTop: '24px' }}>{t('gameTitle')}</h1>
                    <p style={{ opacity: 0.8 }}>{t('ready')}</p>

                    {/* Player Name Input */}
                    <div style={{ width: '100%', textAlign: 'left' }}>
                        <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px', display: 'block' }}>
                            {t('playerName')}
                        </label>
                        <input
                            type="text"
                            value={playerName}
                            onChange={(e) => setPlayerName(e.target.value)}
                            placeholder={t('enterName')}
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                fontSize: '16px'
                            }}
                        />
                    </div>

                    {/* Coin Display */}
                    <div style={{ width: '100%', textAlign: 'right', fontSize: '14px', fontWeight: 'bold', color: '#f59e0b' }}>
                        💰 {coins}
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', width: '100%' }}>
                        <button
                            onClick={handleStartClick}
                            className="primary"
                            style={{ flex: 2, fontSize: '18px', padding: '16px' }}
                        >
                            {t('start')}
                        </button>
                        <button
                            className="secondary"
                            onClick={() => setShowGacha(true)}
                            style={{ flex: 1, fontSize: '14px', padding: '16px', background: '#f59e0b', color: 'white', border: 'none' }}
                        >
                            {t('gacha')}
                        </button>
                    </div>

                    <button className="secondary" onClick={() => setShowHowTo(true)} style={{ width: '100%' }}>
                        {t('howToPlay')}
                    </button>

                    {/* Navigation Links */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%', marginTop: '8px' }}>
                        <Link to="/leaderboard"><button className="secondary" style={{ width: '100%', fontSize: '14px' }}>{t('ranking')}</button></Link>
                        <Link to="/comments"><button className="secondary" style={{ width: '100%', fontSize: '14px' }}>{t('comments')}</button></Link>
                        <Link to="/history"><button className="secondary" style={{ width: '100%', fontSize: '14px' }}>{t('history')}</button></Link>
                        <Link to="/stats"><button className="secondary" style={{ width: '100%', fontSize: '14px' }}>{t('stats')}</button></Link>
                    </div>

                    <Link to="/settings" style={{ width: '100%' }}>
                        <button className="secondary" style={{ width: '100%', fontSize: '14px' }}>{t('settings')}</button>
                    </Link>
                </div>
            </div>

            {/* Modals */}
            <HowToModal visible={showHowTo} onClose={() => setShowHowTo(false)} />
            <GachaModal
                visible={showGacha}
                onClose={() => {
                    setShowGacha(false);
                    updateGachaState();
                }}
                gachaSystem={gachaSystem}
                onUpdate={updateGachaState}
            />
            <CharacterSelectModal
                visible={showCharSelect}
                onStart={handleGameStart}
                onBack={() => setShowCharSelect(false)}
                gachaSystem={gachaSystem}
            />
        </>
    );
};
