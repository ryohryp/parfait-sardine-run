import React from 'react';
import { stages } from '../../game-core/js/game-data/stages';

interface StageSelectModalProps {
    visible: boolean;
    unlockedStages: string[];
    onSelect: (stageKey: string) => void;
    onClose: () => void;
}

export const StageSelectModal: React.FC<StageSelectModalProps> = ({ visible, unlockedStages, onSelect, onClose }) => {
    if (!visible) return null;

    return (
        <div className="overlay visible" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                <h2>Select Stage</h2>
                <div className="stage-list" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '20px' }}>
                    {stages.map(stage => {
                        const isUnlocked = unlockedStages.includes(stage.key);
                        return (
                            <div
                                key={stage.key}
                                onClick={() => isUnlocked && onSelect(stage.key)}
                                style={{
                                    background: isUnlocked ? `linear-gradient(to bottom right, ${stage.bg1}, ${stage.bg2})` : '#334155',
                                    padding: '20px',
                                    borderRadius: '12px',
                                    cursor: isUnlocked ? 'pointer' : 'not-allowed',
                                    opacity: isUnlocked ? 1 : 0.6,
                                    border: '2px solid #fff',
                                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                            >
                                <h3 style={{ margin: '0 0 8px 0', color: '#1e293b', textShadow: '0 1px 0 rgba(255,255,255,0.5)' }}>{stage.name}</h3>
                                {isUnlocked ? (
                                    <div style={{ fontSize: '12px', color: '#475569' }}>
                                        Difficulty: {'⭐'.repeat(Math.ceil(stage.enemyMul))}
                                    </div>
                                ) : (
                                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>
                                        LOCKED
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                <button className="secondary" onClick={onClose} style={{ marginTop: '24px', width: '100%' }}>
                    Back
                </button>
            </div>
        </div>
    );
};
