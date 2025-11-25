import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GachaModal } from './GachaModal';
import { CharacterSelectModal } from './CharacterSelectModal';
import { SkillTreeModal } from './SkillTreeModal';
import { EquipmentModal } from './EquipmentModal';
import { AchievementModal } from './AchievementModal';
import { DailyBonusModal } from './DailyBonusModal';
import { useTranslation } from '../../hooks/useTranslation';
import { GachaSystem } from '../../game-core/js/game/GachaSystem.js';
import { AchievementSystem } from '../../game-core/js/game/AchievementSystem';
import { DailyBonusSystem } from '../../game-core/js/game/DailyBonusSystem';
import { useSound } from '../../hooks/useSound';
import './TitleScreen.css';

interface StartScreenProps {
    onStart: (characterKey: string, playerName: string) => void;
    visible: boolean;
    gachaSystem: GachaSystem;
    achievementSystem: AchievementSystem;
    dailyBonusSystem: DailyBonusSystem;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStart, visible, gachaSystem, achievementSystem, dailyBonusSystem }) => {
    const { t } = useTranslation();
    const { playClick } = useSound();
    const navigate = useNavigate();

    const [viewState, setViewState] = useState<'title' | 'menu'>('title');
    const [showGacha, setShowGacha] = useState(false);
    const [showCharSelect, setShowCharSelect] = useState(false);
    const [showSkillTree, setShowSkillTree] = useState(false);
    const [showEquipment, setShowEquipment] = useState(false);
    const [showAchievements, setShowAchievements] = useState(false);
    const [showDailyBonus, setShowDailyBonus] = useState(false);
    const [selectedCharForProgression, setSelectedCharForProgression] = useState('parfen');
    const [playerName] = useState(() => localStorage.getItem('psrun_player_name_v1') || 'プレイヤー');
    const [coins, setCoins] = useState(0);

    React.useEffect(() => {
        if (visible) {
            setCoins(gachaSystem.loadCoinBalance());
            setViewState('title'); // Reset to title screen when visible

            // Check daily bonus
            const availability = dailyBonusSystem.checkAvailability();
            if (availability.available) {
                setTimeout(() => setShowDailyBonus(true), 800);
            }
        }
    }, [visible, gachaSystem, dailyBonusSystem]);

    const handleScreenClick = () => {
        if (viewState === 'title') {
            playClick();
            setViewState('menu');
        }
    };

    const handlePlayClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        playClick();
        setShowCharSelect(true);
    };

    const handleGameStart = (characterKey: string) => {
        localStorage.setItem('psrun_selected_char', characterKey);
        setShowCharSelect(false);
        onStart(characterKey, playerName);
    };

    const updateGachaState = () => {
        const currentCoins = gachaSystem.loadCoinBalance();
        gachaSystem.saveCoinBalance(currentCoins);
        setCoins(currentCoins);
    };

    if (!visible) return null;

    return (
        <>
            <div className={`title-screen-container ${viewState === 'menu' ? 'menu-mode' : ''}`} onClick={handleScreenClick}>
                <div className="title-screen-content">
                    {/* Background */}
                    <div className="title-background"></div>

                    {/* Character */}
                    <div className={`title-character ${viewState === 'menu' ? 'minimized' : ''}`}></div>

                    {/* Logo */}
                    <h1 className={`title-logo ${viewState === 'menu' ? 'minimized' : ''}`}>{t('gameTitle')}</h1>

                    {/* Title Screen View */}
                    {viewState === 'title' && (
                        <div className="tap-to-start">
                            TAP TO START
                        </div>
                    )}

                    {/* Main Menu View */}
                    {viewState === 'menu' && (
                        <div className="main-menu-container" onClick={(e) => e.stopPropagation()}>
                            <div className="main-actions">
                                <button className="title-btn title-btn-play" onClick={handlePlayClick}>
                                    <span className="btn-icon">🎮</span>
                                    <span className="btn-text">プレイ</span>
                                </button>
                                <button className="title-btn title-btn-gacha" onClick={(e) => { e.stopPropagation(); playClick(); setShowGacha(true); }}>
                                    <span className="btn-icon">💰</span>
                                    <span className="btn-text">ガチャ</span>
                                    <span className="coin-badge">{coins} G</span>
                                </button>
                            </div>

                            <div className="sub-actions">
                                <button className="sub-btn" onClick={(e) => { e.stopPropagation(); playClick(); navigate('/manual'); }}>
                                    <span className="btn-icon">📖</span>
                                    <span className="btn-label">{t('howToPlay')}</span>
                                </button>
                                <button className="sub-btn" onClick={(e) => { e.stopPropagation(); playClick(); navigate('/leaderboard'); }}>
                                    <span className="btn-icon">🏆</span>
                                    <span className="btn-label">{t('ranking')}</span>
                                </button>
                                <button className="sub-btn" onClick={(e) => { e.stopPropagation(); playClick(); setShowAchievements(true); }}>
                                    <span className="btn-icon">🏅</span>
                                    <span className="btn-label">{t('achievements')}</span>
                                </button>
                                <button className="sub-btn" onClick={(e) => { e.stopPropagation(); playClick(); navigate('/settings'); }}>
                                    <span className="btn-icon">⚙️</span>
                                    <span className="btn-label">{t('settings')}</span>
                                </button>
                            </div>

                            <div className="extra-actions">
                                <button className="text-btn" onClick={(e) => { e.stopPropagation(); playClick(); navigate('/history'); }}>{t('history')}</button>
                                <button className="text-btn" onClick={(e) => { e.stopPropagation(); playClick(); navigate('/stats'); }}>{t('stats')}</button>
                                <button className="text-btn" onClick={(e) => { e.stopPropagation(); playClick(); navigate('/comments'); }}>{t('comments')}</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <GachaModal
                visible={showGacha}
                onClose={() => { setShowGacha(false); updateGachaState(); }}
                gachaSystem={gachaSystem}
                onUpdate={updateGachaState}
            />
            <CharacterSelectModal
                visible={showCharSelect}
                onStart={handleGameStart}
                onBack={() => setShowCharSelect(false)}
                gachaSystem={gachaSystem}
                initialChar={localStorage.getItem('psrun_selected_char') || 'parfen'}
                onOpenSkillTree={(charKey) => { setSelectedCharForProgression(charKey); setShowSkillTree(true); }}
                onOpenEquipment={(charKey) => { setSelectedCharForProgression(charKey); setShowEquipment(true); }}
            />
            <SkillTreeModal
                visible={showSkillTree}
                characterKey={selectedCharForProgression}
                onClose={() => setShowSkillTree(false)}
                progression={gachaSystem.progression}
            />
            <EquipmentModal
                visible={showEquipment}
                characterKey={selectedCharForProgression}
                onClose={() => setShowEquipment(false)}
                progression={gachaSystem.progression}
            />
            {showAchievements && (
                <AchievementModal
                    achievementSystem={achievementSystem}
                    onClose={() => setShowAchievements(false)}
                />
            )}
            {showDailyBonus && (
                <DailyBonusModal
                    dailyBonusSystem={dailyBonusSystem}
                    gachaSystem={gachaSystem}
                    onClose={() => setShowDailyBonus(false)}
                    onClaim={() => updateGachaState()}
                />
            )}
        </>
    );
};
