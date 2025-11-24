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
            <div id="startScreen" className="overlay visible" style={{ pointerEvents: 'auto' }}>
                <div className="modal-content" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
                    <h1 className="startScreenTitle">PARFAIT SARDINE RUN</h1>
                    <p style={{ opacity: 0.8 }}>Ready to run?</p>

                    <div className="primaryBtns" style={{ display: 'flex', gap: '12px', justifyContent: 'center', width: '100%' }}>
                        <button id="start" onClick={onStart} className="primary" style={{ flex: 1, fontSize: '18px', padding: '16px' }}>START</button>
                    </div>

                    <button id="howto" className="secondary" onClick={() => setShowHowTo(true)} style={{ width: '100%' }}>
                        📖 How to Play
                    </button>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%', marginTop: '8px' }}>
                        <Link to="/leaderboard"><button className="secondary" style={{ width: '100%', fontSize: '14px' }}>🏆 Ranking</button></Link>
                        <Link to="/comments"><button className="secondary" style={{ width: '100%', fontSize: '14px' }}>💬 Comments</button></Link>
                        <Link to="/history"><button className="secondary" style={{ width: '100%', fontSize: '14px' }}>📜 History</button></Link>
                        <Link to="/stats"><button className="secondary" style={{ width: '100%', fontSize: '14px' }}>📊 Stats</button></Link>
                    </div>

                    <Link to="/settings" style={{ width: '100%' }}><button className="secondary" style={{ width: '100%', fontSize: '14px' }}>⚙️ Settings</button></Link>
                </div>
            </div>

            <HowToModal visible={showHowTo} onClose={() => setShowHowTo(false)} />
        </>
    );
};
