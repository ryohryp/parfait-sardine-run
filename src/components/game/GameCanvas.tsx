import React, { useEffect, useRef, useState } from 'react';
import { Game } from '../../game-core/js/game/Game.js';
import { GameFactory } from '../../game-core/js/game/GameFactory.js';
import type { GameState } from '../../types/game';
import { HUD } from './HUD';
import { StartScreen } from './StartScreen';
import { ResultScreen } from './ResultScreen';
import { runsApi } from '../../api/runs';
import { leaderboardApi } from '../../api/leaderboard';
import { useFingerprint } from '../../hooks/useFingerprint';

import { MissionNotification } from './MissionNotification';
import type { Mission } from '../../types/game';

export const GameCanvas: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gameRef = useRef<Game | null>(null);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [showStartScreen, setShowStartScreen] = useState(true);
    const [result, setResult] = useState<any>(null);
    const [missionNotification, setMissionNotification] = useState<Mission | null>(null);
    const fingerprint = useFingerprint();
    const currentRunId = useRef<string | null>(null);
    const currentNonce = useRef<string | null>(null);
    const playerNameRef = useRef<string>('');

    useEffect(() => {
        if (!canvasRef.current) return;

        const game = GameFactory.create(canvasRef.current, {
            onStateUpdate: (state: GameState) => {
                setGameState(state);
            },
            onGameOver: (res: any) => {
                setResult(res);
            },
            onRunStart: async () => {
                if (fingerprint) {
                    try {
                        const res = await runsApi.startRun(fingerprint);
                        if (res.run_id && res.nonce) {
                            currentRunId.current = res.run_id;
                            currentNonce.current = res.nonce;
                        }
                    } catch (e) {
                        console.error('Failed to start run log', e);
                    }
                }
            },
            onRunFinish: async (data: any) => {
                if (fingerprint && currentRunId.current && currentNonce.current) {
                    try {
                        await runsApi.finishRun(currentRunId.current, {
                            ...data,
                            fingerprint,
                            nonce: currentNonce.current
                        });

                        // Submit to Leaderboard
                        if (playerNameRef.current) {
                            await leaderboardApi.submitScore({
                                name: playerNameRef.current,
                                score: data.score,
                                level: parseInt(data.stage.replace('level-', '')) || 1,
                                coins: data.coins,
                                char: gameRef.current?.gacha.collection.current || 'parfen',
                                fingerprint
                            });
                        }
                    } catch (e) {
                        console.error('Failed to finish run log or submit score', e);
                    }
                    currentRunId.current = null;
                    currentNonce.current = null;
                }
            },
            onStageClear: (data: any) => {
                // Stage cleared, show result or continue
                setResult({ ...data, stageClear: true });
            },
            onMissionComplete: (mission: Mission) => {
                setMissionNotification(mission);
            }
        });

        gameRef.current = game;

        return () => {
            // game.destroy(); // Implement destroy if needed
        };
    }, [fingerprint]);

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
        setResult(null);
        setShowStartScreen(true);
    };

    const handleUlt = () => {
        if (gameRef.current) {
            gameRef.current.tryUlt();
        }
    };

    return (
        <div>
            <div className="playArea">
                <div id="charInfo" className="hud-pill" style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 20 }}>
                    {gameState ? `CHAR: ${gameState.currentCharKey}` : 'CHAR: -'}
                </div>

                <canvas
                    ref={canvasRef}
                    id="cv"
                    width={360}
                    height={640}
                />
                {gameState && <HUD state={gameState} onUlt={handleUlt} />}
                <StartScreen onStart={handleStart} visible={showStartScreen} />
                {result && <ResultScreen result={result} onRetry={handleRetry} onMenu={handleMenu} />}
                <MissionNotification mission={missionNotification} onClose={() => setMissionNotification(null)} />
            </div>
        </div>
    );
};

