import React from 'react';
import type { GameState } from '../../types/game';
import clsx from 'clsx';

interface HUDProps {
    state: GameState;
}

export const HUD: React.FC<HUDProps> = ({ state }) => {
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
        </div>
    );
};
