import { Game, type GameCallbacks } from './Game';
import { InputManager } from './InputManager.js';
import { ParticleSystem } from './ParticleSystem.js';
import { Player } from './Player.js';
import { EnemyManager } from './EnemyManager.js';
import { ItemManager } from './ItemManager.js';
import { ProjectileManager } from './ProjectileManager.js';
import { GachaSystem } from './GachaSystem.js';
import { Companion } from './Companion.js';
import { MissionManager } from './MissionManager.js';
import { CollisionSystem } from './systems/CollisionSystem.js';
import { ScoreSystem } from './systems/ScoreSystem.js';
import { GameRenderer } from './systems/GameRenderer.js';

export class GameFactory {
    /**
     * Create Game instance and inject dependencies.
     */
    static create(canvas: HTMLCanvasElement, callbacks: GameCallbacks, overrides: any = {}): Game {
        // Dependency construction
        // Use overrides if provided, otherwise instantiate default classes

        const input = overrides.input || new InputManager();
        const particles = overrides.particles || new ParticleSystem(canvas);

        // Player depends on canvas and particles
        const player = overrides.player || new Player(canvas, particles);

        const enemies = overrides.enemies || new EnemyManager(canvas);
        const items = overrides.items || new ItemManager(canvas);
        const projectiles = overrides.projectiles || new ProjectileManager(canvas);
        const gacha = overrides.gacha || new GachaSystem();

        // Companion depends on Player
        const companion = overrides.companion || new Companion(player);

        const missions = overrides.missions || new MissionManager();

        // ScoreSystem has no dependencies
        const scoreSystem = overrides.scoreSystem || new ScoreSystem();

        const dependencies = {
            input,
            particles,
            player,
            enemies,
            items,
            projectiles,
            gacha,
            companion,
            missions,
            scoreSystem,
            // CollisionSystem and GameRenderer are created inside Game or injected via class
            collisionSystemClass: overrides.collisionSystemClass || CollisionSystem,
            rendererClass: overrides.rendererClass || GameRenderer
        };

        return new Game(canvas, callbacks, dependencies);
    }
}
