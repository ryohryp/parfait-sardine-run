import React from 'react';
import { GameCanvas } from '../components/game/GameCanvas';

export const GamePage: React.FC = () => {
    return (
        <div className="game-page">
            <GameCanvas />
        </div>
    );
};
