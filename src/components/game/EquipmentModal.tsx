import React, { useState, useEffect } from 'react';
import { equipmentItems } from '../../game-core/js/game-data/equipment-data.js';

interface EquipmentModalProps {
    visible: boolean;
    characterKey: string;
    onClose: () => void;
    progression: any; // CharacterProgression instance
}

export const EquipmentModal: React.FC<EquipmentModalProps> = ({ visible, characterKey, onClose, progression }) => {
    const [charData, setCharData] = useState<any>(null);
    const [inventory, setInventory] = useState<any>(null);
    const [updateTrigger, setUpdateTrigger] = useState(0); // Force re-render trigger

    useEffect(() => {
        if (visible && progression) {
            const data = progression.getCharacterData(characterKey);
            setCharData(data);

            const allData = progression.getAllData();
            setInventory(allData.equipmentInventory);
        }
    }, [visible, characterKey, progression, updateTrigger]);

    if (!visible || !charData || !inventory) return null;

    const handleEquip = (itemId: string) => {
        const success = progression.equipItem(characterKey, itemId);
        if (success) {
            // Force refresh
            setUpdateTrigger(prev => prev + 1);
        } else {
            alert('装備できません (スロットが満杯、または既に装備済み)');
        }
    };

    const handleUnequip = (itemId: string) => {
        const success = progression.unequipItem(characterKey, itemId);
        if (success) {
            // Force refresh
            setUpdateTrigger(prev => prev + 1);
        }
    };

    const getRarityColor = (rarity: string) => {
        switch (rarity) {
            case 'L': return '#f59e0b';
            case 'E': return '#a855f7';
            case 'R': return '#3b82f6';
            case 'C': return '#64748b';
            default: return '#64748b';
        }
    };

    const formatEffect = (effects: any) => {
        const parts = [];
        if (effects.moveSpeed) parts.push(`移動速度 +${((effects.moveSpeed - 1) * 100).toFixed(0)}%`);
        if (effects.jumpPower) parts.push(`ジャンプ力 +${((effects.jumpPower - 1) * 100).toFixed(0)}%`);
        if (effects.bulletSpeed) parts.push(`弾速 +${((effects.bulletSpeed - 1) * 100).toFixed(0)}%`);
        if (effects.coinBonus) parts.push(`コイン +${((effects.coinBonus - 1) * 100).toFixed(0)}%`);
        if (effects.expBonus) parts.push(`経験値 +${((effects.expBonus - 1) * 100).toFixed(0)}%`);
        if (effects.ultChargeRate) parts.push(`必殺技 +${((effects.ultChargeRate - 1) * 100).toFixed(0)}%`);
        if (effects.damageReduction) parts.push(`ダメージ軽減 ${(effects.damageReduction * 100).toFixed(0)}%`);
        return parts.join(', ');
    };

    const equippedItems = charData.equippedItems.map((id: string) => equipmentItems[id]).filter(Boolean);
    const ownedItems = Object.keys(inventory)
        .filter(id => inventory[id].owned)
        .map(id => equipmentItems[id])
        .filter(Boolean);

    return (
        <div className="overlay visible" style={{ zIndex: 60 }}>
            <div className="modal-content" style={{ maxWidth: '800px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                <div className="cardHeader">
                    <h2>🎒 装備管理</h2>
                    <button className="ghost" onClick={onClose}>✕</button>
                </div>

                <div className="cardBody" style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
                    {/* Equipped Items */}
                    <div style={{ marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '18px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>装備中</span>
                            <span style={{ fontSize: '14px', color: '#64748b' }}>({charData.equippedItems.length}/3)</span>
                        </h3>

                        {charData.equippedItems.length === 0 ? (
                            <div style={{
                                background: '#f3f4f6',
                                padding: '24px',
                                borderRadius: '12px',
                                textAlign: 'center',
                                color: '#6b7280'
                            }}>
                                装備なし
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gap: '12px' }}>
                                {equippedItems.map((item: any) => (
                                    <div key={item.id} style={{
                                        background: '#fff',
                                        border: `2px solid ${getRarityColor(item.rarity)}`,
                                        borderRadius: '12px',
                                        padding: '16px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                <span style={{ fontSize: '20px' }}>{item.emoji}</span>
                                                <span style={{ fontWeight: 'bold' }}>{item.name}</span>
                                                <span style={{
                                                    background: getRarityColor(item.rarity),
                                                    color: 'white',
                                                    padding: '2px 8px',
                                                    borderRadius: '4px',
                                                    fontSize: '12px',
                                                    fontWeight: 'bold'
                                                }}>
                                                    {item.rarity}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '13px', color: '#64748b' }}>
                                                {formatEffect(item.effects)}
                                            </div>
                                        </div>
                                        <button
                                            className="secondary"
                                            onClick={() => handleUnequip(item.id)}
                                            style={{ marginLeft: '12px' }}
                                        >
                                            外す
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Available Items */}
                    <div>
                        <h3 style={{ fontSize: '18px', marginBottom: '12px' }}>所持アイテム</h3>

                        {ownedItems.length === 0 ? (
                            <div style={{
                                background: '#f3f4f6',
                                padding: '24px',
                                borderRadius: '12px',
                                textAlign: 'center',
                                color: '#6b7280'
                            }}>
                                ガチャから装備を入手しましょう!
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gap: '12px' }}>
                                {ownedItems.map((item: any) => {
                                    const isEquipped = charData.equippedItems.includes(item.id);
                                    return (
                                        <div key={item.id} style={{
                                            background: isEquipped ? '#f3f4f6' : '#fff',
                                            border: `2px solid ${isEquipped ? '#d1d5db' : getRarityColor(item.rarity)}`,
                                            borderRadius: '12px',
                                            padding: '16px',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            opacity: isEquipped ? 0.6 : 1
                                        }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                    <span style={{ fontSize: '20px' }}>{item.emoji}</span>
                                                    <span style={{ fontWeight: 'bold' }}>{item.name}</span>
                                                    <span style={{
                                                        background: getRarityColor(item.rarity),
                                                        color: 'white',
                                                        padding: '2px 8px',
                                                        borderRadius: '4px',
                                                        fontSize: '12px',
                                                        fontWeight: 'bold'
                                                    }}>
                                                        {item.rarity}
                                                    </span>
                                                    {isEquipped && (
                                                        <span style={{
                                                            background: '#10b981',
                                                            color: 'white',
                                                            padding: '2px 8px',
                                                            borderRadius: '4px',
                                                            fontSize: '12px',
                                                            fontWeight: 'bold'
                                                        }}>
                                                            装備中
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: '13px', color: '#64748b' }}>
                                                    {formatEffect(item.effects)}
                                                </div>
                                            </div>
                                            {!isEquipped && (
                                                <button
                                                    className="primary"
                                                    onClick={() => handleEquip(item.id)}
                                                    style={{ marginLeft: '12px' }}
                                                    disabled={charData.equippedItems.length >= 3}
                                                >
                                                    装備
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
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
