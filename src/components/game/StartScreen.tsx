import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { HowToModal } from './HowToModal';

interface StartScreenProps {
    onStart: () => void;
    visible: boolean;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStart, visible }) => {
    const [showHowTo, setShowHowTo] = useState(false);

    if (!visible) return null;

    return (
        <>
            <div id="startScreen" className="startScreen" aria-hidden="false">
                <div className="startScreenInner">
                    <p className="startScreenTitle">走る準備はいい？</p>
                    <div className="primaryBtns">
                        <button id="start" onClick={onStart} className="cta">スタート</button>
                        <button id="howto" className="ghost" onClick={() => setShowHowTo(true)}>遊び方</button>
                    </div>

                    <div className="footerBtns resultLinks" style={{ marginTop: '16px', justifyContent: 'center', gap: '8px' }}>
                        <Link to="/leaderboard"><button className="secondary" style={{ minWidth: 'auto', padding: '8px 12px', fontSize: '14px' }}>🏆 ランキング</button></Link>
                        <Link to="/comments"><button className="secondary" style={{ minWidth: 'auto', padding: '8px 12px', fontSize: '14px' }}>💬 コメント</button></Link>
                    </div>
                    <div className="footerBtns resultLinks" style={{ marginTop: '8px', justifyContent: 'center', gap: '8px' }}>
                        <Link to="/history"><button className="ghost" style={{ minWidth: 'auto', padding: '8px 12px', fontSize: '13px' }}>📜 履歴</button></Link>
                        <Link to="/stats"><button className="ghost" style={{ minWidth: 'auto', padding: '8px 12px', fontSize: '13px' }}>📊 統計</button></Link>
                        <Link to="/settings"><button className="ghost" style={{ minWidth: 'auto', padding: '8px 12px', fontSize: '13px' }}>⚙️ 設定</button></Link>
                    </div>
                </div>
            </div>

            <HowToModal visible={showHowTo} onClose={() => setShowHowTo(false)} />
        </>
    );
};
