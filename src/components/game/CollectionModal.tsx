import React from 'react';
import { characters, rarClass, rarOrder } from '../../game-core/js/game-data/characters';

interface CollectionModalProps {
    visible: boolean;
    collection: any;
    onClose: () => void;
}

export const CollectionModal: React.FC<CollectionModalProps> = ({ visible, collection, onClose }) => {
    if (!visible) return null;

    const sortedChars = Object.values(characters).sort((a, b) => {
        const rarA = rarOrder.indexOf(a.rar);
        const rarB = rarOrder.indexOf(b.rar);
        return rarB - rarA; // High rarity first
    });

    return (
        <div className="overlay visible" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
                <h2>Collection</h2>
                <div className="collection-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px', marginTop: '20px' }}>
                    {sortedChars.map(char => {
                        const ownedData = collection.owned[char.key];
                        const isOwned = !!ownedData;
                        const limit = ownedData?.limit || 0;

                        return (
                            <div
                                key={char.key}
                                className={`char-card ${isOwned ? rarClass(char.rar) : ''}`}
                                style={{
                                    background: isOwned ? '#fff' : '#1e293b',
                                    padding: '10px',
                                    borderRadius: '8px',
                                    textAlign: 'center',
                                    opacity: isOwned ? 1 : 0.5,
                                    border: isOwned ? '2px solid transparent' : '2px dashed #475569',
                                    position: 'relative'
                                }}
                            >
                                <div style={{ fontSize: '32px', marginBottom: '4px' }}>{char.emoji}</div>
                                <div style={{ fontSize: '12px', fontWeight: 'bold', color: isOwned ? '#1e293b' : '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {char.name}
                                </div>
                                {isOwned && (
                                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
                                        Lv. {1 + Math.floor(limit * 10)}
                                    </div>
                                )}
                                {!isOwned && <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>???</div>}
                            </div>
                        );
                    })}
                </div>
                <button className="secondary" onClick={onClose} style={{ marginTop: '24px', width: '100%' }}>
                    Close
                </button>
            </div>
        </div>
    );
};
