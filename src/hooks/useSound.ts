import { useCallback } from 'react';
import { SoundManager } from '../game-core/js/game/SoundManager';

export const useSound = () => {
    const soundManager = SoundManager.getInstance();

    const playClick = useCallback(() => {
        soundManager.playClick();
    }, [soundManager]);

    const playCoin = useCallback(() => {
        soundManager.playCoin();
    }, [soundManager]);

    const playAchievement = useCallback(() => {
        soundManager.playAchievement();
    }, [soundManager]);

    const playSuccess = useCallback(() => {
        soundManager.playSuccess();
    }, [soundManager]);

    const playUltraRare = useCallback(() => {
        soundManager.playUltraRare();
    }, [soundManager]);

    const playBgm = useCallback((url: string) => {
        soundManager.playBgm(url);
    }, [soundManager]);

    const stopBgm = useCallback(() => {
        soundManager.stopBgm();
    }, [soundManager]);

    return {
        playClick,
        playCoin,
        playAchievement,
        playSuccess,
        playUltraRare,
        playBgm,
        stopBgm
    };
};
