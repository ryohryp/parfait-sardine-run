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

    const hpPercent = (Number.isFinite(hp) && Number.isFinite(maxHp) && maxHp > 0)
        ? Math.max(0, Math.min(100, (hp / maxHp) * 100))
        : 100;
    const hpColor = hpPercent > 50 ? '#22c55e' : hpPercent > 20 ? '#eab308' : '#ef4444';

    return (
        <div id="hud">
            {/* Top Info Bar */}
            <div style={{
                position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)',
                display: 'flex', gap: '16px', fontSize: '13px', fontWeight: '700',
                background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(8px)',
                padding: '6px 20px', borderRadius: '20px',
                border: '1px solid rgba(255,255,255,0.5)',
                boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                color: '#475569',
                whiteSpace: 'nowrap',
                zIndex: 10
            }}>
                <span style={{ color: '#0ea5e9' }}>{stageName}</span>
                <span>Lv.{level}</span>
                <span>👤 {state.currentCharKey}</span>
                <span style={{ color: '#eab308' }}>🪙 {(coins || 0).toLocaleString()}</span>
            </div>

            <div className="hud-group">
                <div className="hud-pill" style={{
                    background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(4px)',
                    border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    borderRadius: '12px', padding: '6px 12px'
                }}>
                    <span style={{ fontSize: '16px' }}>⏰</span>
                    <span style={{ fontSize: '16px', fontWeight: '800', fontVariantNumeric: 'tabular-nums', color: '#334155' }}>{sec}s</span>
                </div>
                <div className="hud-pill" style={{
                    padding: '6px 10px', gap: '8px', zIndex: 20, position: 'relative', minWidth: '180px', marginTop: '8px',
                    background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(4px)',
                    border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    borderRadius: '12px'
                }}>
                    <span style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.1))', fontSize: '16px' }}>❤️</span>
                    <div style={{
                        flex: 1, height: '18px',
                        background: '#1e293b',
                        borderRadius: '9px',
                        overflow: 'hidden',
                        position: 'relative',
                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)'
                    }}>
                        <div style={{
                            width: `${hpPercent}%`,
                            height: '100%',
                            background: `linear-gradient(180deg, ${hpColor} 0%, ${hpColor} 50%, ${hpColor}dd 100%)`,
                            boxShadow: `0 0 12px ${hpColor}88`,
                            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s'
                        }}>
                            <div style={{ width: '100%', height: '50%', background: 'rgba(255,255,255,0.2)' }}></div>
                        </div>
                        <div style={{
                            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '11px', color: '#fff', fontWeight: '800',
                            textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                            lineHeight: '18px',
                            letterSpacing: '0.5px'
                        }}>
                            {Number(hp).toFixed(0)}/{Number(maxHp).toFixed(0)}
                        </div>
                    </div>
                </div>
            </div>

            <div className="hud-group" style={{ position: 'absolute', top: '16px', right: '16px', flexDirection: 'column', alignItems: 'flex-end', zIndex: 30 }}>
                <div className="hud-pill" style={{
                    padding: '6px 16px', background: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e2e8f0', borderRadius: '20px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)'
                }}>
                    <span style={{ fontSize: '16px' }}>🏆</span>
                    <span className="hud-score" style={{
                        fontSize: '22px', color: '#0ea5e9',
                        textShadow: 'none', fontWeight: '900',
                        fontFamily: 'var(--font-main)', letterSpacing: '-0.5px'
                    }}>
                        {(score || 0).toLocaleString()}
                    </span>
                </div>
            </div>

            {/* Effects Bar */}
            <div className={clsx('hudEffects', { isHidden: effects.length === 0 })} style={{
                position: 'absolute', top: '70px', left: '0', right: '0',
                display: 'flex', justifyContent: 'center', gap: '8px', pointerEvents: 'none'
            }}>
                {effects.map((effect, i) => (
                    <span key={i} className="hud-pill" style={{
                        background: 'rgba(14, 165, 233, 0.9)', color: '#fff',
                        backdropFilter: 'blur(4px)', borderRadius: '16px',
                        padding: '4px 12px', fontSize: '12px', fontWeight: '700',
                        boxShadow: '0 2px 4px rgba(14, 165, 233, 0.3)'
                    }}>
                        <span>{effect.icon}</span>
                        <span>{Math.max(0, effect.remain).toFixed(1)}s</span>
                    </span>
                ))}
            </div>

            {/* Mission List */}
            <div className="hud-group" style={{ position: 'absolute', top: '76px', right: '16px', alignItems: 'flex-end', gap: '6px' }}>
                {state.missions && state.missions.map(m => (
                    <div key={m.id} className="hud-pill" style={{
                        fontSize: '11px',
                        padding: '6px 12px',
                        opacity: m.completed ? 0.7 : 1,
                        background: m.completed ? 'rgba(241, 245, 249, 0.9)' : 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(4px)',
                        color: m.completed ? '#94a3b8' : '#334155',
                        border: m.completed ? '1px solid #e2e8f0' : '1px solid #cbd5e1',
                        borderRadius: '8px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                        maxWidth: '160px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: 'flex', alignItems: 'center', gap: '6px',
                        transition: 'all 0.3s ease'
                    }}>
                        <span style={{ fontSize: '12px' }}>{m.completed ? '✅' : '⬜'}</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: '600' }}>{m.description}</span>
                        <span style={{ fontWeight: '800', color: m.completed ? '#94a3b8' : '#0ea5e9' }}>{m.current}/{m.target}</span>
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

