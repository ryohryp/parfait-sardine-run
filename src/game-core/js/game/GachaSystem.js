
import { characters, rarOrder, rarClass } from '../game-data/characters.js';
import { equipmentItems } from '../game-data/equipment-data.js';
import { CharacterProgression } from './CharacterProgression.js';
import { ErrorHandler } from '../utils/ErrorHandler.js';
import { logger } from '../utils/Logger.js';

const COIN_KEY = 'psrun_coin_balance_v1';
const STORE_KEY = 'psrun_char_collection_v1';
const PITY_KEY = 'psrun_pity_v1';

export class GachaSystem {
    constructor() {
        this.coins = this.loadCoinBalance();
        this.collection = this.loadCollection();
        this.pity = this.loadPity();
        this.progression = new CharacterProgression();

        if (!this.collection.owned[this.collection.current]) {
            this.collection.current = 'parfen';
            this.collection.owned.parfen = { owned: true, dup: 0, limit: 0 };
            this.saveCollection();
        }

        // Initialize progression for starter character
        this.progression.initializeCharacter('parfen');
    }

    loadCoinBalance() {
        const coins = ErrorHandler.safely(() => {
            const raw = localStorage.getItem(COIN_KEY);
            if (raw != null) {
                const value = Number(raw);
                if (Number.isFinite(value)) {
                    return Math.max(0, Math.floor(value));
                }
            }
            return null;
        }, 'GachaSystem.loadCoinBalance', null);

        if (coins !== null) {
            logger.debug('Coins loaded', { coins });
            return coins;
        }
        logger.info('No saved coins found, starting with 0');
        return 0;
    }

    saveCoinBalance(value) {
        this.coins = Math.max(0, Math.floor(Number(value) || 0));
        ErrorHandler.safely(() => {
            localStorage.setItem(COIN_KEY, `${this.coins}`);
            logger.debug('Coins saved', { coins: this.coins });
        }, 'GachaSystem.saveCoinBalance');
    }

    loadCollection() {
        const collection = ErrorHandler.safely(() => {
            const s = localStorage.getItem(STORE_KEY);
            if (s) {
                return JSON.parse(s);
            }
            return null;
        }, 'GachaSystem.loadCollection', null);

        if (collection !== null) {
            logger.info('Collection loaded', {
                ownedCount: Object.keys(collection.owned || {}).length,
                current: collection.current
            });
            return collection;
        }
        logger.info('No saved collection found, starting with parfen');
        return { current: 'parfen', owned: { parfen: { owned: true, dup: 0, limit: 0 } } };
    }

    saveCollection() {
        ErrorHandler.safely(() => {
            localStorage.setItem(STORE_KEY, JSON.stringify(this.collection));
            logger.debug('Collection saved', {
                ownedCount: Object.keys(this.collection.owned || {}).length
            });
        }, 'GachaSystem.saveCollection');
    }

    loadPity() {
        const pity = ErrorHandler.safely(() => {
            const s = localStorage.getItem(PITY_KEY);
            if (s) {
                return JSON.parse(s);
            }
            return null;
        }, 'GachaSystem.loadPity', null);

        if (pity !== null) {
            logger.debug('Pity loaded', pity);
            return pity;
        }
        logger.info('No saved pity found, starting fresh');
        return { sinceL: 0, sinceM: 0 };
    }

    savePity() {
        ErrorHandler.safely(() => {
            localStorage.setItem(PITY_KEY, JSON.stringify(this.pity));
            logger.debug('Pity saved', this.pity);
        }, 'GachaSystem.savePity');
    }

    addCoins(amount) {
        this.saveCoinBalance(this.coins + amount);
    }

    rollRarity() {
        const p = Math.random();
        if (p < 0.01) return 'M';
        if (p < 0.06) return 'L';
        if (p < 0.16) return 'E';
        if (p < 0.40) return 'R';
        return 'C';
    }

    rollCharByRar(r) {
        const pool = Object.values(characters).filter(c => c.rar === r);
        return pool[Math.floor(Math.random() * pool.length)];
    }

    doGacha(n) {
        const cost = n === 10 ? 100 : 10;
        if (this.coins < cost) return null;

        this.saveCoinBalance(this.coins - cost);

        let rarities = [];
        for (let i = 0; i < n; i++) {
            let r = this.rollRarity();
            if (this.pity.sinceL >= 29 && i === 0) r = (Math.random() < 0.167) ? 'M' : 'L';
            rarities.push(r);
        }
        if (this.pity.sinceM >= 99) rarities[rarities.length - 1] = 'M';

        const results = rarities.map(r => {
            const ch = this.rollCharByRar(r);
            const status = this.addToCollection(ch.key);

            if (r === 'M') { this.pity.sinceM = 0; this.pity.sinceL = 0; }
            else if (r === 'L') { this.pity.sinceL = 0; this.pity.sinceM++; }
            else { this.pity.sinceL++; this.pity.sinceM++; }

            // Randomly add equipment item (10% chance for single pull, guaranteed in 10-pull)
            let equipment = null;
            if (n === 10 || Math.random() < 0.1) {
                equipment = this.rollEquipment(r);
                if (equipment) {
                    const isNewEquip = this.progression.addEquipmentToInventory(equipment.id);
                    status.equipment = { item: equipment, isNew: isNewEquip };
                }
            }

            return { char: ch, ...status };
        });

        this.savePity();
        return results;
    }

    addToCollection(key) {
        let isNew = false;
        let isLimitBreak = false;
        let limitBreakPerformed = false;

        if (!this.collection.owned[key]) {
            this.collection.owned[key] = { owned: true, dup: 0, limit: 0 };
            isNew = true;
            // Initialize progression for new character
            this.progression.initializeCharacter(key);
        } else {
            this.collection.owned[key].dup++;
            const rar = characters[key].rar;
            const inc = rar === 'M' ? 0.04 : rar === 'L' ? 0.03 : rar === 'E' ? 0.025 : rar === 'R' ? 0.015 : 0.005;
            this.collection.owned[key].limit = +(this.collection.owned[key].limit + inc).toFixed(3);

            // NEW: Perform limit break on duplicate
            limitBreakPerformed = this.progression.limitBreak(key);
            isLimitBreak = limitBreakPerformed;

            // If max limit breaks reached, exp is already added by CharacterProgression
            logger.info('Duplicate character obtained', {
                key,
                limitBreakPerformed,
                dup: this.collection.owned[key].dup
            });
        }
        this.saveCollection();
        return { isNew, isLimitBreak, limitBreakPerformed };
    }

    setCurrentChar(key) {
        if (this.collection.owned[key]) {
            this.collection.current = key;
            this.saveCollection();
            // Initialize progression if not exists
            this.progression.initializeCharacter(key);
            return true;
        }
        return false;
    }

    /**
     * Roll for equipment item based on character rarity
     * @param {string} charRarity 
     * @returns {Object|null}
     */
    rollEquipment(charRarity) {
        // Match equipment rarity to character rarity with some variation
        let targetRarity;
        const roll = Math.random();

        if (charRarity === 'M') {
            targetRarity = roll < 0.5 ? 'L' : 'E';
        } else if (charRarity === 'L') {
            targetRarity = roll < 0.3 ? 'L' : roll < 0.8 ? 'E' : 'R';
        } else if (charRarity === 'E') {
            targetRarity = roll < 0.4 ? 'E' : 'R';
        } else if (charRarity === 'R') {
            targetRarity = roll < 0.3 ? 'R' : 'C';
        } else {
            targetRarity = 'C';
        }

        const pool = Object.values(equipmentItems).filter(e => e.rarity === targetRarity);
        if (pool.length === 0) return null;

        return pool[Math.floor(Math.random() * pool.length)];
    }
}
