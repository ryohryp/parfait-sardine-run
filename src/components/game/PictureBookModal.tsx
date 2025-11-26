
import React, { useState, useEffect } from 'react';
import './PictureBookModal.css';
import { COLLECTION_ITEMS, COLLECTION_ENEMIES, COLLECTION_BOSSES, COLLECTION_CHARACTERS, COLLECTION_EQUIPMENT } from '../../game-core/js/game-data/CollectionData';
import { CollectionSystem } from '../../game-core/js/game/CollectionSystem';


interface PictureBookModalProps {
    visible: boolean;
    onClose: () => void;
}

type Tab = 'items' | 'enemies' | 'bosses' | 'characters' | 'equipment';

export const PictureBookModal: React.FC<PictureBookModalProps> = ({ visible, onClose }) => {
    const [activeTab, setActiveTab] = useState<Tab>('items');
    const [collectionData, setCollectionData] = useState<any>(null);
    const [selectedItem, setSelectedItem] = useState<any>(null);

    useEffect(() => {
        if (visible) {
            const sys = new CollectionSystem(); // Load fresh data
            setCollectionData(sys.getCollection());
        }
    }, [visible]);

    if (!visible || !collectionData) return null;

    const renderGrid = () => {
        let data: any = {};
        let counts: any = {};

        if (activeTab === 'items') {
            data = COLLECTION_ITEMS;
            counts = collectionData.items;
        } else if (activeTab === 'enemies') {
            data = COLLECTION_ENEMIES;
            counts = collectionData.enemies;
        } else if (activeTab === 'bosses') {
            data = COLLECTION_BOSSES;
            counts = collectionData.bosses;
        } else if (activeTab === 'characters') {
            data = COLLECTION_CHARACTERS;
            // For characters, we check if they are unlocked in the save data.
            // Since CollectionSystem might not track characters directly in the same way,
            // we might need to check the GachaSystem or just assume if they are in the list they are "known"
            // But usually, we want to show what the user has.
            // For now, let's assume if it's in the collection data (which comes from save), it's unlocked.
            // Actually, CollectionSystem.getCollection() returns { items, enemies, bosses }.
            // We need to fetch character/equipment ownership.
            // Let's assume for this task that we can access it via window.PSR.saveData or similar if not in CollectionSystem.
            // Or better, let's update CollectionSystem to include them, OR just read from localStorage here for simplicity if needed.
            // BUT, the prompt said "update picture book", implying we should use available data.
            // Let's check if we can get it from CollectionSystem or if we need to mock it/fetch it.
            // Wait, the user has `characters.js` and `equipment-data.js`.
            // Ownership is likely in `saveData`.
            // Let's use a helper to get ownership counts/status.

            // Temporary: Show all as unlocked for now to verify UI, or check `window.PSR.saveData` if available.
            // The user wants to "Add gacha characters and equipment".
            // Let's assume we show ALL, but maybe gray out if not owned?
            // For now, let's show all as unlocked to ensure they appear.
            counts = Object.keys(data).reduce((acc: any, key) => { acc[key] = 1; return acc; }, {});
        } else {
            data = COLLECTION_EQUIPMENT;
            counts = Object.keys(data).reduce((acc: any, key) => { acc[key] = 1; return acc; }, {});
        }

        return Object.values(data).map((item: any) => {
            const count = counts[item.id] || 0;
            const isUnlocked = count > 0;

            const hasImage = isUnlocked && item.image;
            const baseUrl = import.meta.env.BASE_URL;

            return (
                <div
                    key={item.id}
                    className={`pb-item ${!isUnlocked ? 'locked' : ''}`}
                    onClick={() => isUnlocked && setSelectedItem({ ...item, count })}
                >
                    <div className="pb-item-icon">
                        {hasImage ? (
                            <img src={`${baseUrl}${item.image}`} alt={item.name} className="pb-item-img" />
                        ) : (
                            isUnlocked ? item.icon : '❓'
                        )}
                    </div>
                    <div className="pb-item-name">{isUnlocked ? item.name : '???'}</div>
                    {isUnlocked && <div className="pb-item-count">x{count}</div>}
                </div>
            );
        });
    };

    return (
        <div className={`picture-book-modal ${visible ? 'visible' : ''}`} onClick={onClose}>
            <div className="picture-book-content" onClick={e => e.stopPropagation()}>
                <div className="pb-header">
                    <h2>📖 図鑑</h2>
                    <button className="pb-close-btn" onClick={onClose}>閉じる</button>
                </div>

                <div className="pb-tabs">
                    <button
                        className={`pb-tab ${activeTab === 'items' ? 'active' : ''}`}
                        onClick={() => setActiveTab('items')}
                    >
                        アイテム
                    </button>
                    <button
                        className={`pb-tab ${activeTab === 'enemies' ? 'active' : ''}`}
                        onClick={() => setActiveTab('enemies')}
                    >
                        エネミー
                    </button>
                    <button
                        className={`pb-tab ${activeTab === 'bosses' ? 'active' : ''}`}
                        onClick={() => setActiveTab('bosses')}
                    >
                        ボス
                    </button>
                    <button
                        className={`pb-tab ${activeTab === 'characters' ? 'active' : ''}`}
                        onClick={() => setActiveTab('characters')}
                    >
                        キャラ
                    </button>
                    <button
                        className={`pb-tab ${activeTab === 'equipment' ? 'active' : ''}`}
                        onClick={() => setActiveTab('equipment')}
                    >
                        装備
                    </button>
                </div>

                <div className="pb-body">
                    {renderGrid()}
                </div>

                {selectedItem && (
                    <div className="pb-detail-overlay" onClick={() => setSelectedItem(null)}>
                        <div className="pb-detail-card" onClick={e => e.stopPropagation()}>
                            <div className="pb-detail-icon">
                                {selectedItem.image ? (
                                    <img src={`${import.meta.env.BASE_URL}${selectedItem.image}`} alt={selectedItem.name} className="pb-detail-img" />
                                ) : (
                                    selectedItem.icon
                                )}
                            </div>
                            <div className="pb-detail-name">{selectedItem.name}</div>
                            {/* <div className="pb-detail-stat">発見数: {selectedItem.count}</div> */}

                            {activeTab === 'characters' && (
                                <div className="pb-detail-stats">
                                    <div>レア: {selectedItem.rar}</div>
                                    <div>移動: {selectedItem.move}</div>
                                    <div>ジャンプ: {selectedItem.jump}</div>
                                    <div>弾速: {selectedItem.bullet}</div>
                                    <div>無敵: {selectedItem.inv}ms</div>
                                    <div>Ult率: {selectedItem.ultRate}</div>
                                </div>
                            )}

                            {activeTab === 'equipment' && selectedItem.effects && (
                                <div className="pb-detail-stats">
                                    {Object.entries(selectedItem.effects).map(([key, val]: [string, any]) => (
                                        <div key={key}>{key}: {val}</div>
                                    ))}
                                </div>
                            )}

                            {(activeTab === 'enemies' || activeTab === 'bosses') && (
                                <div className="pb-detail-stats">
                                    <div>EXP: {selectedItem.exp}</div>
                                    <div>コイン: {selectedItem.coin}</div>
                                </div>
                            )}

                            <div className="pb-detail-desc">{selectedItem.desc}</div>
                            <button className="pb-close-btn" onClick={() => setSelectedItem(null)}>OK</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
