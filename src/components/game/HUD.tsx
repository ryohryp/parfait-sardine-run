import React from 'react';
import type { GameState } from '../../types/game';
import clsx from 'clsx';

interface HUDProps {
    state: GameState;
    onUlt?: () => void;
    onSummon?: (type: string) => void;
    onHeal?: () => void;
    onShield?: () => void;
}

export const HUD: React.FC<HUDProps> = ({ state, onUlt, onSummon, onHeal, onShield }) => {
    const {
        remainMs, level, score, coins, hp, maxHp, ult,
        invUntil, autoShootUntil, bulletBoostUntil, scoreMulUntil, ultActiveUntil, gameOn, stageName,
        fever, isFever, currentBeat, latestRating, latestRatingTime, comboCount, comboMultiplier,
        isBossActive
    } = state;

    const sec = Math.max(0, Math.ceil(remainMs / 1000));
    const nowTs = performance.now();

    // Beat pulse tracking
    const beatFraction = currentBeat !== undefined ? currentBeat % 1.0 : 0;
    const distToBeat = Math.min(beatFraction, 1.0 - beatFraction);
    const isCloseToBeat = distToBeat < 0.15;
    const pulseScale = isCloseToBeat ? 1.0 + (0.15 - distToBeat) * 0.8 : 1.0;

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

    const healCost = 30;
    const canHeal = (state.energy || 0) >= healCost;

    const shieldCost = 45;
    const canShield = (state.energy || 0) >= shieldCost;

    // Precompute rating element to avoid inline IIFE which can trigger React 19 reconciliation warnings/errors
    const showRating = latestRating && (nowTs - (latestRatingTime || 0) < 800);
    let ratingElement = null;
    if (showRating && latestRating) {
        const diff = nowTs - (latestRatingTime || 0);
        const scale = 1.3 - (diff / 800) * 0.3; // Starts at 1.3x and shrinks to 1.0x
        const opacity = diff < 600 ? 1 : 1 - (diff - 600) / 200; // Solid for 600ms, then fades out in 200ms
        
        let textColor = '#ffffff';
        let ratingBg = 'linear-gradient(135deg, #64748b, #475569)';
        let glowColor = 'rgba(100, 116, 139, 0.5)';
        
        if (latestRating === 'PERFECT!') {
            textColor = '#ffffff';
            ratingBg = 'linear-gradient(135deg, #00f2fe, #4facfe)';
            glowColor = 'rgba(0, 242, 254, 0.8)';
        } else if (latestRating === 'GREAT!') {
            textColor = '#ffffff';
            ratingBg = 'linear-gradient(135deg, #ff007f, #ff758c)';
            glowColor = 'rgba(255, 0, 127, 0.8)';
        } else if (latestRating === 'OFF BEAT') {
            textColor = '#e2e8f0';
            ratingBg = 'linear-gradient(135deg, #475569, #334155)';
            glowColor = 'rgba(71, 85, 105, 0.4)';
        }

        ratingElement = (
            <div style={{
                position: 'absolute',
                bottom: '120px',
                left: '50%',
                transform: `translateX(-50%) scale(${scale})`,
                opacity: opacity,
                zIndex: 100,
                pointerEvents: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px 24px',
                borderRadius: '20px',
                background: ratingBg,
                border: '2px solid rgba(255, 255, 255, 0.8)',
                boxShadow: `0 0 15px ${glowColor}, 0 6px 20px rgba(0,0,0,0.25)`,
                transition: 'transform 0.05s ease-out, opacity 0.05s ease-out'
            }}>
                <span style={{
                    fontSize: '18px',
                    fontWeight: '900',
                    letterSpacing: '1.5px',
                    color: textColor,
                    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    fontFamily: 'var(--font-main)'
                }}>
                    {latestRating}
                </span>
            </div>
        );
    }

    return (
        <div id="hud" style={{
            position: 'absolute',
            top: '16px',
            bottom: '16px',
            left: '16px',
            right: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            pointerEvents: 'none',
            zIndex: 10
        }}>
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

            {/* Energy Bar */}
            {gameOn && (
                <div style={{
                    position: 'absolute', top: '45px', left: '50%', transform: 'translateX(-50%)',
                    width: '320px', height: '14px',
                    background: 'rgba(0, 0, 0, 0.5)',
                    backdropFilter: 'blur(4px)',
                    borderRadius: '7px',
                    border: '1px solid rgba(255,255,255,0.4)',
                    overflow: 'hidden',
                    display: 'flex', alignItems: 'center', zIndex: 10,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}>
                    <div style={{
                        width: `${(state.maxEnergy && state.maxEnergy > 0) ? Math.min(100, ((state.energy || 0) / state.maxEnergy) * 100) : 0}%`, height: '100%',
                        background: 'linear-gradient(90deg, #eab308, #fef08a, #eab308)',
                        boxShadow: '0 0 10px rgba(234,179,8,0.8)',
                        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}>
                        <div style={{ width: '100%', height: '50%', background: 'rgba(255,255,255,0.3)' }} />
                    </div>
                    <div style={{
                        position: 'absolute', width: '100%', textAlign: 'center',
                        fontSize: '9px', fontWeight: '800', color: '#fff',
                        textShadow: '0 1px 2px rgba(0,0,0,0.9)',
                        letterSpacing: '0.5px',
                        lineHeight: '14px'
                    }}>
                        Energy: {Math.floor(state.energy || 0)} / {state.maxEnergy || 100}
                    </div>
                </div>
            )}

            {/* Fever Bar */}
            {gameOn && fever !== undefined && (
                <div style={{
                    position: 'absolute', top: '63px', left: '50%', transform: 'translateX(-50%)',
                    width: '320px', height: '14px',
                    background: 'rgba(0, 0, 0, 0.5)',
                    backdropFilter: 'blur(4px)',
                    borderRadius: '7px',
                    border: '1px solid rgba(255,255,255,0.4)',
                    overflow: 'hidden',
                    display: 'flex', alignItems: 'center', zIndex: 10,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}>
                    <div style={{
                        width: `${Math.min(100, fever)}%`, height: '100%',
                        background: isFever 
                            ? 'linear-gradient(90deg, #ff007f, #ff00ff, #00ffff, #ff007f)'
                            : 'linear-gradient(90deg, #ec4899, #f43f5e, #ff7e5f)',
                        backgroundSize: isFever ? '200% auto' : 'auto',
                        animation: isFever ? 'rainbowPan 1.5s linear infinite' : 'none',
                        boxShadow: isFever 
                            ? '0 0 15px rgba(255, 0, 255, 0.8)' 
                            : '0 0 8px rgba(236,72,153,0.5)',
                        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}>
                        <div style={{ width: '100%', height: '50%', background: 'rgba(255,255,255,0.25)' }} />
                    </div>
                    <div style={{
                        position: 'absolute', width: '100%', textAlign: 'center',
                        fontSize: '9px', fontWeight: '900', color: '#fff',
                        textShadow: '0 1px 2px rgba(0,0,0,0.9)',
                        letterSpacing: '1px',
                        lineHeight: '14px'
                    }}>
                        {isFever ? '🔥 FEVER TIME 🔥' : `FEVER: ${Math.floor(fever)}%`}
                    </div>
                </div>
            )}

            <div className="hud-group">
                {isBossActive ? (
                    <div className="hud-pill" style={{
                        background: 'rgba(239, 68, 68, 0.9)',
                        backdropFilter: 'blur(4px)',
                        border: '1px solid rgba(255, 255, 255, 0.4)',
                        boxShadow: '0 0 15px rgba(239, 68, 68, 0.8)',
                        borderRadius: '12px',
                        padding: '6px 12px',
                        color: '#ffffff',
                        animation: 'flashRed 1s infinite',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}>
                        <span style={{ fontSize: '16px' }}>⏰</span>
                        <span style={{ fontSize: '13px', fontWeight: '900', letterSpacing: '0.5px' }}>BOSS FIGHT</span>
                    </div>
                ) : (
                    <div className="hud-pill" style={{
                        background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(4px)',
                        border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                        borderRadius: '12px', padding: '6px 12px',
                        display: 'flex', alignItems: 'center', gap: '4px'
                    }}>
                        <span style={{ fontSize: '16px' }}>⏰</span>
                        <span style={{ fontSize: '16px', fontWeight: '800', fontVariantNumeric: 'tabular-nums', color: '#334155' }}>{sec}s</span>
                    </div>
                )}
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
                {comboCount !== undefined && comboCount > 0 && (
                    <div className="hud-pill" style={{
                        marginTop: '6px',
                        padding: '4px 12px',
                        background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                        border: '1px solid rgba(255,255,255,0.4)',
                        borderRadius: '16px',
                        boxShadow: '0 4px 10px rgba(239,68,68,0.3)',
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: '800',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}>
                        <span>🔥 {comboCount} COMBO</span>
                        <span style={{
                            background: 'rgba(255,255,255,0.25)',
                            padding: '2px 6px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: '900'
                        }}>
                            x{comboMultiplier?.toFixed(1) || '1.0'}
                        </span>
                    </div>
                )}
            </div>

            {/* Effects Bar */}
            <div className={clsx('hudEffects', { isHidden: effects.length === 0 })} style={{
                position: 'absolute', top: '82px', left: '0', right: '0',
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
                <div style={{ position: 'absolute', bottom: '20px', right: '0px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', pointerEvents: 'none' }}>
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
            {/* Rating popup */}
            {ratingElement}

            {/* Summon Buttons & Support Spells */}
            {gameOn && (onSummon || onHeal || onShield) && (
                <div style={{
                    position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
                    display: 'flex', gap: '12px', zIndex: 50,
                    background: 'rgba(15, 23, 42, 0.8)',
                    padding: '10px 14px', borderRadius: '20px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(8px)', pointerEvents: 'none',
                    alignItems: 'center'
                }}>
                    {/* Support Spells */}
                    {(onHeal || onShield) && (
                        <div style={{ display: 'flex', gap: '10px' }}>
                            {onHeal && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onHeal();
                                    }}
                                    disabled={!canHeal}
                                    style={{
                                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                                        padding: '8px', borderRadius: '12px', border: '2px solid',
                                        position: 'relative',
                                        borderColor: canHeal ? '#22c55e' : '#475569',
                                        background: canHeal ? 'rgba(34, 197, 94, 0.15)' : 'rgba(30, 41, 59, 0.5)',
                                        color: canHeal ? '#22c55e' : '#64748b',
                                        opacity: canHeal ? 1 : 0.45,
                                        cursor: canHeal ? 'pointer' : 'not-allowed',
                                        width: '64px',
                                        pointerEvents: 'auto',
                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                        animation: canHeal ? 'pulseGreen 2s infinite ease-in-out' : 'none',
                                        transform: canHeal ? `scale(${pulseScale})` : `scale(${pulseScale * 0.95})`
                                    }}
                                >
                                    <div style={{
                                        position: 'absolute',
                                        top: '-6px',
                                        right: '-6px',
                                        background: '#1e293b',
                                        color: '#fff',
                                        border: '1px solid rgba(255,255,255,0.3)',
                                        borderRadius: '4px',
                                        padding: '1px 4px',
                                        fontSize: '8px',
                                        fontWeight: '900',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                                    }}>
                                        Q / 1
                                    </div>
                                    <span style={{ fontSize: '24px', lineHeight: '1' }}>💚</span>
                                    <span style={{ fontSize: '10px', fontWeight: 'bold', color: canHeal ? '#e2e8f0' : '#64748b', marginTop: '4px' }}>ヒール</span>
                                    <span style={{ fontSize: '12px', fontWeight: '900', color: canHeal ? '#22c55e' : '#64748b', marginTop: '2px' }}>{healCost}</span>
                                </button>
                            )}

                            {onShield && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onShield();
                                    }}
                                    disabled={!canShield}
                                    style={{
                                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                                        padding: '8px', borderRadius: '12px', border: '2px solid',
                                        position: 'relative',
                                        borderColor: canShield ? '#3b82f6' : '#475569',
                                        background: canShield ? 'rgba(59, 130, 246, 0.15)' : 'rgba(30, 41, 59, 0.5)',
                                        color: canShield ? '#3b82f6' : '#64748b',
                                        opacity: canShield ? 1 : 0.45,
                                        cursor: canShield ? 'pointer' : 'not-allowed',
                                        width: '64px',
                                        pointerEvents: 'auto',
                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                        animation: canShield ? 'pulseBlue 2s infinite ease-in-out' : 'none',
                                        transform: canShield ? `scale(${pulseScale})` : `scale(${pulseScale * 0.95})`
                                    }}
                                >
                                    <div style={{
                                        position: 'absolute',
                                        top: '-6px',
                                        right: '-6px',
                                        background: '#1e293b',
                                        color: '#fff',
                                        border: '1px solid rgba(255,255,255,0.3)',
                                        borderRadius: '4px',
                                        padding: '1px 4px',
                                        fontSize: '8px',
                                        fontWeight: '900',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                                    }}>
                                        E / 2
                                    </div>
                                    <span style={{ fontSize: '24px', lineHeight: '1' }}>🛡️</span>
                                    <span style={{ fontSize: '10px', fontWeight: 'bold', color: canShield ? '#e2e8f0' : '#64748b', marginTop: '4px' }}>バリア</span>
                                    <span style={{ fontSize: '12px', fontWeight: '900', color: canShield ? '#3b82f6' : '#64748b', marginTop: '2px' }}>{shieldCost}</span>
                                </button>
                            )}
                        </div>
                    )}

                    {/* Divider */}
                    {(onHeal || onShield) && onSummon && (
                        <div style={{ width: '1px', height: '44px', background: 'rgba(255, 255, 255, 0.25)', margin: '0 4px' }} />
                    )}

                    {/* Summon Units */}
                    {onSummon && (
                        <div style={{ display: 'flex', gap: '10px' }}>
                            {[
                                { type: 'straight', cost: 10, icon: '👾', name: 'スライム' },
                                { type: 'zigzag', cost: 15, icon: '🦇', name: 'コウモリ' },
                                { type: 'hover', cost: 20, icon: '🛸', name: 'ドローン' },
                                { type: 'dash', cost: 25, icon: '🐺', name: 'ウルフ' }
                            ].map(unit => {
                                const canSummon = (state.energy || 0) >= unit.cost;
                                return (
                                    <button
                                        key={unit.type}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSummon(unit.type);
                                        }}
                                        disabled={!canSummon}
                                        style={{
                                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                                            padding: '8px', borderRadius: '12px', border: '2px solid',
                                            borderColor: canSummon 
                                                ? (isCloseToBeat ? '#ec4899' : '#0ea5e9') 
                                                : '#475569',
                                            background: canSummon 
                                                ? (isCloseToBeat ? '#fff5f7' : 'rgba(255,255,255,0.95)') 
                                                : 'rgba(30, 41, 59, 0.5)',
                                            opacity: canSummon ? 1 : 0.45,
                                            cursor: canSummon ? 'pointer' : 'not-allowed',
                                            width: '64px',
                                            pointerEvents: 'auto',
                                            transition: 'background-color 0.2s, border-color 0.2s, opacity 0.2s, box-shadow 0.2s, transform 0.05s ease-out',
                                            boxShadow: canSummon 
                                                ? (isCloseToBeat 
                                                    ? '0 0 15px rgba(236,72,153,0.8), 0 4px 12px rgba(14,165,233,0.4)' 
                                                    : '0 4px 12px rgba(14,165,233,0.4)') 
                                                : 'none',
                                            transform: canSummon 
                                                ? `translateY(0) scale(${pulseScale})` 
                                                : `translateY(2px) scale(${pulseScale * 0.95})`
                                        }}
                                    >
                                        <span style={{ fontSize: '24px', lineHeight: '1' }}>{unit.icon}</span>
                                        <span style={{ fontSize: '10px', fontWeight: 'bold', color: canSummon ? '#1e293b' : '#64748b', marginTop: '4px' }}>{unit.name}</span>
                                        <span style={{ fontSize: '12px', fontWeight: '900', color: canSummon ? '#0284c7' : '#64748b', marginTop: '2px' }}>{unit.cost}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

