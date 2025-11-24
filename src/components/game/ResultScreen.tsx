import React from 'react';

interface ResultScreenProps {
    result: {
        score: number;
        level: number;
        coins: number;
        newBest: boolean;
    };
    onRetry: () => void;
    onMenu: () => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({ result, onRetry, onMenu }) => {
    return (
        <div id="resultOverlay" className="overlay visible">
            <div className="modal-content">
                <div className="cardHeader" style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <h2>RESULT</h2>
                </div>
                <div className="cardBody resultBody" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                    <div className="resultSummary" style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '12px' }}>
                        <div className="resRow" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', marginBottom: '8px' }}>
                            <span className="resLabel" style={{ color: 'var(--primary)' }}>SCORE</span>
                            <span className="resValue" style={{ fontWeight: 'bold' }}>{result.score.toLocaleString()}</span>
                        </div>
                        {result.newBest && <div className="resNewBest" style={{ color: 'var(--accent)', textAlign: 'center', fontWeight: 'bold', marginBottom: '8px' }}>✨ NEW RECORD! ✨</div>}
                        <div className="resRow" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', opacity: 0.8 }}>
                            <span className="resLabel">LEVEL</span>
                            <span className="resValue">{result.level}</span>
                        </div>
                        <div className="resRow" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', opacity: 0.8 }}>
                            <span className="resLabel">COINS</span>
                            <span className="resValue">+{result.coins}</span>
                        </div>
                    </div>
                </div>
                <div className="footerBtns resultPrimary" style={{ display: 'flex', gap: '12px' }}>
                    <button id="resultRetry" className="primary" onClick={onRetry} style={{ flex: 1 }}>RETRY</button>
                    <button id="resultMenu" className="secondary" onClick={onMenu} style={{ flex: 1 }}>MENU</button>
                </div>
            </div>
        </div>
    );
};
