import { Game } from './Game.js';
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
     * Gameインスタンスを作成し、依存関係を注入します。
     * @param {HTMLCanvasElement} canvas 
     * @param {Object} callbacks 
     * @param {Object} overrides テスト用のモックなどを注入する場合に使用
     * @returns {Game}
     */
    static create(canvas, callbacks, overrides = {}) {
        // 依存関係の構築
        // overridesに指定があればそれを使用し、なければデフォルトのクラスをインスタンス化

        const input = overrides.input || new InputManager();
        const particles = overrides.particles || new ParticleSystem(canvas);

        // Playerはcanvasとparticlesに依存
        const player = overrides.player || new Player(canvas, particles);

        const enemies = overrides.enemies || new EnemyManager(canvas);
        const items = overrides.items || new ItemManager(canvas);
        const projectiles = overrides.projectiles || new ProjectileManager(canvas);
        const gacha = overrides.gacha || new GachaSystem();

        // CompanionはPlayerに依存
        const companion = overrides.companion || new Companion(player);

        const missions = overrides.missions || new MissionManager();

        // システムクラスの生成はGameインスタンスが必要な場合があるため、
        // ここではクラス定義またはファクトリ関数を渡すか、
        // Gameコンストラクタ内で生成するか検討が必要。
        // 今回はGameコンストラクタで依存オブジェクトを受け取る形にするため、
        // 循環参照を避けるために、Gameインスタンスを必要としないものはここで生成。
        // CollisionSystemとGameRendererはGameインスタンスを必要とするため、
        // Gameのコンストラクタ内で生成するか、setterで注入する。

        // ScoreSystemは依存なし
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
            // CollisionSystemとGameRendererはGame内で生成されるか、
            // Game生成後に注入する必要があるが、
            // Gameのコンストラクタで `this` を渡して生成するのが一般的。
            // テスト時はモックを渡せるようにする。
            collisionSystemClass: overrides.collisionSystemClass || CollisionSystem,
            rendererClass: overrides.rendererClass || GameRenderer
        };

        return new Game(canvas, callbacks, dependencies);
    }
}
