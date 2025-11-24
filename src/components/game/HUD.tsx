import React from 'react';
import type { GameState } from '../../types/game';
import clsx from 'clsx';

interface HUDProps {
    state: GameState;
    onUlt?: () => void;
}

export const HUD: React.FC<HUDProps> = ({ state, onUlt }) => {
    const {
        remainMs, level, score, coins, lives, ult,
        bestScore, invUntil, autoShootUntil, bulletBoostUntil, scoreMulUntil, ultActiveUntil, gameOn, stageName
    } = state;

    const sec = Math.max(0, Math.ceil(remainMs / 1000));
    const nowTs = performance.now();

    const effects = [];
    if (nowTs < invUntil) effects.push({ icon: '🛡️', label: '無敵', remain: (invUntil - nowTs) / 1000 });
    if (nowTs < autoShootUntil) effects.push({ icon: '🤖', label: '連射', remain: (autoShootUntil - nowTs) / 1000 });
    if (nowTs < bulletBoostUntil) effects.push({ icon: '💥', label: '火力UP', remain: (bulletBoostUntil - nowTs) / 1000 });
    if (nowTs < scoreMulUntil) effects.push({ icon: '✖️2', label: 'スコアUP', remain: (scoreMulUntil - nowTs) / 1000 });
    if (gameOn && nowTs < ultActiveUntil) effects.push({ icon: '🌈', label: '必殺', remain: (ultActiveUntil - nowTs) / 1000 });

    const hearts = Array.from({ length: 3 }, (_, i) => (i < lives ? '❤️' : '♡')).join('');

    return (
        <div id="hud" className="hudOverlay">
            <div className="hudRow hudRowPrimary">
                <div className="hudItem hudLife">
                    <span className="hudLabel">ライフ</span>
                    <span className="hudValue hudHearts">{hearts}</span>
                    <span className="hudGauge">必殺 {Math.floor(ult)}%</span>
                </div>
                <div className="hudItem hudTime">
                    <span className="hudLabel">残り時間</span>
                    <span className="hudValue">{sec}秒</span>
                </div>
                <div className="hudItem hudScore">
                    <span className="hudLabel">スコア</span>
                    <span className="hudValue hudScoreValue">{score.toLocaleString()}</span>
                </div>
            </div>
            <div className="hudRow hudRowSecondary">
                <div className="hudItem hudStage">
                    <span className="hudLabel">ステージ</span>
                    <span className="hudValue">{stageName}</span>
                    <span className="hudSub">Lv.{level}</span>
                </div>
                <div className="hudItem hudCoins">
                    <span className="hudLabel">コイン</span>
                    <span className="hudValue">🪙{coins.toLocaleString()}</span>
                </div>
                <div className="hudItem hudBest">
                    <span className="hudLabel">ベスト</span>
                    <span className="hudValue">{bestScore.toLocaleString()}</span>
                </div>
            </div>
            <div className={clsx('hudEffects', { isHidden: effects.length === 0 })}>
                {effects.map((effect, i) => (
                    <span key={i} className="hudEffect">
                        <span className="icon">{effect.icon}</span>
                        <span className="label">{effect.label}</span>
                        <span className="time">{Math.max(0, effect.remain).toFixed(1)}s</span>
                    </span>
                ))}
            </div>

            {/* Ultimate Button */}
            {state.ultReady && onUlt && (
                <button
                    className="ultButton"
                    onClick={(e) => {
                        e.stopPropagation();
                        onUlt();
                    }}
                    onMouseDown={(e) => {
                        e.stopPropagation();
                        e.currentTarget.style.transform = 'scale(0.95)';
                    }}
                    onMouseUp={(e) => {
                        e.stopPropagation();
                        e.currentTarget.style.transform = 'scale(1)';
                    }}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    style={{
                        position: 'fixed',
                        bottom: '20px',
                        right: '20px',
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        border: '4px solid #fbbf24',
                        background: 'linear-gradient(135deg, #f59e0b 0%, #dc2626 100%)',
                        color: '#fff',
                        fontSize: '32px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(251, 191, 36, 0.6), 0 0 20px rgba(251, 191, 36, 0.4)',
                        zIndex: 10000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        animation: 'pulse 1s infinite',
                        transition: 'transform 0.1s',
                        pointerEvents: 'auto'
                    }}
                    title="必殺技発動 (100%)"
                >
                    💫
                </button>
            )}
        </div>
    );
};
