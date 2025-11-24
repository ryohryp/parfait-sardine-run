export class ScoreSystem {
    comboCount: number;
    comboMultiplier: number;
    lastComboTime: number;
    feverGauge: number;
    feverModeUntil: number;
    constructor();
    awardEnemyDefeat(baseScore?: number): number;
    updateComboMultiplier(): void;
    resetCombo(): void;
    addFeverGauge(amount: number): boolean;
    activateFever(): void;
    isFeverActive(): boolean;
    isComboActive(): boolean;
    getState(): {
        comboCount: number;
        comboMultiplier: number;
        feverGauge: number;
        isFever: boolean;
        isComboActive: boolean;
    };
    reset(): void;
}
