import React, { useEffect, useRef, useState } from 'react';
import { Game } from '../../game-core/js/game/Game.js';
import type { GameState } from '../../types/game';
import { HUD } from './HUD';
import { StartScreen } from './StartScreen';
import { ResultScreen } from './ResultScreen';
import { GachaModal } from './GachaModal';
import { CharacterSelectModal } from './CharacterSelectModal';
import { runsApi } from '../../api/runs';
import { useFingerprint } from '../../hooks/useFingerprint';

export const GameCanvas: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gameRef = useRef<Game | null>(null);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [showStartScreen, setShowStartScreen] = useState(true);
    const [result, setResult] = useState<any>(null);
    const [showGachaModal, setShowGachaModal] = useState(false);
    const [showCharSelectModal, setShowCharSelectModal] = useState(false);
    const fingerprint = useFingerprint();
    const currentRunId = useRef<string | null>(null);
    const currentNonce = useRef<string | null>(null);

    useEffect(() => {
        if (!canvasRef.current) return;

        const game = new Game(canvasRef.current, {
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
                    } catch (e) {
                        console.error('Failed to finish run log', e);
                    }
                    currentRunId.current = null;
                    currentNonce.current = null;
                }
            }
        });

        gameRef.current = game;

        return () => {
            // game.destroy(); // Implement destroy if needed
        };
    }, [fingerprint]);

    const handleStart = () => {
        if (gameRef.current) {
            gameRef.current.start();
            setShowStartScreen(false);
            setResult(null);
        }
    };

    const handleRetry = () => {
        if (gameRef.current) {
            gameRef.current.start();
            setResult(null);
        }
    };

    const handleMenu = () => {
        setResult(null);
        setShowStartScreen(true);
    };

    const handleGachaUpdate = () => {
        // Force game state update
        if (gameRef.current) {
            const state = gameRef.current.getState();
            setGameState(state);
        }
    };

    const handleCharacterChange = (key: string) => {
        // Update game character
        if (gameRef.current) {
            gameRef.current.updateCharacter(key);
            const state = gameRef.current.getState();
            setGameState(state);
        }
    };

    const handleUlt = () => {
        if (gameRef.current) {
            gameRef.current.tryUlt();
        }
    };

    return (
        <div>
            <div className="playArea" style={{ position: 'relative', width: '900px', height: '430px', margin: '0 auto' }}>
                <div id="charInfo" className="muted" style={{ position: 'absolute', top: '-20px', left: '0' }}>
                    {gameState ? `CHAR: ${gameState.currentCharKey}` : 'CHAR: -'}
                </div>

                <canvas
                    ref={canvasRef}
                    id="cv"
                    width={900}
                    height={430}
                    style={{ display: 'block', background: '#000' }}
                />
                {gameState && <HUD state={gameState} onUlt={handleUlt} />}
                <StartScreen onStart={handleStart} visible={showStartScreen} />
                {result && <ResultScreen result={result} onRetry={handleRetry} onMenu={handleMenu} />}
            </div>

            {/* Gacha and Character Select Buttons - Fixed at bottom */}
            <div style={{
                position: 'fixed',
                bottom: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: '10px',
                zIndex: 1000,
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                padding: '12px 20px',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}>
                <button
                    className="secondary"
                    onClick={() => setShowCharSelectModal(true)}
                >
                    👤 キャラ選択
                </button>
                <button
                    className="secondary"
                    onClick={() => setShowGachaModal(true)}
                >
                    🎰 ガチャ
                </button>
            </div>

            {/* Modals */}
            {gameRef.current && (
                <>
                    <GachaModal
                        visible={showGachaModal}
                        onClose={() => setShowGachaModal(false)}
                        gachaSystem={gameRef.current.gacha}
                        onUpdate={handleGachaUpdate}
                    />
                    <CharacterSelectModal
                        visible={showCharSelectModal}
                        onClose={() => setShowCharSelectModal(false)}
                        gachaSystem={gameRef.current.gacha}
                        onCharacterChange={handleCharacterChange}
                    />
                </>
            )}
        </div>
    );
};

