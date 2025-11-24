import React, { useEffect, useRef, useState } from 'react';
import { Game } from '../../game-core/js/game/Game.js';
import type { GameState } from '../../types/game';
import { HUD } from './HUD';
import { StartScreen } from './StartScreen';
import { ResultScreen } from './ResultScreen';
import { runsApi } from '../../api/runs';
import { useFingerprint } from '../../hooks/useFingerprint';

export const GameCanvas: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gameRef = useRef<Game | null>(null);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [showStartScreen, setShowStartScreen] = useState(true);
    const [result, setResult] = useState<any>(null);
    const fingerprint = useFingerprint();
    const currentRunId = useRef<number | null>(null);

    useEffect(() => {
        if (!canvasRef.current) return;

        const game = new Game(canvasRef.current, {
            onStateUpdate: (state: GameState) => {
                setGameState(state);
            },
            onGameOver: (res: any) => {
                console.log('Game Over', res);
                setResult(res);
            },
            onRunStart: async () => {
                if (fingerprint) {
                    try {
                        const res = await runsApi.startRun(fingerprint);
                        if (res.success) {
                            currentRunId.current = res.run_id;
                        }
                    } catch (e) {
                        console.error('Failed to start run log', e);
                    }
                }
            },
            onRunFinish: async (data: any) => {
                if (fingerprint && currentRunId.current) {
                    try {
                        await runsApi.finishRun(currentRunId.current, {
                            ...data,
                            fingerprint
                        });
                    } catch (e) {
                        console.error('Failed to finish run log', e);
                    }
                    currentRunId.current = null;
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

    return (
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
            {gameState && <HUD state={gameState} />}
            <StartScreen onStart={handleStart} visible={showStartScreen} />
            {result && <ResultScreen result={result} onRetry={handleRetry} onMenu={handleMenu} />}
        </div>
    );
};
