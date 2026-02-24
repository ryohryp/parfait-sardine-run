import React from 'react';
import type { GameState } from '../../types/game';
import type { RogueliteSkillDef } from '../../game-data/roguelite-skills';

interface LevelUpModalProps {
    state: GameState;
    onSelect: (skillId: string) => void;
}

export const LevelUpModal: React.FC<LevelUpModalProps> = ({ state, onSelect }) => {
    if (!state.isLevelUp || !state.levelUpChoices || state.levelUpChoices.length === 0) return null;

    return (
        <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(8px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            zIndex: 100, padding: '20px'
        }}>
            <h2 style={{
                color: '#fff', fontSize: '28px', fontWeight: '900', marginBottom: '8px',
                textShadow: '0 2px 4px rgba(0,0,0,0.5)', letterSpacing: '2px',
                fontFamily: 'var(--font-main)'
            }}>LEVEL UP!</h2>
            <p style={{ color: '#bae6fd', fontSize: '14px', marginBottom: '24px', fontWeight: '700' }}>
                スキルを1つ選んでください
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                {state.levelUpChoices.map((skill: RogueliteSkillDef) => (
                    <button
                        key={skill.id}
                        onClick={() => onSelect(skill.id)}
                        style={{
                            background: 'rgba(255, 255, 255, 0.95)',
                            border: `2px solid ${getRarityColor(skill.rarity)}`,
                            borderRadius: '16px',
                            padding: '16px',
                            display: 'flex', alignItems: 'center', gap: '16px',
                            boxShadow: `0 4px 12px ${getRarityColor(skill.rarity)}40`,
                            cursor: 'pointer',
                            transition: 'transform 0.1s cubic-bezier(0.4, 0, 0.2, 1)',
                            WebkitTapHighlightColor: 'transparent',
                            textAlign: 'left'
                        }}
                        onPointerDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
                        onPointerUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                        onPointerLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                        <div style={{
                            fontSize: '32px', width: '56px', height: '56px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'rgba(0,0,0,0.05)', borderRadius: '12px', flexShrink: 0
                        }}>
                            {skill.icon}
                        </div>
                        <div style={{ flex: 1, textAlign: 'left' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                <span style={{ fontWeight: '800', fontSize: '16px', color: '#334155' }}>{skill.name}</span>
                                <span style={{
                                    fontSize: '11px', fontWeight: '800',
                                    color: getRarityColor(skill.rarity),
                                    background: `${getRarityColor(skill.rarity)}20`,
                                    padding: '2px 8px', borderRadius: '6px'
                                }}>
                                    {getRarityLabel(skill.rarity)}
                                </span>
                            </div>
                            <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.4', fontWeight: '600' }}>
                                {skill.description}
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

function getRarityColor(rarity: string) {
    switch (rarity) {
        case 'legendary': return '#eab308'; // Yellow
        case 'epic': return '#a855f7'; // Purple
        case 'rare': return '#3b82f6'; // Blue
        case 'common': default: return '#94a3b8'; // Gray
    }
}

function getRarityLabel(rarity: string) {
    switch (rarity) {
        case 'legendary': return 'LEGENDARY';
        case 'epic': return 'EPIC';
        case 'rare': return 'RARE';
        case 'common': default: return 'COMMON';
    }
}
