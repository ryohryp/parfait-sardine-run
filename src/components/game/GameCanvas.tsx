import React, { useEffect, useRef, useState } from 'react';
import { Game } from '../../game-core/js/game/Game.js';
import { GameFactory } from '../../game-core/js/game/GameFactory.js';
import { GachaSystem } from '../../game-core/js/game/GachaSystem.js';
import type { GameState, GameResult, GameRunData } from '../../types/game';
import { HUD } from './HUD';
import { StartScreen } from './StartScreen';
import { ResultScreen } from './ResultScreen';
import { runsApi } from '../../api/runs';
import { leaderboardApi } from '../../api/leaderboard';
import { useFingerprint } from '../../hooks/useFingerprint';

import { MissionNotification } from './MissionNotification';
import type { Mission } from '../../types/game';
import { AchievementSystem } from '../../game-core/js/game/AchievementSystem';
import type { Achievement } from '../../game-core/js/game/AchievementSystem';
import { AchievementNotification } from './AchievementNotification';
import { DailyBonusSystem } from '../../game-core/js/game/DailyBonusSystem';

import { useSound } from '../../hooks/useSound';

import { TutorialOverlay } from './TutorialOverlay';
import type { TutorialStep } from './TutorialOverlay';

export const GameCanvas: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gameRef = useRef<Game | null>(null);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [showStartScreen, setShowStartScreen] = useState(true);
    const [result, setResult] = useState<GameResult | null>(null);
    const [missionNotification, setMissionNotification] = useState<Mission | null>(null);
    const [achievementNotification, setAchievementNotification] = useState<Achievement | null>(null);
    const [showTutorial, setShowTutorial] = useState(false);
    const [tutorialStep, setTutorialStep] = useState<TutorialStep>('jump');
    const fingerprint = useFingerprint();
    const currentRunId = useRef<string | null>(null);
    const currentNonce = useRef<string | null>(null);
    const playerNameRef = useRef<string>('');
    const { playBgm, stopBgm } = useSound();

    // Initialize Systems
    const [gachaSystem] = useState(() => new GachaSystem());
    const [achievementSystem] = useState(() => new AchievementSystem());
    const [dailyBonusSystem] = useState(() => new DailyBonusSystem());

    useEffect(() => {
        if (!canvasRef.current) return;

        const game = GameFactory.create(canvasRef.current, {
            onStateUpdate: (state: GameState) => {
                setGameState(state);
            },
            onGameOver: (res: GameResult) => {
                setResult(res);
                stopBgm();

                // Update stats and check achievements
                // Update stats and check achievements
                achievementSystem.updateStats({
                    totalRuns: 1,
                    totalCoins: res.coins,
                    maxScore: res.score,
                    enemiesDefeated: res.enemiesDefeated || 0,
                    bossesDefeated: res.bossesDefeated || 0,
                    totalDistance: res.distance || 0,
                    totalJumps: res.jumps || 0,
                    totalAttacks: res.attacks || 0
                });

                const newUnlocks = achievementSystem.checkUnlocks(gachaSystem);
                if (newUnlocks.length > 0) {
                    // Show first unlock (queueing could be added for multiple)
                    setAchievementNotification(newUnlocks[0]);
                }
            },
            onRunStart: async () => {
                // Construct path with base URL to handle deployment correctly
                const baseUrl = import.meta.env.BASE_URL;
                // Remove trailing slash if present to avoid double slashes, though browsers usually handle it
                const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
                playBgm(`${cleanBase}/assets/bgm/stage.ogg`);

                // Check tutorial
                const tutorialCompleted = localStorage.getItem('psrun_tutorial_completed');
                if (!tutorialCompleted) {
                    setShowTutorial(true);
                    setTutorialStep('jump');
                    // Pause game for tutorial
                    setTimeout(() => {
                        if (gameRef.current) {
                            gameRef.current.pause();
                        }
                    }, 100);
                }

                if (fingerprint) {
                    try {
                        console.log('[GameCanvas] Starting run with fingerprint:', fingerprint);
                        const res = await runsApi.startRun(fingerprint);
                        console.log('[GameCanvas] Run started:', res);
                        if (res.run_id && res.nonce) {
                            currentRunId.current = res.run_id;
                            currentNonce.current = res.nonce;
                        }
                    } catch (e) {
                        console.error('Failed to start run log', e);
                    }
                }
            },
            onRunFinish: async (data: GameRunData) => {
                console.log('[GameCanvas] onRunFinish called with:', {
                    data,
                    fingerprint,
                    currentRunId: currentRunId.current,
                    currentNonce: currentNonce.current
                });

                // Save to localStorage
                try {
                    const historyKey = 'psrun_history_v1';
                    const existingHistory = localStorage.getItem(historyKey);
                    const history = existingHistory ? JSON.parse(existingHistory) : [];

                    const newEntry = {
                        id: currentRunId.current || `local_${Date.now()}`,
                        stage: data.stage,
                        score: data.score,
                        duration: data.duration,
                        coins: data.coins,
                        result: data.result,
                        date: new Date().toISOString()
                    };

                    history.unshift(newEntry);
                    const trimmedHistory = history.slice(0, 50);
                    localStorage.setItem(historyKey, JSON.stringify(trimmedHistory));
                    console.log('[GameCanvas] Saved to local history');
                } catch (e) {
                    console.error('[GameCanvas] Failed to save local history:', e);
                }

                if (fingerprint && currentRunId.current && currentNonce.current) {
                    try {
                        console.log('[GameCanvas] Attempting to finish run:', currentRunId.current);
                        await runsApi.finishRun(currentRunId.current, {
                            ...data,
                            fingerprint,
                            nonce: currentNonce.current
                        });
                        console.log('[GameCanvas] Run finished successfully');

                        // Submit to Leaderboard
                        if (playerNameRef.current) {
                            console.log('[GameCanvas] Submitting to leaderboard');
                            await leaderboardApi.submitScore({
                                name: playerNameRef.current,
                                score: data.score,
                                level: parseInt(data.stage.replace('level-', '')) || 1,
                                coins: data.coins,
                                char: gameRef.current?.gacha.collection.current || 'parfen',
                                fingerprint
                            });
                            console.log('[GameCanvas] Leaderboard submission successful');
                        }
                    } catch (e) {
                        console.error('Failed to finish run log or submit score', e);
                    }
                    currentRunId.current = null;
                    currentNonce.current = null;
                } else {
                    console.warn('[GameCanvas] Skipping run finish - missing data:', {
                        hasFingerprint: !!fingerprint,
                        hasRunId: !!currentRunId.current,
                        hasNonce: !!currentNonce.current
                    });
                }
            },
            onStageClear: (data: GameResult) => {
                // Stage cleared, show result or continue
                setResult({ ...data, stageClear: true });

                // Also check achievements on stage clear
                achievementSystem.updateStats({
                    totalCoins: data.coins,
                    maxScore: data.score,
                    enemiesDefeated: data.enemiesDefeated || 0,
                    bossesDefeated: data.bossesDefeated || 0
                });

                const newUnlocks = achievementSystem.checkUnlocks(gachaSystem);
                if (newUnlocks.length > 0) {
                    setAchievementNotification(newUnlocks[0]);
                }
            },
            onMissionComplete: (mission: Mission) => {
                setMissionNotification(mission);
            }
        }, {
            gacha: gachaSystem
        });

        gameRef.current = game;

        return () => {
            if (gameRef.current) {
                gameRef.current.destroy();
            }
        };
    }, [fingerprint, gachaSystem, achievementSystem]);

    const handleStart = (characterKey: string, playerName: string) => {
        console.log('[GameCanvas] handleStart called');
        console.log('[GameCanvas] Arguments:', { characterKey, playerName });
        if (gameRef.current) {
            playerNameRef.current = playerName;
            gameRef.current.start(characterKey);
            setShowStartScreen(false);
            setResult(null);
            console.log('[GameCanvas] Game started, hiding start screen');
        } else {
            console.error('[GameCanvas] gameRef.current is null!');
        }
    };

    const handleRetry = () => {
        if (gameRef.current) {
            gameRef.current.start(); // Retry uses same character
            setResult(null);
        }
    };

    const handleMenu = () => {
        stopBgm();
        setResult(null);
        setShowStartScreen(true);
    };

    const handleUlt = () => {
        if (gameRef.current) {
            gameRef.current.tryUlt();
        }
    };

    const handleTutorialNext = () => {
        if (tutorialStep === 'jump') {
            setTutorialStep('attack');
        } else if (tutorialStep === 'attack') {
            setTutorialStep('complete');
        } else {
            // Complete
            localStorage.setItem('psrun_tutorial_completed', 'true');
            setShowTutorial(false);
            if (gameRef.current) {
                gameRef.current.resume();
            }
        }
    };

    const handleTutorialSkip = () => {
        localStorage.setItem('psrun_tutorial_completed', 'true');
        setShowTutorial(false);
        if (gameRef.current) {
            gameRef.current.resume();
        }
    };

    return (
        <div>
            <div className="playArea">


                <canvas
                    ref={canvasRef}
                    id="cv"
                    width={360}
                    height={640}
                />
                {gameState && <HUD state={gameState} onUlt={handleUlt} />}
                <StartScreen
                    onStart={handleStart}
                    visible={showStartScreen}
                    gachaSystem={gachaSystem}
                    achievementSystem={achievementSystem}
                    dailyBonusSystem={dailyBonusSystem}
                />
                {result && <ResultScreen result={result} onRetry={handleRetry} onMenu={handleMenu} />}
                <MissionNotification mission={missionNotification} onClose={() => setMissionNotification(null)} />
                {achievementNotification && (
                    <AchievementNotification
                        title={achievementNotification.titleKey} // Note: This needs translation in component
                        description={achievementNotification.descKey} // Note: This needs translation in component
                        icon={achievementNotification.icon}
                        reward={achievementNotification.reward}
                        onClose={() => setAchievementNotification(null)}
                    />
                )}
                <TutorialOverlay
                    visible={showTutorial}
                    step={tutorialStep}
                    onNext={handleTutorialNext}
                    onSkip={handleTutorialSkip}
                />
            </div>
        </div>
    );
};
