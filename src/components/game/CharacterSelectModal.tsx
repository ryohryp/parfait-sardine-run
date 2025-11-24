import React, { useState } from 'react';
import type { GachaSystem } from '../../game-core/js/game/GachaSystem.js';
import { characters, rarOrder, SPECIAL_LABELS, ULT_DETAILS } from '../../game-core/js/game-data/characters.js';

interface CharacterSelectModalProps {
    visible: boolean;
    onClose: () => void;
    gachaSystem: GachaSystem;
    onCharacterChange: (key: string) => void;
}

export const CharacterSelectModal: React.FC<CharacterSelectModalProps> = ({
    visible,
    onClose,
    gachaSystem,
    onCharacterChange
}) => {
    const [selectedKey, setSelectedKey] = useState<string>(gachaSystem.collection.current);

    if (!visible) return null;

    const collection = gachaSystem.collection;
    const ownedKeys = Object.keys(collection.owned || {}).filter(key => collection.owned[key]?.owned);
    const sortedChars = ownedKeys
        .map(key => characters[key])
        .filter(Boolean)
        .sort((a, b) => {
            const ra = rarOrder.indexOf(a.rar);
            const rb = rarOrder.indexOf(b.rar);
            if (ra !== rb) return rb - ra; // Reverse order for rarity (M -> C)
            return a.name.localeCompare(b.name, 'ja');
        });

    const selectedChar = characters[selectedKey];
    const selectedOwned = collection.owned[selectedKey];

    const handleSelect = (key: string) => {
        setSelectedKey(key);
    };

    const handleConfirm = () => {
        if (gachaSystem.setCurrentChar(selectedKey)) {
            onCharacterChange(selectedKey);
            onClose();
        }
    };

    const handleClose = () => {
        setSelectedKey(gachaSystem.collection.current);
        onClose();
    };

    return (
        <div className="overlay show" onClick={handleClose}>
            <div className="cardWrap preGameCard" onClick={(e) => e.stopPropagation()}>
                <div className="cardHeader">
                    <h2>👤 キャラクター選択</h2>
                    <button className="ghost" onClick={handleClose}>✕</button>
                </div>

                <div className="cardBody">
                    <div className="preGameBody">
                        {/* Character List */}
                        <div>
                            <h3 style={{ margin: '0 0 10px', fontSize: '16px' }}>所持キャラクター</h3>
                            <div className="preGameList">
                                {sortedChars.length === 0 ? (
                                    <div className="preGameEmpty">
                                        キャラを入手するとここに表示されます。
                                    </div>
                                ) : (
                                    sortedChars.map(char => {
                                        const isSelected = char.key === selectedKey;
                                        const owned = collection.owned[char.key];

                                        return (
                                            <button
                                                key={char.key}
                                                type="button"
                                                className={`preCharCard ${isSelected ? 'isSelected' : ''}`}
                                                onClick={() => handleSelect(char.key)}
                                            >
                                                <span className="emoji">{char.emoji}</span>
                                                <span className="name">{char.name}</span>
                                                <span className="rar">[{char.rar}]</span>
                                                {owned && owned.dup > 0 && (
                                                    <span style={{ fontSize: '11px', color: '#60a5fa', marginTop: '4px' }}>
                                                        凸{owned.dup} LB:{owned.limit.toFixed(2)}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Character Details */}
                        {selectedChar && (
                            <div className="preGameInfo">
                                <div className="preGameSummary">
                                    {selectedChar.emoji} {selectedChar.name}
                                </div>

                                {/* Ultimate */}
                                <div>
                                    <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px', opacity: 0.8 }}>
                                        必殺技
                                    </div>
                                    <p className="preGameUlt">
                                        {selectedChar.ult ? (
                                            <>
                                                <strong>{ULT_DETAILS[selectedChar.ult]?.name || selectedChar.ult}</strong>
                                                <br />
                                                {ULT_DETAILS[selectedChar.ult]?.description || '固有必殺技を発動できます。'}
                                            </>
                                        ) : (
                                            <>
                                                <strong>必殺技なし</strong>
                                                <br />
                                                このキャラは必殺技を持たず、基礎能力で勝負します。
                                            </>
                                        )}
                                    </p>
                                </div>

                                {/* Special Abilities */}
                                <div>
                                    <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px', opacity: 0.8 }}>
                                        特殊能力
                                    </div>
                                    <div className="preGameSpecial">
                                        {selectedChar.special && selectedChar.special.length > 0 ? (
                                            selectedChar.special.map((code: string) => (
                                                <span key={code}>{SPECIAL_LABELS[code] || code}</span>
                                            ))
                                        ) : (
                                            <span>特性なし</span>
                                        )}
                                    </div>
                                </div>

                                {/* Stats */}
                                <div>
                                    <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px', opacity: 0.8 }}>
                                        基礎ステータス
                                    </div>
                                    <ul className="preGameStats">
                                        <li>
                                            <span>移動速度</span>
                                            <span className="value">{(selectedChar.move * 100).toFixed(0)}%</span>
                                        </li>
                                        <li>
                                            <span>ジャンプ力</span>
                                            <span className="value">{(selectedChar.jump * 100).toFixed(0)}%</span>
                                        </li>
                                        <li>
                                            <span>攻撃力</span>
                                            <span className="value">{(selectedChar.bullet * 100).toFixed(0)}%</span>
                                        </li>
                                        <li>
                                            <span>必殺技率</span>
                                            <span className="value">{(selectedChar.ultRate * 100).toFixed(0)}%</span>
                                        </li>
                                        {selectedOwned && selectedOwned.limit > 0 && (
                                            <li style={{ color: '#60a5fa' }}>
                                                <span>限界突破</span>
                                                <span className="value">+{(selectedOwned.limit * 100).toFixed(1)}%</span>
                                            </li>
                                        )}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="footerBtns" style={{ justifyContent: 'space-between' }}>
                    <button className="ghost" onClick={handleClose}>
                        キャンセル
                    </button>
                    <button
                        className="cta"
                        onClick={handleConfirm}
                        disabled={!selectedChar}
                    >
                        このキャラで決定
                    </button>
                </div>
            </div>
        </div>
    );
};
