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
        <div id="resultOverlay" className="overlay show" style={{ display: 'block' }}>
            <div className="cardWrap">
                <div className="cardHeader">
                    <h2>リザルト</h2>
                </div>
                <div className="cardBody resultBody">
                    <div id="resultSummary" className="resultSummary">
                        <div className="resRow">
                            <span className="resLabel">SCORE</span>
                            <span className="resValue">{result.score.toLocaleString()}</span>
                        </div>
                        {result.newBest && <div className="resNewBest">NEW RECORD!</div>}
                        <div className="resRow">
                            <span className="resLabel">LEVEL</span>
                            <span className="resValue">{result.level}</span>
                        </div>
                        <div className="resRow">
                            <span className="resLabel">COINS</span>
                            <span className="resValue">+{result.coins}</span>
                        </div>
                    </div>
                </div>
                <div className="footerBtns resultPrimary">
                    <button id="resultRetry" className="secondary cta" onClick={onRetry}>もう一度挑戦</button>
                    <button id="resultMenu" className="ghost cta" onClick={onMenu}>メニューに戻る</button>
                </div>
            </div>
        </div>
    );
};
