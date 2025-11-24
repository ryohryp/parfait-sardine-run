export class GameRenderer {
    constructor(canvas: HTMLCanvasElement);
    drawBackground(level: number): void;
    drawEntities(player: any, enemies: any, items: any, projectiles: any, companion: any, particles: any, invUntil: number, hurtUntil: number): void;
    drawFeverEffect(feverModeUntil: number): void;
    drawUltEffect(ultType: string, player: any, ultActiveUntil: number): void;
    drawComboText(comboCount: number, comboMultiplier: number, lastComboTime: number): void;
    render(gameState: any): void;
}
