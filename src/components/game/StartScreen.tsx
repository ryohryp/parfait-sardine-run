import React, { useState } from 'react';
import { GachaModal } from './GachaModal';
import { CharacterSelectModal } from './CharacterSelectModal';
import { SkillTreeModal } from './SkillTreeModal';
import { EquipmentModal } from './EquipmentModal';
import { AchievementModal } from './AchievementModal';
import { DailyBonusModal } from './DailyBonusModal';
import { PictureBookModal } from './PictureBookModal';
import { ModalWrapper } from '../common/ModalWrapper';
import { ManualPage } from '../../routes/ManualPage';
import { LeaderboardPage } from '../../routes/LeaderboardPage';
import { SettingsPage } from '../../routes/SettingsPage';
import { HistoryPage } from '../../routes/HistoryPage';
import { StatsPage } from '../../routes/StatsPage';
import { CommentsPage } from '../../routes/CommentsPage';
import { useTranslation } from '../../hooks/useTranslation';
import { GachaSystem } from '../../game-core/js/game/GachaSystem.js';
import { AchievementSystem } from '../../game-core/js/game/AchievementSystem';
import { DailyBonusSystem } from '../../game-core/js/game/DailyBonusSystem';
import { useSound } from '../../hooks/useSound';
import './TitleScreen.css';
import { stages } from '../../game-core/js/game-data/stages';

interface StartScreenProps {
    onStart: (characterKey: string, playerName: string, startStageIndex?: number) => void;
    visible: boolean;
    gachaSystem: GachaSystem;
    achievementSystem: AchievementSystem;
    dailyBonusSystem: DailyBonusSystem;
    initialView?: 'title' | 'menu';
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStart, visible, gachaSystem, achievementSystem, dailyBonusSystem, initialView = 'title' }) => {
    const { t } = useTranslation();
    const { playClick } = useSound();

    const [viewState, setViewState] = useState<'title' | 'menu'>('title');
    const [showGacha, setShowGacha] = useState(false);
    const [showCharSelect, setShowCharSelect] = useState(false);
    const [showSkillTree, setShowSkillTree] = useState(false);
    const [showEquipment, setShowEquipment] = useState(false);
    const [showAchievements, setShowAchievements] = useState(false);
    const [showDailyBonus, setShowDailyBonus] = useState(false);
    const [showPictureBook, setShowPictureBook] = useState(false);

    // New modal states
    const [showManual, setShowManual] = useState(false);
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [showStats, setShowStats] = useState(false);
    const [showComments, setShowComments] = useState(false);

    const [selectedCharForProgression, setSelectedCharForProgression] = useState('parfen');
    const [playerName, setPlayerName] = useState(() => localStorage.getItem('psrun_player_name_v1') || 'プレイヤー');
    const [coins, setCoins] = useState(0);

    // Debug: Stage Selection
    const [debugStartStage, setDebugStartStage] = useState(0);
    const isDev = import.meta.env.DEV;

    React.useEffect(() => {
        if (visible) {
            setCoins(gachaSystem.loadCoinBalance());
            setViewState(initialView); // Reset to specified initial view when visible
        }
    }, [visible, gachaSystem, initialView]);

    // Check daily bonus when entering menu
    React.useEffect(() => {
        if (visible && viewState === 'menu') {
            const availability = dailyBonusSystem.checkAvailability();
            if (availability.available) {
                setTimeout(() => setShowDailyBonus(true), 800);
            }
        }
    }, [visible, viewState, dailyBonusSystem]);

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
        setShowCharSelect(false);
        onStart(characterKey, playerName, debugStartStage);
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
                            <div className="player-name-input-container">
                                <input
                                    type="text"
                                    className="player-name-input"
                                    placeholder={t('enterName')}
                                    value={playerName}
                                    onChange={(e) => {
                                        const newName = e.target.value;
                                        setPlayerName(newName);
                                        localStorage.setItem('psrun_player_name_v1', newName);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>

                            {/* Debug Stage Selector */}
                            {isDev && (
                                <div style={{
                                    position: 'absolute',
                                    top: '10px',
                                    left: '10px',
                                    zIndex: 1000,
                                    background: 'rgba(0,0,0,0.7)',
                                    padding: '5px',
                                    borderRadius: '5px',
                                    color: 'white',
                                    fontSize: '12px'
                                }}>
                                    <label>
                                        Debug Start Stage:
                                        <select
                                            value={debugStartStage}
                                            onChange={(e) => setDebugStartStage(Number(e.target.value))}
                                            style={{ marginLeft: '5px', color: 'black' }}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {stages.map((stage, index) => (
                                                <option key={stage.key} value={index}>
                                                    {index + 1}: {stage.name} ({stage.key})
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                </div>
                            )}

                            <div className="main-actions">
                                <button className="title-btn title-btn-play" onClick={handlePlayClick}>
                                    <span className="btn-icon">🎮</span>
                                    <span className="btn-text">プレイ</span>
                                </button>
                                <button className="title-btn title-btn-gacha" onClick={(e) => { e.stopPropagation(); playClick(); setShowGacha(true); }}>
                                    <span className="btn-icon">💰</span>
                                    <span className="btn-text">ガチャ</span>
                                    <span className="coin-badge">{coins} コイン</span>
                                </button>
                            </div>

                            <div className="sub-actions">
                                <button className="sub-btn" onClick={(e) => { e.stopPropagation(); playClick(); setShowManual(true); }}>
                                    <span className="btn-icon">📖</span>
                                    <span className="btn-label">{t('howToPlay')}</span>
                                </button>
                                <button className="sub-btn" onClick={(e) => { e.stopPropagation(); playClick(); setShowLeaderboard(true); }}>
                                    <span className="btn-icon">🏆</span>
                                    <span className="btn-label">{t('ranking')}</span>
                                </button>
                                <button className="sub-btn" onClick={(e) => { e.stopPropagation(); playClick(); setShowAchievements(true); }}>
                                    <span className="btn-icon">🏅</span>
                                    <span className="btn-label">{t('achievements')}</span>
                                </button>
                                <button className="sub-btn" onClick={(e) => { e.stopPropagation(); playClick(); setShowPictureBook(true); }}>
                                    <span className="btn-icon">📒</span>
                                    <span className="btn-label">図鑑</span>
                                </button>
                                <button className="sub-btn" onClick={(e) => { e.stopPropagation(); playClick(); setShowSettings(true); }}>
                                    <span className="btn-icon">⚙️</span>
                                    <span className="btn-label">{t('settings')}</span>
                                </button>
                            </div>

                            <div className="extra-actions">
                                <button className="text-btn" onClick={(e) => { e.stopPropagation(); playClick(); setShowHistory(true); }}>{t('history')}</button>
                                <button className="text-btn" onClick={(e) => { e.stopPropagation(); playClick(); setShowStats(true); }}>{t('stats')}</button>
                                <button className="text-btn" onClick={(e) => { e.stopPropagation(); playClick(); setShowComments(true); }}>{t('comments')}</button>
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
            <PictureBookModal
                visible={showPictureBook}
                onClose={() => setShowPictureBook(false)}
            />

            {/* Page Modals */}
            <ModalWrapper visible={showManual} onClose={() => setShowManual(false)} title={t('howToPlay')}>
                <ManualPage onClose={() => setShowManual(false)} />
            </ModalWrapper>

            <ModalWrapper visible={showLeaderboard} onClose={() => setShowLeaderboard(false)} title={t('ranking')}>
                <LeaderboardPage onClose={() => setShowLeaderboard(false)} />
            </ModalWrapper>

            <ModalWrapper visible={showSettings} onClose={() => setShowSettings(false)} title={t('settings')}>
                <SettingsPage onClose={() => setShowSettings(false)} />
            </ModalWrapper>

            <ModalWrapper visible={showHistory} onClose={() => setShowHistory(false)} title={t('history')}>
                <HistoryPage onClose={() => setShowHistory(false)} />
            </ModalWrapper>

            <ModalWrapper visible={showStats} onClose={() => setShowStats(false)} title={t('stats')}>
                <StatsPage onClose={() => setShowStats(false)} />
            </ModalWrapper>

            <ModalWrapper visible={showComments} onClose={() => setShowComments(false)} title={t('comments')}>
                <CommentsPage onClose={() => setShowComments(false)} />
            </ModalWrapper>
        </>
    );
};
