
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
        const cost = n * 100;
        if (this.coins < cost) return null;

        this.saveCoinBalance(this.coins - cost);

        const results = [];
        for (let i = 0; i < n; i++) {
            // Determine if this roll is Character or Equipment
            // 50% chance for each, unless pity forces a character
            let isCharacter = Math.random() < 0.5;

            // Check pity - if pity is hit, FORCE character
            if (this.pity.sinceM >= 99 || this.pity.sinceL >= 29) {
                isCharacter = true;
            }

            if (isCharacter) {
                let r = this.rollRarity();

                // Pity check
                if (this.pity.sinceM >= 99) {
                    r = 'M';
                } else if (this.pity.sinceL >= 29) {
                    // L pity: 16.7% chance for M (1/6), otherwise L
                    r = (Math.random() < 0.167) ? 'M' : 'L';
                }

                const ch = this.rollCharByRar(r);
                const status = this.addToCollection(ch.key);

                // Update pity counters
                if (r === 'M') {
                    this.pity.sinceM = 0;
                    this.pity.sinceL = 0;
                } else if (r === 'L') {
                    this.pity.sinceL = 0;
                    this.pity.sinceM++;
                } else {
                    this.pity.sinceL++;
                    this.pity.sinceM++;
                }

                results.push({ type: 'char', char: ch, ...status });
            } else {
                // Equipment Roll
                // Equipment rarity is independent of character pity
                const r = this.rollRarity(); // Use same rarity distribution for equipment
                const equipment = this.rollEquipment(r);

                if (equipment) {
                    const isNewEquip = this.progression.addEquipmentToInventory(equipment.id);
                    results.push({ type: 'equip', item: equipment, isNew: isNewEquip, rar: r });
                } else {
                    // Fallback to low rarity equipment if something goes wrong, or just give coins?
                    // For now, let's just force a Common equipment if null (shouldn't happen with correct data)
                    const fallback = this.rollEquipment('C');
                    if (fallback) {
                        const isNewEquip = this.progression.addEquipmentToInventory(fallback.id);
                        results.push({ type: 'equip', item: fallback, isNew: isNewEquip, rar: 'C' });
                    }
                }

                // Equipment rolls do NOT reset character pity, but they DO increment it?
                // Usually gacha pity is only for characters. Let's say equipment pulls don't affect character pity.
                // OR, maybe they count towards "pulls since last M"?
                // User didn't specify. Let's be generous and say they DON'T reset, but they DON'T increment either?
                // Or maybe they increment? Let's increment to be nice.
                this.pity.sinceL++;
                this.pity.sinceM++;
            }
        }

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

            // Perform Limit Break (Level Cap Increase)
            limitBreakPerformed = this.progression.limitBreak(key);
            isLimitBreak = limitBreakPerformed;

            // NO XP on duplicate (as requested), but Limit Break is allowed
            logger.info('Duplicate character obtained - Limit Break attempted', {
                key,
                dup: this.collection.owned[key].dup,
                limitBreakPerformed
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
    rollEquipment(rarity) {
        // Match equipment rarity to requested rarity
        // If exact rarity not found, try one lower
        let pool = Object.values(equipmentItems).filter(e => e.rarity === rarity);

        if (pool.length === 0) {
            // Fallback logic
            if (rarity === 'M') pool = Object.values(equipmentItems).filter(e => e.rarity === 'L');
            else if (rarity === 'L') pool = Object.values(equipmentItems).filter(e => e.rarity === 'E');
            else if (rarity === 'E') pool = Object.values(equipmentItems).filter(e => e.rarity === 'R');
            else pool = Object.values(equipmentItems).filter(e => e.rarity === 'C');
        }

        if (pool.length === 0) return null;
        return pool[Math.floor(Math.random() * pool.length)];
    }
}
