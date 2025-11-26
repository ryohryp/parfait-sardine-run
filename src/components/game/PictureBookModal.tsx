
import React, { useState, useEffect } from 'react';
import './PictureBookModal.css';
import { COLLECTION_ITEMS, COLLECTION_ENEMIES, COLLECTION_BOSSES } from '../../game-core/js/game-data/CollectionData';
import { CollectionSystem } from '../../game-core/js/game/CollectionSystem';

interface PictureBookModalProps {
    visible: boolean;
    onClose: () => void;
}

type Tab = 'items' | 'enemies' | 'bosses';

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
        } else {
            data = COLLECTION_BOSSES;
            counts = collectionData.bosses;
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
                            <div className="pb-detail-stat">発見数: {selectedItem.count}</div>
                            <div className="pb-detail-desc">{selectedItem.desc}</div>
                            <button className="pb-close-btn" onClick={() => setSelectedItem(null)}>OK</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
