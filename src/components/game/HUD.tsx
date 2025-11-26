import React from 'react';
import type { GameState } from '../../types/game';
import clsx from 'clsx';

interface HUDProps {
    state: GameState;
    onUlt?: () => void;
}

export const HUD: React.FC<HUDProps> = ({ state, onUlt }) => {
    const {
        remainMs, level, score, coins, hp, maxHp, ult,
        invUntil, autoShootUntil, bulletBoostUntil, scoreMulUntil, ultActiveUntil, gameOn, stageName
    } = state;

    const sec = Math.max(0, Math.ceil(remainMs / 1000));
    const nowTs = performance.now();

    const effects = [];
    if (nowTs < invUntil) effects.push({ icon: '🛡️', label: '無敵', remain: (invUntil - nowTs) / 1000 });
    if (nowTs < autoShootUntil) effects.push({ icon: '🤖', label: '連射', remain: (autoShootUntil - nowTs) / 1000 });
    if (nowTs < bulletBoostUntil) effects.push({ icon: '💥', label: '火力UP', remain: (bulletBoostUntil - nowTs) / 1000 });
    if (nowTs < scoreMulUntil) effects.push({ icon: '✖️2', label: 'スコアUP', remain: (scoreMulUntil - nowTs) / 1000 });
    if (gameOn && nowTs < ultActiveUntil) effects.push({ icon: '🌈', label: '必殺', remain: (ultActiveUntil - nowTs) / 1000 });

    const hpPercent = Math.max(0, Math.min(100, (hp / maxHp) * 100));
    const hpColor = hpPercent > 50 ? '#22c55e' : hpPercent > 20 ? '#eab308' : '#ef4444';

    return (
        <div id="hud">
            {/* Top Info Bar */}
            <div style={{
                position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
                display: 'flex', gap: '12px', fontSize: '12px', opacity: 0.8,
                background: 'rgba(0,0,0,0.4)', padding: '4px 12px', borderRadius: '0 0 8px 8px',
                whiteSpace: 'nowrap'
            }}>
                <span>{stageName}</span>
                <span>Lv.{level}</span>
                <span>👤 {state.currentCharKey}</span>
                <span>🪙 {(coins || 0).toLocaleString()}</span>
            </div>

            <div className="hud-group">
                <div className="hud-pill" style={{ padding: '4px 8px', gap: '6px' }}>
                    <span>❤️</span>
                    <div style={{ width: '100px', height: '14px', background: '#1e293b', borderRadius: '7px', overflow: 'hidden', position: 'relative', border: '1px solid #475569' }}>
                        <div style={{
                            width: `${hpPercent}%`,
                            height: '100%',
                            background: hpColor,
                            transition: 'width 0.2s ease-out, background 0.3s'
                        }} />
                        <div style={{
                            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '10px', color: '#fff', fontWeight: 'bold', textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                            lineHeight: '14px'
                        }}>
                            {hp}/{maxHp}
                        </div>
                    </div>
                </div>
                <div className="hud-pill">
                    <span>⏰</span>
                    <span>{sec}s</span>
                </div>
            </div>

            <div className="hud-group" style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
                <div className="hud-score">{(score || 0).toLocaleString()}</div>

            </div>

            {/* Effects Bar */}
            <div className={clsx('hudEffects', { isHidden: effects.length === 0 })} style={{
                position: 'absolute', top: '60px', left: '0', right: '0',
                display: 'flex', justifyContent: 'center', gap: '8px'
            }}>
                {effects.map((effect, i) => (
                    <span key={i} className="hud-pill" style={{ background: 'var(--primary-dim)', color: '#fff' }}>
                        <span>{effect.icon}</span>
                        <span>{Math.max(0, effect.remain).toFixed(1)}s</span>
                    </span>
                ))}
            </div>

            {/* Mission List */}
            <div className="hud-group" style={{ position: 'absolute', top: '70px', left: '16px', alignItems: 'flex-start', gap: '4px' }}>
                {state.missions && state.missions.map(m => (
                    <div key={m.id} className="hud-pill" style={{
                        fontSize: '10px',
                        padding: '4px 8px',
                        opacity: m.completed ? 0.6 : 1,
                        background: m.completed ? '#f1f5f9' : 'rgba(255,255,255,0.9)',
                        color: m.completed ? 'var(--text-muted)' : 'var(--text-main)'
                    }}>
                        <span>{m.completed ? '✅' : '⬜'}</span>
                        <span>{m.description}</span>
                        <span style={{ marginLeft: '4px', fontWeight: 'bold' }}>{m.current}/{m.target}</span>
                    </div>
                ))}
            </div>

            {/* Ultimate Button */}
            {onUlt && (
                <div style={{ position: 'fixed', bottom: '30px', right: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', pointerEvents: 'none' }}>
                    {!state.ultReady && (
                        <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: '4px' }}>
                            {Math.floor(ult)}%
                        </div>
                    )}
                    {state.ultReady && (
                        <button
                            className="control-btn ult"
                            onClick={(e) => {
                                e.stopPropagation();
                                onUlt();
                            }}
                            style={{
                                pointerEvents: 'auto',
                                animation: 'pulse 1s infinite'
                            }}
                        >
                            💫
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

