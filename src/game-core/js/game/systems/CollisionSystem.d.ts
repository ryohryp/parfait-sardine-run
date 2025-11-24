export class CollisionSystem {
    constructor(game: any);
    AABB(a: { x: number, y: number, w: number, h: number }, b: { x: number, y: number, w: number, h: number }): boolean;
    checkPlayerItemCollisions(): void;
    checkPlayerPowerCollisions(): void;
    checkPlayerEnemyCollisions(): void;
    checkBossCollisions(): void;
    checkBossProjectileCollisions(): void;
    checkAll(): void;
}
