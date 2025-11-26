
import { logger } from '../utils/Logger';

const STORAGE_KEY = 'psr_collection';

export interface CollectionState {
    items: Record<string, number>;
    enemies: Record<string, number>;
    bosses: Record<string, number>;
}

export class CollectionSystem {
    private state: CollectionState;

    constructor() {
        this.state = {
            items: {},
            enemies: {},
            bosses: {}
        };
        this.load();
    }

    load() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                this.state = {
                    items: parsed.items || {},
                    enemies: parsed.enemies || {},
                    bosses: parsed.bosses || {}
                };
            }
        } catch (e) {
            logger.error('Failed to load collection data', e);
        }
    }

    save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
        } catch (e) {
            logger.error('Failed to save collection data', e);
        }
    }

    unlockItem(id: string) {
        if (!id) return;
        if (!this.state.items[id]) {
            this.state.items[id] = 0;
        }
        this.state.items[id]++;
        this.save();
    }

    unlockEnemy(id: string) {
        if (!id) return;
        if (!this.state.enemies[id]) {
            this.state.enemies[id] = 0;
        }
        this.state.enemies[id]++;
        this.save();
    }

    unlockBoss(id: string) {
        if (!id) return;
        if (!this.state.bosses[id]) {
            this.state.bosses[id] = 0;
        }
        this.state.bosses[id]++;
        this.save();
    }

    getCollection() {
        return this.state;
    }

    hasItem(id: string): boolean {
        return !!this.state.items[id];
    }

    hasEnemy(id: string): boolean {
        return !!this.state.enemies[id];
    }

    hasBoss(id: string): boolean {
        return !!this.state.bosses[id];
    }
}
