import React, { useState, useEffect } from 'react';
import type { CharacterProgression, CharacterProgressionData } from '../../game-core/js/game/CharacterProgression';

interface SkillTreeModalProps {
    visible: boolean;
    characterKey: string;
    onClose: () => void;
    progression: CharacterProgression;
}

export const SkillTreeModal: React.FC<SkillTreeModalProps> = ({ visible, characterKey, onClose, progression }) => {
    const [charData, setCharData] = useState<CharacterProgressionData | null>(null);

    // Load character data when modal opens
    useEffect(() => {
        if (visible && progression) {
            const data = progression.getCharacterData(characterKey);
            setCharData(data);
        }
    }, [visible, characterKey, progression]);

    if (!visible || !charData) return null;

    const handleAllocate = (tree: 'attack' | 'defense' | 'special') => {
        const success = progression.allocateSkillPoint(characterKey, tree);
        if (success) {
            const data = progression.getCharacterData(characterKey);
            setCharData({ ...data }); // Force new object reference
        }
    };

    const handleReset = () => {
        if (confirm('スキルをリセットしますか? (コスト: 1000コイン)')) {
            const refunded = progression.resetSkills(characterKey);
            const data = progression.getCharacterData(characterKey);
            setCharData({ ...data }); // Force new object reference
            alert(`${refunded}ポイントが返却されました`);
        }
    };

    const renderSkillTree = (tree: 'attack' | 'defense' | 'special', icon: string, name: string, color: string) => {
        const current = charData.skills[tree];
        const maxPoints = 10;
        // Level‑specific description
        const getLevelDescription = () => {
            if (tree === 'attack') {
                if (current >= 10) return '究極奥義: すべての弾が貫通';
                if (current >= 7) return `クリティカル率 +${Math.min(current - 6, 3) * 5}%`;
                if (current >= 4) return `弾ダメージ +${Math.min(current - 3, 3) * 10}%`;
                if (current >= 1) return `弾速 +${Math.min(current, 3) * 5}%`;
                return '未振り分け';
            } else if (tree === 'defense') {
                if (current >= 10) return '究極奥義: 自動復活 (1回)';
                if (current >= 7) return `ダメージ軽減 +${Math.min(current - 6, 3) * 5}%`;
                if (current >= 4) return `無敵時間 +${Math.min(current - 3, 3) * 10}%`;
                if (current >= 1) return `最大HP +${Math.min(current, 3) * 10}`;
                return '未振り分け';
            } else {
                if (current >= 10) return '究極奥義: アイテム磁石';
                if (current >= 7) return `経験値 +${Math.min(current - 6, 3) * 15}%`;
                if (current >= 4) return `コイン +${Math.min(current - 3, 3) * 10}%`;
                if (current >= 1) return `必殺技チャージ +${Math.min(current, 3) * 10}%`;
                return '未振り分け';
            }
        };
        // General tree description
        const getTreeDescription = () => {
            if (tree === 'attack') return '攻撃系スキル: 弾速・ダメージ・クリティカル率を上げる';
            if (tree === 'defense') return '防御系スキル: HP・無敵時間・ダメージ軽減を上げる';
            return '特殊系スキル: 経験値・コイン・必殺技チャージなどを上げる';
        };

        return (
            <div style={{ background: '#fff', border: `2px solid ${color}`, borderRadius: '12px', padding: '16px', flex: 1, marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '24px' }}>{icon}</span>
                        <h4 style={{ margin: 0 }}>{name}</h4>
                    </div>
                    <div style={{ background: color, color: 'white', padding: '4px 12px', borderRadius: '8px', fontWeight: 'bold' }}>
                        {current}/{maxPoints}
                    </div>
                </div>
                <p style={{ margin: '4px 0 8px 0', color: '#64748b', fontSize: '13px' }}>{getTreeDescription()}</p>
                <p style={{ fontSize: '13px', marginBottom: '12px', minHeight: '40px', color: '#475569' }}>{getLevelDescription()}</p>
                <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginBottom: '12px' }}>
                    <div style={{ width: `${(current / maxPoints) * 100}%`, height: '100%', background: color, transition: 'width 0.3s ease' }} />
                </div>
                <button
                    className="primary"
                    onClick={() => handleAllocate(tree)}
                    disabled={charData.skillPoints <= 0 || current >= maxPoints}
                    style={{
                        width: '100%',
                        opacity: charData.skillPoints <= 0 || current >= maxPoints ? 0.5 : 1,
                        cursor: charData.skillPoints <= 0 || current >= maxPoints ? 'not-allowed' : 'pointer',
                    }}
                >
                    + 振り分ける
                </button>
            </div>
        );
    };

    return (
        <div className="overlay visible" style={{ zIndex: 60 }}>
            <div className="modal-content" style={{ maxWidth: '900px', width: '95%' }}>
                <div className="cardHeader">
                    <h2>🌳 スキルツリー</h2>
                    <button className="ghost" onClick={onClose}>✕</button>
                </div>
                <div className="cardBody" style={{ padding: '24px' }}>
                    {/* Skill Points Display */}
                    <div style={{
                        background: charData.skillPoints > 0 ? '#fef3c7' : '#f3f4f6',
                        border: `2px solid ${charData.skillPoints > 0 ? '#f59e0b' : '#d1d5db'}`,
                        padding: '16px',
                        borderRadius: '12px',
                        marginBottom: '24px',
                        textAlign: 'center',
                    }}>
                        <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>使用可能ポイント</div>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: charData.skillPoints > 0 ? '#92400e' : '#6b7280' }}>
                            ⚡ {charData.skillPoints}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>レベル10ごとに1ポイント獲得</div>
                    </div>
                    {/* Skill Trees */}
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
                        {renderSkillTree('attack', '🗡️', '攻撃', '#ef4444')}
                        {renderSkillTree('defense', '🛡️', '防御', '#3b82f6')}
                        {renderSkillTree('special', '⭐', '特殊', '#a855f7')}
                    </div>
                    {/* Reset Button */}
                    <div style={{ textAlign: 'center' }}>
                        <button
                            className="secondary"
                            onClick={handleReset}
                            disabled={charData.skills.attack + charData.skills.defense + charData.skills.special === 0}
                            style={{
                                opacity: charData.skills.attack + charData.skills.defense + charData.skills.special === 0 ? 0.5 : 1,
                            }}
                        >
                            🔄 スキルリセット (1000コイン)
                        </button>
                    </div>
                </div>
                <div className="footerBtns">
                    <button className="primary" onClick={onClose} style={{ flex: 1 }}>
                        閉じる
                    </button>
                </div>
            </div>
        </div>
    );
};
